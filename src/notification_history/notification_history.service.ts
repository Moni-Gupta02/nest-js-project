import { Injectable, NotFoundException } from '@nestjs/common';
import { FilterNotificationHistoryDto } from './dto/notification_history.dto';
import { Model } from 'mongoose';
import { NotificationHistoryDocument } from './schemas/notification_history.schema';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';

@Injectable()
export class NotificationHistoryService {
  constructor(
    @InjectModel('Notification_Histories')
    private model: Model<NotificationHistoryDocument>,
  ) {}
  async getAll(
    filterDto: FilterNotificationHistoryDto,
    page: number = 1,
    limit: number = 10,
  ) {
    const parsedLimit = parseInt(limit as any, 10) || 10;
    const parsedOffset = parseInt((page - 1) as any, 10) || 0;
    console.log({ filterDto, parsedLimit, parsedOffset });
    const data = await this.model
      .find(filterDto)
      .sort({ createdAt: -1 })
      .skip(parsedOffset)
      .limit(parsedLimit)
      .exec();

    const total = await this.model.countDocuments(filterDto);

    return {
      list: data,
      count: total,
      currentPage: +page,
      totalPages: Math.ceil(total / Number(limit)),
    };
  }

  async getById(id: string) {
    const notification = await this.model.findById(id).exec();
    if (!notification) {
      throw new NotFoundException(
        `Notification history with ID ${id} not found`,
      );
    }
    return notification;
  }

  async delete(id: string) {
    const result = await this.model.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(
        `Notification history with ID ${id} not found`,
      );
    }
    return { message: 'Notification history deleted successfully' };
  }
  async getNotificationHistory(customerId: string) {
    try {
      // Fetch notifications for the customer
      const notificationData = await this.model
        .find({ customer_id: new mongoose.Types.ObjectId(customerId) })
        .limit(20)
        .sort('-createdAt')
        .lean();

      console.log(notificationData, '--notificationData');
      // Group notifications by type
      const groupedNotifications = {
        whatsapp: [],
        sms: [],
        email: [],
      };

      notificationData.forEach((notification) => {
        switch (notification.notification_type) {
          case 'SMS':
            groupedNotifications.sms.push(notification);
            break;
          case 'Whatsapp':
            groupedNotifications.whatsapp.push(notification);
            break;
          case 'Email':
            groupedNotifications.email.push(notification);

            break;
          default:
            break;
        }
      });

      return groupedNotifications;
    } catch (error) {
      console.error('Error fetching notification history:', error);
      throw new Error('Unable to fetch notification history');
    }
  }
}
