import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class OwnDeliveryService {
  constructor(
    @InjectModel('OwnDelivery')
    private ownDeliveryModel: Model<any>,
  ) {}

  async getOwnDeliveryList() {
    const ownDeliveryData = await this.ownDeliveryModel.find({}).lean();

    return {
      status: 'success',
      data: ownDeliveryData,
    };
  }
}