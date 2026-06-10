import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class DeliveryRepository {
  constructor(
    @InjectModel('delivery') private readonly delivery: Model<any>,
    @InjectModel('delivery_dump') private readonly dump: Model<any>,
    @InjectModel('driver_stepper') private readonly stepper: Model<any>,
    @InjectModel('master_data') private readonly master: Model<any>,
    @InjectModel('coupon') private readonly coupon: Model<any>,
    @InjectModel('own_delivery') private readonly ownDelivery: Model<any>,
    @InjectModel('awb') private readonly awb: Model<any>,
  ) { }

  private baseQuery(date: Date, type: string) {
    return {
      delivery_date: date,
      not_deliverable: false,
      is_delivery_freezed: false,
      delivery_type: type,
    };
  }

  private selectDeliveryFields(query: any) {
    return query.select(
      'delivery_date delivery_type not_deliverable is_delivery_freezed customer_internal_code address_id order_id subscription_id customer_id slot instruction delivery_item',
    );
  }

  private populateQuery(query: any) {
    return query
      .populate({
        path: 'order_id',
        select:
          'migrated_order_number order_number refundable_deposite coupon_id',
        options: { sort: { order_number: 1 } },
      })
      .populate('address_id', 'city province full_address country address_type delivery_note')
      .populate(
        'subscription_id',
        'selected_meal is_refundable bag_info avoid_ingredients coupon_id',
      )
      .populate(
        'customer_id',
        'first_name last_name country_code phone_number whatsapp_country_code whatsapp_number',
      );
  }

  async getDeliveryWithFallback(date: Date, type: string) {
    let data = await this.populateQuery(
      this.selectDeliveryFields(this.delivery.find(this.baseQuery(date, type))),
    ).lean();

    if (!data?.length) {
      data = await this.populateQuery(
        this.selectDeliveryFields(this.dump.find(this.baseQuery(date, type))),
      ).lean();
    }

    return data || [];
  }

  async findDeliveryByType(date: Date, type: string) {
    return (
      (await this.populateQuery(
        this.selectDeliveryFields(this.delivery.find(this.baseQuery(date, type))),
      ).lean()) || []
    );
  }

  async findDumpDeliveryByType(date: Date, type: string) {
    return (
      (await this.populateQuery(
        this.selectDeliveryFields(this.dump.find(this.baseQuery(date, type))),
      ).lean()) || []
    );
  }

  async countSubscriptions(date: Date) {
    return this.delivery.countDocuments(this.baseQuery(date, 'subscription'));
  }

  async countSubscriptionDump(date: Date) {
    return this.dump.countDocuments(this.baseQuery(date, 'subscription'));
  }

  async getDriverStepper(date: Date) {
    return this.stepper.findOne({ date }).lean();
  }

  async getMasterData() {
    return this.master.findOne({}).lean();
  }

  async getCoupons() {
    return this.coupon
      .find(
        { name: 'ALIST 2025 AUG' },
        { _id: 1, name: 1, coupon_code: 1 },
      )
      .lean();
  }

  async getOwnDeliveryList() {
    return this.ownDelivery.find({}).lean();
  }

  async bulkUpdateDeliveries(bulkOps: any[]) {
    return this.delivery.bulkWrite(bulkOps, { ordered: false });
  }

  async countUnfinalizedBarcode(date: Date, deliveryType: string) {
    return this.delivery.countDocuments({
      is_delivery_freezed: false,
      not_deliverable: false,
      delivery_date: date,
      delivery_type: deliveryType,
      is_barcode_finalized: false,
    });
  }

  async updateDriverStepper(date: Date, updatePayload: any) {
    return this.stepper.updateOne(
      { date },
      {
        $set: updatePayload,
      },
      {
        upsert: true,
      },
    );
  }

  async replaceAwbData(dataPayload: any[]) {
    if (!dataPayload?.length) return;

    const awbIds = dataPayload.map((item) => item?.awb).filter(Boolean);

    if (awbIds.length) {
      await this.awb.deleteMany({
        awb: { $in: awbIds },
      });
    }

    const bulkOps = dataPayload
      .filter((item) => item?.awb)
      .map((item) => ({
        insertOne: {
          document: {
            awb: item?.awb,
            transcorp_date: item?.delivery_date,
            type: item?.type,
            active: item?.active,
            refund_bag_details: item,
            vendor: item?.vendor,
            status: 'UNASSIGNED',
          },
        },
      }));

    if (bulkOps.length) {
      await this.awb.bulkWrite(bulkOps, { ordered: false });
    }
  }

}