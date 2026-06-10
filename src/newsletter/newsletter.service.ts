import { Injectable } from '@nestjs/common';
import { Newsletter } from './schemas/newsletter.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class NewsletterService {
  constructor(
    @InjectModel('newsletters')
    private readonly newsletterModel: Model<Newsletter>,
  ) {}
  async findAll(page: number = 1, limit: number = 10, filter: string = '') {
    const query = filter ? { email: { $regex: filter, $options: 'i' } } : {};

    const newsletters = await this.newsletterModel
      .find(query)
      .skip(+(page - 1) * +limit)
      .limit(+limit)
      .sort({ createdAt: -1 })
      .exec();

    const count = await this.newsletterModel.countDocuments(query).exec();

    return {
      list: newsletters,
      count: count,
      currentPage: +page,
      totalPages: Math.ceil(count / Number(limit)),
    };
  }

  async delete(id) {
    await this.newsletterModel.findByIdAndDelete(id).exec();

    return;
  }
}
