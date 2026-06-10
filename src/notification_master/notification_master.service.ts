import { Injectable } from '@nestjs/common';
import { CreateNotificationMasterDto } from './dto/create-notification_master.dto';
import { UpdateNotificationMasterDto } from './dto/update-notification_master.dto';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import * as AWS from 'aws-sdk';
import { NotificationHistoryDocument } from 'src/notification_history/schemas/notification_history.schema';
import { NotificationMasterDocument } from './schemas/notification_master.schemas';
import { FilterNotificationMasterDto } from './dto/filter.dto';

@Injectable()
export class NotificationMasterService {
  constructor(
    @InjectModel('Notification_Histories')
    private readonly notificationHistoryModel: Model<NotificationHistoryDocument>,
    @InjectModel('Notification_Masters')
    private readonly notificationMasterModel: Model<NotificationMasterDocument>,
  ) { }
  async create(createNotificationMasterDto: CreateNotificationMasterDto) {
    const createdNotification = new this.notificationMasterModel(
      createNotificationMasterDto,
    );
    return createdNotification.save();
  }

  // Find all notifications with pagination and filtering
  async findAll(
    filter: FilterNotificationMasterDto,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;
    const query: any = {};

    if (filter.type_of_notification) {
      query.type_of_notification = {
        $regex: filter.type_of_notification,
        $options: 'i',
      };
    }
    if (filter.title) {
      query.title = { $regex: filter.title, $options: 'i' };
    }
    if (filter.is_sms !== undefined) {
      query.is_sms = filter.is_sms;
    }
    if (filter.is_whatsapp !== undefined) {
      query.is_whatsapp = filter.is_whatsapp;
    }
    if (filter.is_email !== undefined) {
      query.is_email = filter.is_email;
    }
    if (filter.is_slack !== undefined) {
      query.is_slack = filter.is_slack;
    }
    if (filter.is_push_notification !== undefined) {
      query.is_push_notification = filter.is_push_notification;
    }

    // Add other filters similarly
    const [results, totalCount] = await Promise.all([
      this.notificationMasterModel.find(query).skip(skip).limit(limit).exec(),
      this.notificationMasterModel.countDocuments(query).exec(),
    ]);

    return {
      results,
      totalCount,
      pageCount: Math.ceil(totalCount / limit),
      currentPage: +page,
    };
  }

  // Find one notification by ID
  async findOne(id: string) {
    return await this.notificationMasterModel.findById(id).exec();
  }

  // Update a notification by ID
  async update(
    id: string,
    updateNotificationMasterDto: UpdateNotificationMasterDto,
  ) {
    return await this.notificationMasterModel
      .findByIdAndUpdate(id, updateNotificationMasterDto, { new: true })
      .exec();
  }

  // Delete a notification by ID
  async remove(id: string): Promise<any> {
    return await this.notificationMasterModel.findByIdAndDelete(id).exec();
  }

  private getAwsConfigOptions() {
    const accessKeyId =
      process.env.ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const sessionToken = process.env.AWS_SESSION_TOKEN;
    const region = process.env.REGION || process.env.AWS_REGION;

    return {
      ...(accessKeyId ? { accessKeyId } : {}),
      ...(secretAccessKey ? { secretAccessKey } : {}),
      ...(sessionToken ? { sessionToken } : {}),
      ...(region ? { region } : {}),
    };
  }

  sendMessage = async (message) => {
    const queueUrl = process.env.QUEUE_URL;

    AWS.config.update(this.getAwsConfigOptions());
    // console.log(`message--------->`)
    // console.log(message)
    // console.log("process.env.LOAD_TEST", process.env.LOAD_TEST, typeof process.env.LOAD_TEST, process.env.LOAD_TEST == 'true')

    if (!(process.env.LOAD_TEST == 'true')) {
      const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
      const notificationData =
        await this.notificationHistoryModel.create(message);
      // console.log("notificationData", notificationData)
      const params = {
        MessageBody: JSON.stringify({ ...message, ...notificationData }),
        QueueUrl: queueUrl,
      };

      console.log('params', params);
      sqs.sendMessage(params, async function (err, data) {
        if (err) {
          console.log('Error', err);
        } else {
          console.log('Success', data.MessageId);
        }
      });
    }
  };

  private getResolvedNotificationType(message: {
    channel: string;
    notificationPayload: any;
  }): string {
    return message.channel == 'report_email'
      ? message.notificationPayload.report_type
      : message.channel;
  }

  private async ensureNotificationMasterConfig(message: {
    channel: string;
    notificationPayload: any;
  }) {
    const notificationType = this.getResolvedNotificationType(message);
    const notificationMasterData = await this.notificationMasterModel.findOne({
      type_of_notification: notificationType,
    });

    return notificationMasterData;
  }

  notificationCreate = async (message: {
    channel: string;
    notificationPayload: any;
  }) => {
    try {
      // Find the notification master data based on the type of notification
      const notificationMasterData =
        await this.ensureNotificationMasterConfig(message);

      if (!notificationMasterData) {
        throw new Error(
          `Notification master data not found for channel: ${message.channel}`,
        );
      }

      // Prepare the common payload data
      const customerData = message.notificationPayload;
      const orderIdRaw = customerData?.order_id;
      const orderId =
        orderIdRaw && mongoose.Types.ObjectId.isValid(String(orderIdRaw))
          ? new mongoose.Types.ObjectId(String(orderIdRaw))
          : null;
      const commonPayload = {
        customer_id: new mongoose.Types.ObjectId(
          String(customerData?.customer_id),
        ),
        phone_number: customerData?.phone_number || null,
        email: customerData?.email || null,
        order_id: orderId,
        subscription_id: customerData?.subscription_id || null,
        date: new Date(),
        notification_id: new mongoose.Types.ObjectId(
          notificationMasterData._id,
        ),
        type_of_notification_master:
          notificationMasterData.type_of_notification,
        notification_title: notificationMasterData.title,
      };

      // Define an array to hold all promises for creating notifications
      const notificationPromises = [];

      // Define an object to hold the response data
      const data: { [key: string]: string } = {};

      // Create notification history for each type of notification enabled
      if (notificationMasterData.is_sms) {
        notificationPromises.push(
          this.createNotificationRecord({
            ...commonPayload,
            notification_type: 'SMS',
          }).then((response) => {
            data.sms_messageId = response.id;
          }),
        );
      }
      if (notificationMasterData.is_whatsapp) {
        notificationPromises.push(
          this.createNotificationRecord({
            ...commonPayload,
            notification_type: 'Whatsapp',
          }).then((response) => {
            data.whatsapp_messageId = response.id;
          }),
        );
      }
      if (notificationMasterData.is_email) {
        notificationPromises.push(
          this.createNotificationRecord({
            ...commonPayload,
            notification_type: 'Email',
          }).then((response) => {
            data.email_messageId = response.id;
          }),
        );
      }
      if (notificationMasterData.is_slack) {
        notificationPromises.push(
          this.createNotificationRecord({
            ...commonPayload,
            notification_type: 'Slack',
          }).then((response) => {
            data.slack_messageId = response.id;
          }),
        );
      }
      if (notificationMasterData.is_push_notification) {
        notificationPromises.push(
          this.createNotificationRecord({
            ...commonPayload,
            notification_type: 'Push_Notification',
          }).then((response) => {
            data.push_messageId = response.id;
          }),
        );
      }

      // Wait for all notification records to be created
      await Promise.all(notificationPromises);

      console.log('data', data);

      // Return the response data if any notifications were created
      return Object.keys(data).length !== 0 ? data : false;
    } catch (error) {
      console.error('error', error);
      throw new Error('Failed to create notifications');
    }
  };

  // Helper function to create a notification record and return the created document
  private createNotificationRecord = async (payload: any) => {
    try {
      const notificationRecord =
        await this.notificationHistoryModel.create(payload);
      return notificationRecord;
    } catch (error) {
      console.error('Error creating notification record', error);
      throw error;
    }
  };

  sendMessageLambda = async (message: any) => {
    try {
      const queueUrl = process.env.LAMBDA_QUEUE_URL;
      // const curruntRegion =
      //   message.type == 'modify_user' || 'new_user'
      //     ? 'me-central-1'
      //     : process.env.REGION;
      // console.log({ message, customer: message.customer, curruntRegion });
      AWS.config.update(this.getAwsConfigOptions());
      // console.log(`message--------->`)
      // console.log(message)

      const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

      const params = {
        MessageBody: JSON.stringify(message),
        QueueUrl: queueUrl,
      };

      sqs.sendMessage(params, function (err, data) {
        console.log({ data }, '----lambdadata');
        if (err) {
          console.log('Error', err);
        } else {
          console.log('Success', data.MessageId);
        }
      });
    } catch (err) {
      console.log(err);
    }
  };

  async sendNotificationMessage(payload: any) {
    const queueUrl = process.env.QUEUE_URL; // Ensure this is set to your SQS queue URL
    AWS.config.update(this.getAwsConfigOptions());
    const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

    if (!queueUrl) {
      throw new Error('SQS_QUEUE_URL environment variable is not set');
    }

    try {
      // Create notification record for the single message
      const notificationData = await this.notificationCreate(payload);

      // Prepare the single message
      const params = {
        MessageBody: JSON.stringify({
          ...payload,
          ...notificationData,
        }),
        QueueUrl: queueUrl,
      };

      // console.log('Single message params:', params);

      // Send the single message
      const data = await sqs.sendMessage(params).promise();
      console.log('Single message success:', data.MessageId);

      return {
        success: true,
        messageId: data.MessageId,
        notificationData: notificationData,
      };
    } catch (err) {
      console.log('Error sending single message:', err);
      throw err;
    }
  }

  async sendNotificationMessageBatch(payloads: any) {
    const queueUrl = process.env.QUEUE_URL; // Ensure this is set to your SQS queue URL
    AWS.config.update(this.getAwsConfigOptions());
    const sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

    if (!queueUrl) {
      throw new Error('SQS_QUEUE_URL environment variable is not set');
    }

    // Prepare the batch request entries
    const entries = await Promise.all(
      payloads.customers.map(async (payload: any, index: any) => ({
        Id: `msg-${index}`, // Unique ID for each message within the batch
        MessageBody: JSON.stringify({
          ...payload,
          ...(await this.notificationCreate(payload)),
        }), // Convert payload to string
        DelaySeconds: index * 2,
      })),
    );
    const params = {
      Entries: entries,
      QueueUrl: queueUrl,
    };
    console.log(params);

    // Send the batch of messages
    try {
      const data = await sqs.sendMessageBatch(params).promise();
      console.log(
        'Batch success',
        data.Successful.map((msg) => msg.MessageId),
      );
      if (data.Failed.length > 0) {
        console.log('Failed messages', data.Failed);
      }
    } catch (err) {
      console.log('Error sending batch', err);
    }
  }
}
