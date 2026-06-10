import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdminHistoryDocument } from './Schema/adminHistory';
import { CustomerDocument } from 'src/customer/schemas/customer.schema';
import { GetAdminHistoryDto } from './dto/create-admin-history.dto';
import * as moment from 'moment';
@Injectable()
export class AdminHistoryService {
  constructor(
    @InjectModel('admin_history')
    private readonly adminHistoryModel: Model<AdminHistoryDocument>,
    @InjectModel('Customers')
    private readonly customerModel: Model<CustomerDocument>,
  ) {}
  async createAdminHistory(
    type = 'Anonymous',
    user,
    customer_id,
    beforeChange = {},
    afterChange = {},
    changeDetails: any = {},
  ) {
    try {
      console.log('customer -id', customer_id);
      const customerDetails = await this.customerModel
        .findById(customer_id)
        .select(
          'first_name last_name email phone_number country_code, whatsapp_country_code, whatsapp_number',
        );
      console.log('customerDetails==>', customerDetails);
      const changeDetailsFinal = {
        ...changeDetails,
        customer_id: customerDetails?._id?.toString() || '',
        customer_name:
          customerDetails?.first_name + ' ' + customerDetails?.last_name || '',
      };

      const data = await this.adminHistoryModel.create({
        platform: 'rms',
        before_change: beforeChange,
        after_change: afterChange,
        changed_by: {
          name: changeDetails?.login_details ? 'LOGIN_ATTEMPTED' : user?.name,
          email: user?.email || '',
        },
        change_details: changeDetails?.login_details
          ? changeDetails
          : changeDetailsFinal,
        type: type,
      });

      console.log(data, '------data');
      return 'Admin History Created!';
    } catch (err) {
      return err;
    }
  }

  async getHistory(dto: GetAdminHistoryDto) {
    try {
      const { startDate, endDate, platform, search, page, limit } = dto;

      let query: any = {
        createdAt: {
          $gte: moment(startDate).startOf('day').toDate(),
          $lte: moment(endDate).endOf('day').toDate(),
        },
      };

      if (platform) {
        query.platform = platform;
      }
      if (search) {
        query = {
          ...query,
          $or: [
            {
              'change_details.customer_name': { $regex: search, $options: 'i' },
            },
            { 'change_details.email': { $regex: search, $options: 'i' } },
            {
              'change_details.phone_number': { $regex: search, $options: 'i' },
            },
            {
              'change_details.whatsapp_number': {
                $regex: search,
                $options: 'i',
              },
            },
            { 'changed_by.name': { $regex: search, $options: 'i' } },
            { 'changed_by.email': { $regex: search, $options: 'i' } },
            { type: { $regex: search, $options: 'i' } },
          ],
        };
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const [data, count] = await Promise.all([
        this.adminHistoryModel
          .find(query)
          .sort('-createdAt')
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        this.adminHistoryModel.countDocuments(query),
      ]);
      let totalPages = 0;
      if (+limit > 0) {
        totalPages = Math.ceil(count / +limit);
      }
      return {
        list: data,
        count,
        currentPage: +page || 1,
        totalPages,
      };
    } catch (error) {
      console.log(error);
    }
  }
}
