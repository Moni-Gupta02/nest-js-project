import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateAddressDto } from './dto/create-address.dto';
import {
  CustomerAddressDeleteDto,
  UpdateAddressDto,
} from './dto/update-address.dto';
import { Address, AddressDocument } from './schemas/address.schema';
import { FindAllAddressesDto } from './dto/filter-address.dto';
import mongoose from 'mongoose';
import { SubscriptionDocument } from 'src/subscription/schemas/subscription.schema';
import { DeliveryDocument } from 'src/delivery/schemas/delivery.schema';
import { OrderDocument } from 'src/order/schemas/order.schema';
import * as moment from 'moment';
import { HistoryService } from 'src/history/history.service';
import { minimum11AmCutoff } from 'src/common/utils/helper';
import { AWBDocument } from 'src/pickup-orders/schemas/awb.schema';
@Injectable()
export class AddressService {
  constructor(
    @InjectModel('Addresses')
    private readonly addressModel: Model<AddressDocument>,
    @InjectModel('subscriptions')
    private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel('awbs')
    private readonly awbModel: Model<AWBDocument>,
    @InjectModel('Deliveries') private deliveryModel: Model<DeliveryDocument>,
    @InjectModel('Orders') private readonly orderModel: Model<OrderDocument>,
    private readonly historyService: HistoryService,
  ) {}

  async create(createAddressDto: CreateAddressDto): Promise<Address> {
    try {
      const addressData = {
        ...createAddressDto,
        customer_id: new mongoose.Types.ObjectId(createAddressDto.customer_id),
      };

      return await this.addressModel.create(addressData);
    } catch (error) {
      throw new Error(`Failed to create address: ${error.message}`);
    }
  }

  async findAll(filterDto: FindAllAddressesDto): Promise<{
    list: Address[];
    count: number;
    currentPage: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 10, address_type, city } = filterDto;
      // Create the query object dynamically based on the provided filters
      const query: any = {};
      if (address_type) query.address_type = address_type;
      if (city) query.city = city;

      // Get the total count for pagination
      const total = await this.addressModel.countDocuments(query);

      // Fetch the filtered and paginated results
      const data = await this.addressModel
        .find(query)
        .skip((+page - 1) * limit)
        .limit(+limit)
        .exec();

      return {
        list: data,
        count: total,
        currentPage: +page,
        totalPages: Math.ceil(total / limit) || 0,
      };
    } catch (error) {
      throw new Error(`Failed to retrieve addresses: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<Address> {
    try {
      const address = await this.addressModel.findById(id).exec();
      if (!address) {
        throw new NotFoundException(`Address with id ${id} not found`);
      }
      return address;
    } catch (error) {
      throw new Error(`Failed to retrieve address: ${error.message}`);
    }
  }

  async update(id: string, updateAddressDto: UpdateAddressDto): Promise<any> {
    try {
      if (!updateAddressDto.customer_id) {
        throw new NotFoundException(`Customer Id not found`);
      }
      const addressData: any = {
        ...updateAddressDto,
        customer_id: new mongoose.Types.ObjectId(updateAddressDto.customer_id),
      };
      const updatedAddress = await this.addressModel
        .findByIdAndUpdate(id, addressData, { new: false })
        .exec();
      if (!updatedAddress) {
        throw new NotFoundException(`Address with id ${id} not found`);
      }
      console.log({ updatedAddress });
      const { before_changes, current_changes } =
        await this.historyService.getChangedFields(
          updatedAddress,
          updateAddressDto,
        );
      return { before_changes, current_changes };
    } catch (error) {
      throw new Error(`Failed to update address: ${error.message}`);
    }
  }

  async remove(id: string): Promise<any> {
    try {
      const result = await this.addressModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new NotFoundException(`Address with id ${id} not found`);
      }
      return result;
    } catch (error) {
      throw new Error(`Failed to delete address: ${error.message}`);
    }
  }
  async findCustomerAddress(customerId: string) {
    try {
      // Fetch the filtered and paginated results
      const data = await this.addressModel
        .find({ customer_id: new mongoose.Types.ObjectId(customerId) })
        .exec();

      return data;
    } catch (error) {
      throw new Error(`Failed to retrieve addresses: ${error.message}`);
    }
  }

  async customerAddressDeleteAndReplace(
    body: CustomerAddressDeleteDto,
  ): Promise<any> {
    const { old_address_id, new_address_id, slot, customer_id } = body;
    const historyChange = {
      before_changes: {},
      after_changes: {},
    };

    // Calculate the effective date based on current time
    const dateVary = minimum11AmCutoff();

    // Check if the customer has more than one address
    const addressData = await this.addressModel.find({
      customer_id: new mongoose.Types.ObjectId(customer_id),
    });

    const newAddressData = await this.addressModel.findById(
      new mongoose.Types.ObjectId(new_address_id),
    );
    const oldAddressData = await this.addressModel.findById(
      new mongoose.Types.ObjectId(old_address_id),
    );
    historyChange.before_changes = {
      old_address_id: oldAddressData?._id,
      customer_id: oldAddressData?.customer_id,
      address_type: oldAddressData?.address_type,
      full_address: oldAddressData?.full_address,
      city: oldAddressData?.city,
      province: oldAddressData?.province,
      country: oldAddressData?.country,
    };
    historyChange.after_changes = {
      new_address_id: newAddressData?._id,
      customer_id: newAddressData?.customer_id,
      address_type: newAddressData?.address_type,
      full_address: newAddressData?.full_address,
      city: newAddressData?.city,
      province: newAddressData?.province,
      country: newAddressData?.country,
    };

    const addressString =
      (newAddressData?.full_address || ' ') +
      ', ' +
      (newAddressData?.province || ' ') +
      ', ' +
      (newAddressData?.city || ' ') +
      ', ' +
      (newAddressData?.country || ' ');

    if (!addressData || addressData.length <= 1) {
      throw new BadRequestException(
        'Customer must have at least two addresses.',
      );
    }

    // Fetch subscriptions associated with the old address
    let subscriptionData = await this.subscriptionModel.find({
      customer_id: new mongoose.Types.ObjectId(customer_id),
      address_id: new mongoose.Types.ObjectId(old_address_id),
      end_date: { $gte: dateVary },
    });

    if (subscriptionData.length === 0) {
      subscriptionData = await this.subscriptionModel
        .find({
          customer_id: new mongoose.Types.ObjectId(customer_id),
          address_id: new mongoose.Types.ObjectId(old_address_id),
          end_date: { $lt: dateVary },
        })
        .sort('-createdAt')
        .limit(1);
    }

    for (const singleSubscription of subscriptionData) {
      // Update week_address and subscription address
      const updatedWeekAddress = singleSubscription.week_address.map(
        (weekAddress) =>
          weekAddress.address_id.toString() === old_address_id
            ? { ...weekAddress, address_id: new_address_id, slot }
            : weekAddress,
      );

      await this.subscriptionModel.updateOne(
        { _id: singleSubscription._id },
        {
          address_id: new mongoose.Types.ObjectId(new_address_id),
          slot,
          week_address: updatedWeekAddress,
        },
      );

      // Update related orders
      await this.orderModel.updateOne(
        { subscription_id: singleSubscription._id },
        {
          address_id: new mongoose.Types.ObjectId(new_address_id),
          slot,
        },
      );
    }

    historyChange.after_changes = {
      ...historyChange.after_changes,
      delivery_detail: `Deliveries will be affected from ${moment(dateVary).format('DD MMM YYYY')}. New Address will be ${newAddressData?.full_address} & slot will be ${slot}`,
    };
    // Update delivery data
    await this.deliveryModel.updateMany(
      {
        customer_id: new mongoose.Types.ObjectId(customer_id),
        address_id: new mongoose.Types.ObjectId(old_address_id),
        status: 'Pending',
        delivery_date: { $gte: dateVary },
      },
      {
        address_id: new mongoose.Types.ObjectId(new_address_id),
        slot,
      },
    );

    // Nullify the old address
    await this.addressModel.updateOne(
      {
        _id: new mongoose.Types.ObjectId(old_address_id),
        customer_id: new mongoose.Types.ObjectId(customer_id),
      },
      { customer_id: null },
    );

    let afterTime = '';
    let beforeTime = '';
    switch (slot) {
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
    await this.awbModel.updateMany(
      {
        'refund_bag_details.customer_id': customer_id,
        transcorp_date: { $gte: dateVary },
      },
      {
        $set: {
          'refund_bag_details.address': addressString,
          'refund_bag_details.city': newAddressData?.city,
          'refund_bag_details.area': newAddressData?.province,
          'refund_bag_details.slot': slot,
          'refund_bag_details.after_time': afterTime,
          'refund_bag_details.before_time': beforeTime,
        },
      },
    );

    return historyChange;
  }
}
