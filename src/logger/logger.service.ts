import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FilterLoggerDto } from './dto/filter-logger.dto';
import { Logger, LoggerDocument } from './Schemas/logger.schema';

@Injectable()
export class LoggerService {
  constructor(
    @InjectModel('logger') private loggerModel: Model<LoggerDocument>,
  ) {}
  async findAll(filter: FilterLoggerDto, page: number = 1, limit: number = 10) {
    const skip = +(page - 1) * +limit;
    const query: any = {};
    if (filter.level) {
      query.level = { $regex: filter.level, $options: 'i' }; // case-insensitive search for level
    }

    if (filter.fromDate || filter.toDate) {
      query.timestamp = {};
      if (filter.fromDate) {
        query.timestamp.$gte = new Date(filter.fromDate); // Greater than or equal to fromDate
      }
      if (filter.toDate) {
        query.timestamp.$lte = new Date(filter.toDate); // Less than or equal to toDate
      }
    }

    // Adjusted query paths based on your provided data structure
    if (filter.requestMethod) {
      query['meta.meta.requestMethod'] = filter.requestMethod;
    }

    if (filter.clientIp) {
      query['meta.meta.clientIp'] = { $regex: filter.clientIp, $options: 'i' }; // case-insensitive search for clientIp
    }

    if (filter.requestUrl) {
      query['meta.meta.requestUrl'] = {
        $regex: filter.requestUrl,
        $options: 'i',
      }; // case-insensitive search for requestUrl
    }

    console.log(query);
    const results = await this.loggerModel
      .find(query)
      .skip(skip)
      .limit(+limit)
      .exec();
    const count = await this.loggerModel.countDocuments(query).exec();
    // console.log(results, '--results');
    return {
      list: results,
      count,
      pageCount: Math.ceil(count / limit),
      currentPage: +page,
    };
  }

  // Find one log by ID
  async findOne(id: string): Promise<Logger> {
    return await this.loggerModel.findById(id).exec();
  }

  async remove(id: number) {
    return await this.loggerModel.findByIdAndDelete(id).exec();
  }
}
