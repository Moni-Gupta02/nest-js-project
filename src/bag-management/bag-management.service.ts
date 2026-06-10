import { Injectable } from '@nestjs/common';
import { QueryBagManagementDto } from './dto/bag-management.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BagManagementDocument } from './Schema/bag-management.schema';

@Injectable()
export class BagManagementService {
  constructor(
    @InjectModel('bag_managements')
    private readonly bagModel: Model<BagManagementDocument>,
  ) {}
  async findAll(query: QueryBagManagementDto) {
    const { page = 1, limit = 10, ...filters } = query;
    const skip = (+page - 1) * +limit;

    const [data, total] = await Promise.all([
      this.bagModel.find(filters).skip(+skip).limit(+limit).exec(),
      this.bagModel.countDocuments(filters),
    ]);
    return {
      list: data,
      count: total,
      currentPage: +page,
      totalPages: Math.ceil(total / Number(limit)),
    };
  }
}
