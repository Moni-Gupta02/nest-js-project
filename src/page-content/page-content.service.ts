import { Injectable } from '@nestjs/common';
import {
  CreateDeliveryLocationDto,
  OptionalListFilterDto,
  UpdateDeliveryLocationDto,
} from './dto/delivery-location.dto';
import {
  CreateWhoWeServeDto,
  UpdateWhoWeServeDto,
} from './dto/who-we-serve.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeliveryLocationDocument } from './schemas/delivery-locaion.schema';
import { WhoWeServeDocument } from './schemas/who-we-serve.schema';

@Injectable()
export class PageContentService {
  constructor(
    @InjectModel('delivery_locations')
    private deliveryLocationModel: Model<DeliveryLocationDocument>,
    @InjectModel('who_we_serves')
    private whoWeServeModel: Model<WhoWeServeDocument>,
  ) {}

  // Delivery Location CRUD Methods
  async createDeliveryLocation(
    createDeliveryLocationDto: CreateDeliveryLocationDto,
  ) {
    const createdLocation = new this.deliveryLocationModel(
      createDeliveryLocationDto,
    );
    return createdLocation.save();
  }

  async findAllDeliveryLocations(query: OptionalListFilterDto) {
    const { search, page, limit } = query;
    const filter = search
      ? { location_name: { $regex: search, $options: 'i' } }
      : {};
    return this.deliveryLocationModel
      .find(filter)
      .skip(page * limit)
      .limit(limit)
      .exec();
  }

  async findOneDeliveryLocation(id: string) {
    return this.deliveryLocationModel.findById(id).exec();
  }

  async updateDeliveryLocation(
    id: string,
    updateDeliveryLocationDto: UpdateDeliveryLocationDto,
  ) {
    return this.deliveryLocationModel
      .findByIdAndUpdate(id, updateDeliveryLocationDto, { new: true })
      .exec();
  }

  async deleteDeliveryLocation(id: string) {
    return this.deliveryLocationModel.findByIdAndDelete(id).exec();
  }

  // Who We Serve CRUD Methods
  async createWhoWeServe(createWhoWeServeDto: CreateWhoWeServeDto) {
    const createdEntry = new this.whoWeServeModel(createWhoWeServeDto);
    return createdEntry.save();
  }

  async findAllWhoWeServe(query: OptionalListFilterDto) {
    const { search, page, limit } = query;
    const filter = search ? { people: { $regex: search, $options: 'i' } } : {};
    return this.whoWeServeModel
      .find(filter)
      .skip(page * limit)
      .limit(limit)
      .exec();
  }

  async findOneWhoWeServe(id: string) {
    return this.whoWeServeModel.findById(id).exec();
  }

  async updateWhoWeServe(id: string, updateWhoWeServeDto: UpdateWhoWeServeDto) {
    return this.whoWeServeModel
      .findByIdAndUpdate(id, updateWhoWeServeDto, { new: true })
      .exec();
  }

  async deleteWhoWeServe(id: string) {
    return this.whoWeServeModel.findByIdAndDelete(id).exec();
  }
}
