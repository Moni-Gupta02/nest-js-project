import { BadRequestException, Injectable } from '@nestjs/common';
import { CreatePickUpOrderDto } from './dto/pickup-order.dto';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { OwnDelivery } from './schemas/own-delivery.schema';
import { Sequence } from './schemas/sequence.schema';
import { TaskManagement } from './schemas/task-management.schema';
import { AWBDocument } from './schemas/awb.schema';
import * as moment from 'moment';
import { OrderDocument } from 'src/order/schemas/order.schema';
import { minimum11AmCutoff } from 'src/common/utils/helper';
@Injectable()
export class PickupOrdersService {
  constructor(
    @InjectModel('awbs') private readonly awbModel: Model<AWBDocument>,
    @InjectModel('task_managements')
    private readonly taskManagementModel: Model<TaskManagement>,
    @InjectModel('sequences') private readonly sequenceModel: Model<Sequence>,
    @InjectModel('own_deliveries')
    private readonly ownDeliveryModel: Model<OwnDelivery>,
    @InjectModel('Orders')
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async createPickUpOrder(payload: CreatePickUpOrderDto) {
    const minAccessibleDate = minimum11AmCutoff();
    // Parse the requested date from payload and ensure it meets the minimum requirement
    const requestedDate = moment
      .tz(moment(payload.date).format('L'), 'Asia/Dubai')
      .startOf('day');

    if (requestedDate.isBefore(minAccessibleDate)) {
      throw new BadRequestException(
        `Pick-up orders cannot be scheduled earlier than ${minAccessibleDate.format('YYYY-MM-DD')}.`,
      );
    }

    // Fetch the latest order for the given customer
    const orderDetails = await this.orderModel
      .findOne({
        customer_id: new mongoose.Types.ObjectId(payload.customer_id),
        order_type: 'subscription',
        financial_status: 'Paid',
      })
      .select('_id order_number subscription_id customer_id')
      .sort({ createdAt: -1 })
      .lean();

    if (!orderDetails) {
      throw new BadRequestException(
        'No valid subscription order found for this customer.',
      );
    }

    // Construct the AWB number
    const awbNumber = `DLC-P${orderDetails.order_number}-${moment(payload.date).format('DDMMYY')}-${payload.no_of_bag_to_pick}`;

    // Check if AWB already exists
    const existingAWB = await this.awbModel.findOne({ awb: awbNumber });
    if (existingAWB) {
      throw new BadRequestException('AWB already exists.');
    }

    // Determine the time slot for the pick-up
    let afterTime = '';
    let beforeTime = '';
    switch (payload.slot) {
      case 'Before 7:30AM':
      case '3AM - 7:30AM':
      case '3AM - 6AM':
        afterTime = '03:00';
        beforeTime = '06:00';
        break;

      case '6AM - 9AM':
        afterTime = '06:00';
        beforeTime = '09:00';
        break;

      case '9AM - 12PM':
        afterTime = '09:00';
        beforeTime = '12:00';
        break;

      case '9AM - 1PM':
        afterTime = '09:00';
        beforeTime = '13:00';
        break;

      case '8AM - 6PM':
        afterTime = '08:00';
        beforeTime = '18:00';
        break;

      case '9AM - 10PM':
        afterTime = '09:00';
        beforeTime = '22:00';
        break;

      case '9AM - 6PM':
        afterTime = '09:00';
        beforeTime = '18:00';
        break;

      case '2PM - 6PM':
        afterTime = '14:00';
        beforeTime = '18:00';
        break;

      case '2PM - 10PM':
        afterTime = '14:00';
        beforeTime = '22:00';
        break;

      case '6PM - 10PM':
        afterTime = '18:00';
        beforeTime = '22:00';
        break;

      case '12PM - 3PM':
        afterTime = '12:00';
        beforeTime = '15:00';
        break;

      case '3PM - 7PM':
        afterTime = '15:00';
        beforeTime = '19:00';
        break;

      case '7PM - 11PM':
        afterTime = '19:00';
        beforeTime = '23:00';
        break;

      default:
        // Optional: Handle undefined slots or unexpected values here
        break;
    }

    // Check vendor availability
    let vendor = 'transcorp';
    const ownDeliveryData = await this.ownDeliveryModel.findOne({
      city: payload.city,
      'area.name': payload.area,
    });
    if (ownDeliveryData) {
      const area = ownDeliveryData.area.find((a) => a.name === payload.area);
      if (area) {
        const slotExists = area.slot_list.some(
          (slot) =>
            slot.before_time === beforeTime && slot.after_time === afterTime,
        );
        if (slotExists) {
          vendor = 'own';
        }
      }
    }

    // Create the AWB record
    if (payload.no_of_bag_to_pick > 0) {
      await this.awbModel.create({
        awb: awbNumber,
        type: 'bag_pick',
        transcorp_date: moment(payload.date).startOf('day').toDate(),
        refund_bag_details: {
          awb: awbNumber,
          delivery_date: moment(payload.date).startOf('day').toISOString(),
          order_number: orderDetails?.order_number?.toString() || '',
          customer_name: payload.customer_name,
          customer_mobile: payload.customer_mobile,
          customer_id: orderDetails.customer_id?.toString(),
          order_id: orderDetails._id?.toString(),
          delivery_id: null,
          address: payload.address,
          city: payload.city,
          area: payload.area,
          slot: payload.slot,
          country: payload.country,
          cod_amount: '',
          mode_of_payment: '',
          internal_code: 'Pick',
          no_of_package: payload.no_of_bag_to_pick,
          package1: 1,
          instruction: [],
          package_details:
            payload?.no_of_bag_to_pick +
            (payload.no_of_bag_to_pick > 1 ? 'BAGS' : 'BAG'),
          delivery_notes: 'PICK UP BAGS LEFT OUTSIDE',
          after_time: afterTime,
          before_time: beforeTime,
          volume: '',
          weight: '',
          sms: 'TRUE',
          delivery_type: 'Next Day',
          vendor,
          active: true,
          status: 'UNASSIGNED',
          type: 'bag_pick',
          bag_opted: 'Yes',
          customerDetails: [
            {
              customer_id: orderDetails?.customer_id,
              customer_name: payload.customer_name,
              delivery_id: null,
              order_id: orderDetails?._id,
              bag_opted: true,
            },
          ],
        },
        is_finalized: true,
        active: true,
        vendor,
        status: 'UNASSIGNED',
      });
    }

    // Update task sequence
    // const sequenceDoc = await this.sequenceModel.findOneAndUpdate(
    //   { sequence_name: 'task_sequence' },
    //   { $inc: { sequence_value: 1 } },
    //   { new: true, upsert: true },
    // );

    // // Create a task for the pickup
    // await this.taskManagementModel.create({
    //   task_number: sequenceDoc.sequence_value,
    //   date: moment(payload.date).add(1, 'day').toDate(),
    //   order_number: orderDetails.order_number,
    //   order_id: orderDetails._id,
    //   customer_id: payload.customer_id,
    //   customer_name: payload.customer_name,
    //   task_type: 'Deposit Refund',
    //   amount: 100,
    //   action: 'Initiate Refund',
    //   task_role: 'SUPPORT',
    // });

    return { message: 'Pick-up order created successfully', awb: awbNumber };
  }
}
