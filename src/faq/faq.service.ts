import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateFAQDto, UpdateFAQDto } from './dto/faq.dto';
import {
  CreateFAQCategoryDto,
  UpdateFAQCategoryDto,
} from './dto/faq-category.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FAQ } from './Schemas/faq.schema';
import { FAQCategory } from './Schemas/faqCategory.schema';

@Injectable()
export class FaqService {
  constructor(
    @InjectModel('faqs') private faqModel: Model<FAQ>,
    @InjectModel('faq_categories') private faqCategoryModel: Model<FAQCategory>,
  ) {}

  async createFaq(createFAQDto: CreateFAQDto): Promise<FAQ> {
    const categoryIds = createFAQDto.category.map(
      (id) => new Types.ObjectId(id),
    );

    // Create a new FAQ with ObjectId categories
    const newFAQ = new this.faqModel({
      ...createFAQDto,
      category: categoryIds,
    });

    return newFAQ.save();
  }

  async findAllFaq(
    search: any = '', // Filter criteria
    page: number = 1,
    limit: number = 10,
  ) {
    page = Number(page);
    limit = Number(limit);

    // Handle invalid page numbers
    if (page < 1) {
      page = 1; // Reset to 1 if invalid
    }

    const skip = (page - 1) * limit; // Correct calculation for skip
    const filter: any = {};

    if (search) {
      if (search.question) {
        filter.question = { $regex: search.question, $options: 'i' }; // Case-insensitive search for question
      }
      if (search.answer) {
        filter.answer = { $regex: search.answer, $options: 'i' }; // Case-insensitive search for answer
      }
      if (search.category) {
        filter.category = { $in: search.category }; // Filter by category IDs (array of ObjectId)
      }
    }

    const data = await this.faqModel.aggregate([
      // Step 1: Match filters
      {
        $match: filter,
      },
      // Step 2: Lookup to join with FAQCategory
      {
        $lookup: {
          from: 'faq_categories', // Name of the FAQCategory collection
          localField: 'category', // Field in the FAQ documents
          foreignField: '_id', // Field in the FAQCategory documents
          as: 'categoryDetails', // Output array field
        },
      },
      // Step 3: Project only the required fields and conditionally format the category
      {
        $project: {
          _id: 1,
          question: 1,
          answer: 1,
          order_index: 1,
          category: {
            $map: {
              input: '$category', // The input array
              as: 'cat', // Alias for each category item
              in: {
                $cond: [
                  { $eq: [{ $type: '$$cat' }, 'objectId'] }, // Check if it is an ObjectId
                  {
                    $arrayElemAt: [
                      '$categoryDetails', // Use the lookup results
                      { $indexOfArray: ['$categoryDetails._id', '$$cat'] }, // Find index of ObjectId in categoryDetails
                    ],
                  },
                  '$$cat', // If it's not an ObjectId, return the string directly
                ],
              },
            },
          },
        },
      },
      // Step 4: Skip and Limit for pagination
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
    ]);
    console.log(skip);
    console.log(limit);
    const totalCount = await this.faqModel.countDocuments(filter).exec();
    return {
      list: data,
      count: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / Number(limit)),
    };
  }

  async findOneFaq(id: string): Promise<FAQ> {
    try {
      const faq = await this.faqModel
        .findById(id)
        .populate({
          path: 'category', // The field to populate
          select: 'name', // Specify that only the 'name' field should be populated

          model: 'faq_categories', // Explicitly specify the model
        })
        .exec();

      console.log('Fetched FAQ:', faq);
      return faq;
    } catch (error) {
      console.error('Error fetching FAQ:', error);
      throw new InternalServerErrorException(
        'An error occurred while fetching the FAQ',
      );
    }
  }

  async updateFaq(id: string, updateFAQDto: UpdateFAQDto): Promise<FAQ> {
    const updateData = {
      ...updateFAQDto, // Clone the existing DTO
      category:
        updateFAQDto.category?.map((id) => new Types.ObjectId(id)) || [], // Convert and handle undefined
    };

    return this.faqModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('faq_categories`')
      .exec();
  }

  async deleteFaq(id: string): Promise<any> {
    return this.faqModel.findByIdAndDelete(id).exec();
  }
  async createFaqCategory(
    createFAQCategoryDto: CreateFAQCategoryDto,
  ): Promise<FAQCategory> {
    const newCategory = new this.faqCategoryModel(createFAQCategoryDto);
    return newCategory.save();
  }

  async findAllFaqCategory(search: any): Promise<FAQCategory[]> {
    const filter: any = {};
    if (search) {
      filter.name = { $regex: search, $options: 'i' }; // Case-insensitive search for question
    }
    console.log(filter);

    return this.faqCategoryModel.find(filter).exec();
  }

  async findOneFaqCategory(id: string): Promise<FAQCategory> {
    return this.faqCategoryModel.findById(id).exec();
  }

  async updateFaqCategory(
    id: string,
    updateFAQCategoryDto: UpdateFAQCategoryDto,
  ): Promise<FAQCategory> {
    return this.faqCategoryModel
      .findByIdAndUpdate(id, updateFAQCategoryDto, { new: true })
      .exec();
  }

  async deleteFaqCategory(id: string): Promise<any> {
    return this.faqCategoryModel.findByIdAndDelete(id).exec();
  }
}
