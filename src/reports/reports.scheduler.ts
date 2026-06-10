import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import * as moment from 'moment';
import { ReportsService } from './reports.service';

@Injectable()
export class ReportsScheduler {
  private readonly logger = new Logger(ReportsScheduler.name);

  constructor(private readonly reportsService: ReportsService) {}

@Cron('0 11 * * 1', { timeZone: 'Asia/Dubai' }) // Run 11 AM Dubai time every Monday
  async handleOverallRatingReport() {
    this.logger.log('⏰ Running Overall Rating Report cron...');
    try {
     const overallRatingDto = {
  start_date: moment().subtract(1, 'weeks').startOf('isoWeek').format('YYYY-MM-DD'), // Last Monday
  end_date: moment().subtract(1, 'weeks').endOf('isoWeek').subtract(1, 'days').format('YYYY-MM-DD'), // Last Saturday
};
      await this.reportsService.overallRatingReportForScheduler(overallRatingDto.start_date,overallRatingDto.end_date);
      this.logger.log('✅ Overall Rating Report cron completed.');
    } catch (error) {
      this.logger.error('❌ Overall Rating Report cron failed.', error);
    }
  }
}
