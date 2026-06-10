import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Translate } from './schemas/translation.schema';
import { UpdateTranslateDto } from './dto/translation.dto';
import { MetaScript } from './schemas/meta-script.schema';
import {
  CreateMetaScriptDto,
  UpdateMetaScriptDto,
} from './dto/meta-script.dto';

@Injectable()
export class TranslationService {
  constructor(
    @InjectModel('translations')
    private readonly translateModel: Model<Translate>,
    @InjectModel('meta_scripts')
    private readonly metaScriptModel: Model<MetaScript>,
  ) {}

  async createTranslation(
    key: string,
    description: string,
    translations: Array<Partial<Translate>>,
  ) {
    try {
      // const { key, description, translations } = createTranslationDto;

      // Create bulk operations for upsert
      const bulkOps = translations.map((translation) => ({
        updateOne: {
          filter: {
            key,
            language: translation.language,
          },
          update: {
            $set: {
              data: translation.data,
              description,
              key,
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

      // Execute bulk operation
      const result = await this.translateModel.bulkWrite(bulkOps);

      // Fetch the updated/created translations
      const updatedTranslations = await this.translateModel.find({
        key,
        language: { $in: translations.map((t) => t.language) },
      });

      return {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount,
      };
    } catch (error) {
      if (error.name === 'BadRequestException') {
        throw error;
      }

      // Handle specific MongoDB errors
      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid ObjectId format in the request`);
      }

      throw new BadRequestException(
        `Failed to update translations: ${error.message}`,
      );
    }
  }

  async findAllTranslation(
    search: any = '',
    page: number = 1,
    limit: number = 10,
  ) {
    page = Number(page);
    limit = Number(limit);

    if (page < 1) {
      page = 1;
    }

    const skip = (page - 1) * limit;
    // Build search filter
    const filter: any = { is_not_translation_data: { $ne: true } };

    if (search) {
      filter.$or = [
        { key: { $regex: search, $options: 'i' } },
        { data: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    console.log(filter);
    // First get all matching documents
    const allDocs = await this.translateModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Group documents by key
    const groupedByKey = allDocs.reduce((acc: any, doc: any) => {
      if (!acc[doc.key]) {
        acc[doc.key] = [];
      }
      acc[doc.key].push(doc);
      return acc;
    }, {});

    // Transform into desired format
    let transformedList = Object.entries(groupedByKey).map(
      ([key, docs]: [string, any[]]) => {
        // Find English document (or first document if no English)
        const primaryDoc = docs.find((doc) => doc.language === 'en') || docs[0];

        // Filter out the primary doc from translations
        const translations = docs
          .filter((doc) => doc._id.toString() !== primaryDoc._id.toString())
          .map((doc) => ({
            _id: doc._id,
            key: doc.key,
            data: doc.data,
            description: doc.description,
            language: doc.language,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
          }));

        return {
          _id: primaryDoc._id,
          key: primaryDoc.key,
          data: primaryDoc.data,
          description: primaryDoc.description,
          language: primaryDoc.language,
          createdAt: primaryDoc.createdAt,
          updatedAt: primaryDoc.updatedAt,
          translations,
        };
      },
    );

    // Apply pagination
    const totalCount = transformedList.length;
    transformedList = transformedList.slice(skip, skip + limit);

    return {
      list: transformedList,
      count: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
    };
  }

  async findOneTranslation(id: string): Promise<Translate> {
    const translate = await this.translateModel.findById(id).exec();
    if (!translate) {
      throw new NotFoundException(`Translate record with id ${id} not found`);
    }
    return translate;
  }
  async findAllTranslationDetails(key: string) {
    const translate = await this.translateModel.find({ key: key }).exec();
    if (!translate) {
      throw new NotFoundException(`Translate record with key ${key} not found`);
    }
    return translate;
  }

  async updateTranslation(
    id: string,
    updateTranslateDto: UpdateTranslateDto,
  ): Promise<Translate> {
    const existingTranslate = await this.translateModel
      .findByIdAndUpdate(id, updateTranslateDto, { new: true })
      .exec();
    if (!existingTranslate) {
      throw new NotFoundException(`Translate record with id ${id} not found`);
    }
    return existingTranslate;
  }
  async updateBulkTranslations(
    key: string,
    translations: Array<Partial<Translate>>,
  ) {
    try {
      // Validate input data
      if (!Array.isArray(translations) || translations.length === 0) {
        throw new BadRequestException(
          'Invalid input: Expected non-empty array of translations',
        );
      }

      // Validate each translation object
      translations.forEach((translation) => {
        if (!key || !translation.data || !translation.language) {
          throw new BadRequestException(
            'Each translation must contain key, data, and language fields',
          );
        }
      });

      // Group translations by key
      const translationsByKey = translations.reduce((acc, translation) => {
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(translation);
        return acc;
      }, {});

      const bulkOps = [];

      // Process each key group
      for (const [key, keyTranslations] of Object.entries(translationsByKey)) {
        // Find existing translations for this key
        const existingTranslations = await this.translateModel.find({ key });
        const existingLanguages = new Set(
          existingTranslations.map((t) => t.language),
        );

        // If we have existing translations and new languages
        if (existingTranslations.length > 0) {
          const referenceTranslation = existingTranslations[0]; // Use first translation as reference

          // Create operations for each translation
          for (const translation of keyTranslations) {
            const { _id, ...updateData } = translation;

            // If language doesn't exist, create new translation based on reference
            if (!existingLanguages.has(translation.language)) {
              const newTranslation = {
                key: key,
                language: translation.language,
                data: translation.data,
                // Copy any additional fields from reference translation
                ...Object.fromEntries(
                  Object.entries(referenceTranslation.toObject()).filter(
                    ([k]) => !['_id', 'key', 'language', 'data'].includes(k),
                  ),
                ),
              };

              bulkOps.push({
                insertOne: {
                  document: newTranslation,
                },
              });
            } else {
              // Update existing translation
              const filter = _id
                ? { _id: new Types.ObjectId(_id) }
                : {
                    key: key,
                    language: translation.language,
                  };

              bulkOps.push({
                updateOne: {
                  filter,
                  update: { $set: updateData },
                  upsert: true,
                },
              });
            }
          }
        } else {
          // If no existing translations, just create new ones
          keyTranslations.forEach((translation) => {
            const { _id, ...translationData } = translation;
            bulkOps.push({
              insertOne: {
                document: translationData,
              },
            });
          });
        }
      }

      // Execute bulk operation
      const result = await this.translateModel.bulkWrite(bulkOps);

      return {
        message: 'Translations updated successfully',
        data: {
          matched: result.matchedCount,
          modified: result.modifiedCount,
          upserted: result.upsertedCount,
          inserted: result.insertedCount,
        },
        status: true,
      };
    } catch (error) {
      if (error.name === 'BadRequestException') {
        throw error;
      }

      // Handle specific MongoDB errors
      if (error.name === 'CastError') {
        throw new BadRequestException(`Invalid ObjectId format in the request`);
      }

      throw new BadRequestException(
        `Failed to update translations: ${error.message}`,
      );
    }
  }
  async removeTranslation(id: string): Promise<void> {
    const result = await this.translateModel.findByIdAndDelete(id).exec();
    console.log({ result });
    if (result) {
      await this.translateModel.deleteMany({ key: result.key }).exec();
    }
    if (!result) {
      throw new NotFoundException(`Translate record with id ${id} not found`);
    }
  }

  async createMetaScript(
    createMetaScriptDto: CreateMetaScriptDto,
  ): Promise<MetaScript> {
    const newMetaScript =
      await this.metaScriptModel.create(createMetaScriptDto);
    return newMetaScript;
  }

  async findAllMetaScript(
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
    let filter: any = {};

    if (search) {
      filter = { key: { $regex: search, $options: 'i' } };
    }
    const data = await this.metaScriptModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .exec();
    const totalCount = await this.metaScriptModel.countDocuments(filter);
    return {
      list: data,
      count: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / Number(limit)),
    };
  }

  async findOneMetaScript(id: string): Promise<MetaScript> {
    const metaScript = await this.metaScriptModel.findById(id).exec();
    if (!metaScript) {
      throw new NotFoundException(`MetaScript with id ${id} not found`);
    }
    return metaScript;
  }

  async updateMetaScript(
    id: string,
    updateMetaScriptDto: UpdateMetaScriptDto,
  ): Promise<MetaScript> {
    const updatedMetaScript = await this.metaScriptModel
      .findByIdAndUpdate(id, updateMetaScriptDto, { new: true })
      .exec();
    if (!updatedMetaScript) {
      throw new NotFoundException(`MetaScript with id ${id} not found`);
    }
    return updatedMetaScript;
  }

  async removeMetaScript(id: string): Promise<void> {
    const result = await this.metaScriptModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`MetaScript with id ${id} not found`);
    }
  }
}
