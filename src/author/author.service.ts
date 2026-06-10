import { Injectable } from '@nestjs/common';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Author } from 'aws-sdk/clients/ecr';

@Injectable()
export class AuthorService {
  constructor(@InjectModel('Authors') private authorModel: Model<Author>) {}

  async create(createAuthorDto: CreateAuthorDto) {
    const newAuthor = new this.authorModel(createAuthorDto);
    return newAuthor.save();
  }

  async findAll(page: number = 1, limit: number = 10, filter?: string) {
    const query: any = filter ? { author_name: new RegExp(filter, 'i') } : {};
    const total = await this.authorModel.countDocuments(query);
    const authors = await this.authorModel
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .exec();
    return { authors, total };
  }

  async findOne(id: string) {
    return this.authorModel.findById(id).exec();
  }

  async update(id: string, updateAuthorDto: UpdateAuthorDto) {
    return this.authorModel
      .findByIdAndUpdate(id, updateAuthorDto as any, { new: true })
      .exec();
  }

  async remove(id: string) {
    return this.authorModel.findByIdAndDelete(id).exec();
  }
}
