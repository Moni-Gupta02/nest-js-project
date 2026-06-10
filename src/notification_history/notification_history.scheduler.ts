import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as AWS from 'aws-sdk';
import * as moment from 'moment-timezone';
import { NotificationHistoryDocument } from './schemas/notification_history.schema';

/**
 * Notification History Archival Scheduler
 *
 * Runs every night at 1:00 AM Dubai time (Asia/Dubai = UTC+4).
 * Cron in UTC → 21:00 UTC = 01:00 Dubai time.
 *
 * At each run it:
 *  1. Calculates the "archive window": records whose createdAt falls in
 *     the 7-day period that ended exactly 2 months ago.
 *     e.g. if today is 2026-03-12:
 *       windowEnd   = 2026-01-12 01:00 Dubai (2 months ago)
 *       windowStart = 2026-01-05 01:00 Dubai (windowEnd - 7 days)
 *  2. Fetches all Notification_Histories in that window.
 *  3. Serialises them to JSON and uploads to S3 as:
 *       <LOGGER_BUCKET_FOLDER_NAME>/notification-history-archive/<YYYY-MM-DD>_<windowStart>_to_<windowEnd>.json
 */
@Injectable()
export class NotificationHistorySchedulerService {
  private readonly logger = new Logger(
    NotificationHistorySchedulerService.name,
  );
  private readonly s3: AWS.S3;
  private readonly BUCKET_NAME = process.env.LOGGER_BUCKET_NAME;
  private readonly LOGGER_BUCKET_FOLDER_NAME =
    process.env.LOGGER_BUCKET_FOLDER_NAME;
  private readonly DUBAI_TZ = 'Asia/Dubai';

  constructor(
    @InjectModel('Notification_Histories')
    private readonly notificationModel: Model<NotificationHistoryDocument>,
  ) {
    AWS.config.update({
      accessKeyId: process.env.BUCKET_ACCESS_KEY_ID,
      secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY,
      region: process.env.BUCKET_REGION,
    });
    this.s3 = new AWS.S3();
  }

  /**
   * Cron: "0 21 * * *"
   * Fires at 21:00 UTC every day = 01:00 AM Asia/Dubai (UTC+4).
   */
  @Cron('0 21 * * *', {
    name: 'notification-history-archival',
    timeZone: 'UTC',
  })
  async archiveNotificationHistory(): Promise<void> {
    this.logger.log('🕐 [Scheduler] Notification history archival job started');

    try {
      // ------------------------------------------------------------------
      // 1. Build archive window (in Dubai time, converted to UTC for query)
      // ------------------------------------------------------------------
      const nowDubai = moment().tz(this.DUBAI_TZ);

      // windowEnd   = exactly 2 months ago (at the moment the job runs)
      const windowEnd = nowDubai.clone().subtract(2, 'months');

      // windowStart = 7 days before windowEnd
      const windowStart = windowEnd.clone().subtract(7, 'days');

      this.logger.log(
        `📅 Archive window: ${windowStart.format()} → ${windowEnd.format()} (Dubai time)`,
      );

      // ------------------------------------------------------------------
      // 2. Query MongoDB
      // ------------------------------------------------------------------
      const records = await this.notificationModel
        .find({
          createdAt: {
            $gte: windowStart.toDate(),
            $lte: windowEnd.toDate(),
          },
        })
        .lean()
        .exec();

      if (!records.length) {
        this.logger.warn(
          '⚠️  No notification history records found in the archive window. Skipping upload.',
        );
        return;
      }

      this.logger.log(
        `📦 Found ${records.length} records to archive. Preparing S3 upload…`,
      );

      // ------------------------------------------------------------------
      // 3. Group records by their createdAt date (Dubai timezone)
      //    Each date gets its own S3 file and folder.
      //    Structure: <LOGGER_BUCKET_FOLDER_NAME>/notification-history/<YYYY>/<MMMM>/<DD-MM-YYYY>/notification_history_<DD-MM-YYYY_HH-mm-ss>.json
      // ------------------------------------------------------------------
      const groupedByDate = new Map<string, typeof records>();

      for (const record of records) {
        // Use the record's own createdAt date in Dubai TZ as the grouping key
        const recordDate = moment((record as any).createdAt)
          .tz(this.DUBAI_TZ)
          .format('DD-MM-YYYY');

        if (!groupedByDate.has(recordDate)) {
          groupedByDate.set(recordDate, []);
        }
        groupedByDate.get(recordDate).push(record);
      }

      this.logger.log(
        `📂 Grouped into ${groupedByDate.size} date bucket(s): ${[...groupedByDate.keys()].join(', ')}`,
      );

      // ------------------------------------------------------------------
      // 4. Upload one file per date to S3
      // ------------------------------------------------------------------
      const jobTimestamp = moment()
        .tz(this.DUBAI_TZ)
        .format('DD-MM-YYYY_HH-mm-ss');
      const uploadedDates: string[] = [];

      for (const [dateKey, dateRecords] of groupedByDate.entries()) {
        // Parse the date key back to build folder segments
        const dateMoment = moment(dateKey, 'DD-MM-YYYY').tz(this.DUBAI_TZ);
        const year = dateMoment.format('YYYY'); // 2025
        const monthName = dateMoment.format('MMMM'); // November
        const dateFolder = dateKey; // 10-11-2025

        // File name = job run timestamp so multiple runs on the same date don't overwrite
        const fileName = `notification_history_${jobTimestamp}.json`;
        const s3Key = `${this.LOGGER_BUCKET_FOLDER_NAME}/${year}/${monthName}/${dateFolder}/${fileName}`;

        const jsonBody = JSON.stringify(
          {
            exportedAt: moment().tz(this.DUBAI_TZ).toISOString(),
            date: dateKey,
            archiveWindowStart: windowStart.toISOString(),
            archiveWindowEnd: windowEnd.toISOString(),
            totalRecords: dateRecords.length,
            data: dateRecords,
          },
          null,
          2,
        );

        const uploadParams: AWS.S3.PutObjectRequest = {
          Bucket: this.BUCKET_NAME,
          Key: s3Key,
          Body: Buffer.from(jsonBody, 'utf-8'),
          ContentType: 'application/json',
          ACL: 'bucket-owner-full-control',
        };

        const uploadResult = await this.s3.upload(uploadParams).promise();

        this.logger.log(
          `✅ [${dateKey}] Uploaded ${dateRecords.length} records → ${uploadResult.Location}`,
        );

        uploadedDates.push(dateKey);
      }

      // ------------------------------------------------------------------
      // 5. Delete archived records from MongoDB ONLY after all uploads succeed
      // ------------------------------------------------------------------
      const deleteResult = await this.notificationModel.deleteMany({
        createdAt: {
          $gte: windowStart.toDate(),
          $lte: windowEnd.toDate(),
        },
      });

      this.logger.log(
        `🗑️  Deleted ${deleteResult.deletedCount} archived records from MongoDB (${uploadedDates.length} date(s) archived)`,
      );
    } catch (error) {
      this.logger.error(
        '❌ [Scheduler] Notification history archival job failed',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
