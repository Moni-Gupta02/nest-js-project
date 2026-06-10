import { Injectable, NotFoundException } from '@nestjs/common';
import { Blog } from './schemas/blog.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { BlogCategory } from './schemas/blogCategory.schema';
import { BlogTag } from './schemas/blogTag.schema';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { CreateBlogTagDto, UpdateBlogTagDto } from './dto/blog-tag.dto';
import {
  CreateBlogCategoryDto,
  UpdateBlogCategoryDto,
} from './dto/blog-category.dto';

@Injectable()
export class BlogsService {
  constructor(
    @InjectModel('blogs')
    private blogsModel: Model<Blog>,
    @InjectModel('blogcategories')
    private BlogCategoryModel: Model<BlogCategory>,
    @InjectModel('blogtags')
    private BlogTagModel: Model<BlogTag>,
  ) {}

  async findAllBlogs(page: number, limit: number, search?: string) {
    try {
      const skip = (page - 1) * limit;
      const searchCriteria = search
        ? {
            $or: [
              { title: { $regex: search, $options: 'i' } }, // case-insensitive search
              { subtitle: { $regex: search, $options: 'i' } },
            ],
          }
        : {};
      const queryCriteria = {
        ...searchCriteria,
      };
      // Fetching the blogs data with pagination and the specified fields
      const [data, countValue] = await Promise.all([
        this.blogsModel
          .find(queryCriteria)
          .select(
            'title category author_id subtitle min_reading_time publishing_date banner_top',
          )
          .skip(+skip)
          .limit(+limit),
        this.blogsModel.countDocuments(queryCriteria), // Get the count of matching documents
      ]);

      return {
        list: data,
        count: countValue,
        currentPage: +page,
        totalPages: Math.ceil(countValue / limit) || 0,
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  async createBlogTag(createBlogTagDto: CreateBlogTagDto) {
    const blogTag = new this.BlogTagModel(createBlogTagDto);
    return blogTag.save();
  }

  async findOneBlogTag(id: string) {
    const blogTag = await this.BlogTagModel.findById(id).exec();
    if (!blogTag) throw new NotFoundException(`BlogTag #${id} not found`);
    return blogTag;
  }
  async listBlogTag() {
    const blogTag = await this.BlogTagModel.find().exec();
    if (!blogTag) throw new NotFoundException(`BlogTags not found`);
    return blogTag;
  }
  async updateBlogTag(id: string, updateBlogTagDto: UpdateBlogTagDto) {
    const blogTag = await this.BlogTagModel.findByIdAndUpdate(
      id,
      updateBlogTagDto,
      { new: true },
    ).exec();
    if (!blogTag) throw new NotFoundException(`BlogTag #${id} not found`);
    return blogTag;
  }

  async removeBlogTag(id: string) {
    const blogTag = await this.BlogTagModel.findByIdAndDelete(id).exec();
    if (!blogTag) throw new NotFoundException(`BlogTag #${id} not found`);
    return blogTag;
  }
  async createBlogCategory(createBlogCategoryDto: CreateBlogCategoryDto) {
    const blogCategory = new this.BlogCategoryModel(createBlogCategoryDto);
    return blogCategory.save();
  }

  async findOneBlogCategory(id: string) {
    const blogCategory = await this.BlogCategoryModel.findById(id).exec();
    if (!blogCategory)
      throw new NotFoundException(`BlogCategory #${id} not found`);
    return blogCategory;
  }

  async updateBlogCategory(
    id: string,
    updateBlogCategoryDto: UpdateBlogCategoryDto,
  ) {
    const blogCategory = await this.BlogCategoryModel.findByIdAndUpdate(
      id,
      updateBlogCategoryDto,
      { new: true },
    ).exec();
    if (!blogCategory)
      throw new NotFoundException(`BlogCategory #${id} not found`);
    return blogCategory;
  }
  async listBlogCategory() {
    const blogCategory = await this.BlogCategoryModel.find().exec();
    if (!blogCategory) throw new NotFoundException(`BlogCategory not found`);
    return blogCategory;
  }

  async removeBlogCategory(id: string) {
    const blogCategory =
      await this.BlogCategoryModel.findByIdAndDelete(id).exec();
    if (!blogCategory) throw new NotFoundException(`BlogTag #${id} not found`);
    return blogCategory;
  }
}
