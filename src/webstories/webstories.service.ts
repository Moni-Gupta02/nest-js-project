import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateWebStoriesCategoryDto,
  UpdateWebStoriesCategoryDto,
} from './dto/webstory-category.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WebStoriesCategoryDocument } from './schemas/webstory-category.schema';
import { GetWebStoriesDto } from './dto/getWebstories.dto';
import { WebStoriesDocument } from './schemas/webstories.schema';
import { CreateWebStoryDto } from './dto/webstories.dto';

@Injectable()
export class WebstoriesService {
  constructor(
    @InjectModel('webStoriesCategories')
    private webStoriesCategoryModel: Model<WebStoriesCategoryDocument>,
    @InjectModel('webstories')
    private webStoriesModel: Model<WebStoriesDocument>,
  ) {}

  async createCategory(
    createWebStoriesCategoryDto: CreateWebStoriesCategoryDto,
  ) {
    const webStoriesCategory = new this.webStoriesCategoryModel(
      createWebStoriesCategoryDto,
    );
    return webStoriesCategory.save();
  }
  async getAllWebStories(query: GetWebStoriesDto) {
    const { section, category, search, limit = 10, page = 1 } = query;
    console.log(query);

    const filter: any = {};
    if (section) filter.section = section;
    if (category) filter.category = { $in: [category] };
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (+page - 1) * +limit;

    const data = await this.webStoriesModel
      .find(filter)
      .limit(+limit)
      .skip(+skip);

    const totalCount = await this.webStoriesModel.countDocuments(filter);
    console.log(totalCount, limit);
    return {
      list: data,
      count: totalCount,
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
    };
  }
  async findAllCategory() {
    return this.webStoriesCategoryModel.find().exec();
  }

  async findOneCategory(id: string) {
    const webStoriesCategory = await this.webStoriesCategoryModel
      .findById(id)
      .exec();
    if (!webStoriesCategory)
      throw new NotFoundException(`WebStoriesCategory #${id} not found`);
    return webStoriesCategory;
  }

  async updateCategory(
    id: string,
    updateWebStoriesCategoryDto: UpdateWebStoriesCategoryDto,
  ) {
    const webStoriesCategory = await this.webStoriesCategoryModel
      .findByIdAndUpdate(id, updateWebStoriesCategoryDto, { new: true })
      .exec();
    if (!webStoriesCategory)
      throw new NotFoundException(`WebStoriesCategory #${id} not found`);
    return webStoriesCategory;
  }

  async removeCategory(id: string) {
    const webStoriesCategory = await this.webStoriesCategoryModel
      .findByIdAndDelete(id)
      .exec();
    if (!webStoriesCategory)
      throw new NotFoundException(`WebStoriesCategory #${id} not found`);
    return webStoriesCategory;
  }

  private generateSlug(title: string): string {
    let slug = title
      .trim()
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]+/g, '-');
    if (slug.endsWith('-')) {
      slug = slug.slice(0, -1);
    }
    return slug;
  }

  async create(createWebStoryDto: CreateWebStoryDto) {
    const slug = this.generateSlug(createWebStoryDto.title);

    const titleExists = await this.webStoriesModel.findOne({
      title: { $regex: new RegExp(`^${createWebStoryDto.title}$`, 'i') },
    });

    if (titleExists) {
      throw new BadGatewayException('Title Already Exists!');
    }

    const webStory = new this.webStoriesModel({
      ...createWebStoryDto,
      slug,
    });

    await webStory.save();
    return { message: 'WebStories Stored Successfully!' };
  }

  async update(id: string, createWebStoryDto: CreateWebStoryDto) {
    const slug = this.generateSlug(createWebStoryDto.title);

    const titleExists = await this.webStoriesModel.findOne({
      _id: { $ne: id },
      title: { $regex: new RegExp(`^${createWebStoryDto.title}$`, 'i') },
    });

    if (titleExists) {
      throw new BadGatewayException('Title Already Exists!');
    }

    await this.webStoriesModel.findByIdAndUpdate(id, {
      ...createWebStoryDto,
      slug,
    });

    return { message: 'WebStory Edited Successfully!' };
  }
  async Detail(id: string) {
    return await this.webStoriesModel.findById(id);
  }
}
