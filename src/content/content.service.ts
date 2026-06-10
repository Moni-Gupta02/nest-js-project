import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Content, ContentDocument, ContentType } from './schema/content.schema';
import {
  CreateContentDto,
  UpdateContentDto,
  ContentQueryDto,
} from './dto/content.dto';

@Injectable()
export class ContentService {
  constructor(
    @InjectModel('Content')
    private contentModel: Model<ContentDocument>,
  ) {}

  private async findExistingContent(
    type: ContentType,
    version: string,
  ): Promise<Content | null> {
    try {
      return await this.contentModel.findOne({ type, version }).exec();
    } catch (error) {
      console.error('Error finding existing content:', error);
      return null;
    }
  }

  private async deactivateOtherVersions(
    type: ContentType,
    excludeId?: string,
  ): Promise<void> {
    try {
      const filter: any = { type, isActive: true };
      if (excludeId) {
        filter._id = { $ne: excludeId };
      }
      await this.contentModel.updateMany(filter, { isActive: false }).exec();
    } catch (error) {
      console.error('Error deactivating other versions:', error);
      throw new Error(`Failed to deactivate other versions: ${error.message}`);
    }
  }

  async create(createContentDto: CreateContentDto): Promise<any> {
    try {
      const { type, version, isActive } = createContentDto;

      console.log({ createContentDto });

      // Check for existing content with same type and version
      if (type !== ContentType.FAQ) {
        const existingContent = await this.findExistingContent(type, version);

        if (existingContent) {
          throw new BadRequestException(
            `Content with type "${type}" and version "${version}" already exists`,
          );
        }

        // If this content is being set as active, deactivate others of same type
        if (isActive) {
          await this.deactivateOtherVersions(type);
          console.log(`Deactivated other versions of type: ${type}`);
        }
      }
      // Create the content
      const createdContent = await this.contentModel.create(createContentDto);

      console.log('Content created successfully:', {
        id: createdContent._id,
        type: createdContent.type,
        version: createdContent.version,
        isActive: createdContent.isActive,
      });

      return createdContent;
    } catch (error) {
      console.error('Error in creating content:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error(`Failed to create content: ${error.message}`);
    }
  }

  async findAll(query: ContentQueryDto = {}): Promise<any> {
    try {
      const { type, isActive, version, search } = query;

      console.log('Finding content with query:', { query });

      const filter: any = {};

      if (type) filter.type = type;
      if (isActive !== undefined) filter.isActive = isActive;
      if (version) filter.version = version;

      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
        ];
      }

      const contents = await this.contentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .exec();

      console.log(`Found ${contents.length} content items`);
      return contents;
    } catch (error) {
      console.error('Error in finding all content:', error);
      throw new Error(`Failed to retrieve content: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<any> {
    try {
      console.log(`Finding content with ID: ${id}`);

      const content = await this.contentModel.findById(id).exec();

      if (!content) {
        throw new NotFoundException(`Content with ID "${id}" not found`);
      }

      console.log('Content found:', {
        id: content._id,
        type: content.type,
        title: content.title,
        version: content.version,
      });

      return content;
    } catch (error) {
      console.error('Error in finding content by ID:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to find content: ${error.message}`);
    }
  }

  async findByType(type: ContentType): Promise<any> {
    try {
      console.log(`Finding content by type: ${type}`);

      const contents = await this.contentModel
        .find({ type })
        .sort({ createdAt: -1 })
        .exec();

      console.log(`Found ${contents.length} content items of type: ${type}`);
      return contents;
    } catch (error) {
      console.error('Error in finding content by type:', error);
      throw new Error(`Failed to retrieve content by type: ${error.message}`);
    }
  }

  async update(id: string, updateContentDto: UpdateContentDto): Promise<any> {
    try {
      const { version, type } = updateContentDto;

      console.log(`Updating content with ID: ${id}`, { updateContentDto });

      // Check if content exists
      const existingContent = await this.findOne(id);

      // Check for version conflicts if version is being updated
      if (version && version !== existingContent.version) {
        const contentType = type || existingContent.type;
        const versionConflict = await this.contentModel
          .findOne({
            type: contentType,
            version,
            _id: { $ne: id },
          })
          .exec();

        if (versionConflict) {
          throw new BadRequestException(
            `Content with type "${contentType}" and version "${version}" already exists`,
          );
        }
      }

      // If setting as active, deactivate others of same type
      if (updateContentDto.isActive) {
        const contentType = type || existingContent.type;
        await this.deactivateOtherVersions(contentType, id);
        console.log(`Deactivated other versions of type: ${contentType}`);
      }

      const updatedContent = await this.contentModel
        .findByIdAndUpdate(id, updateContentDto, { new: true })
        .exec();

      console.log('Content updated successfully:', {
        id: updatedContent._id,
        type: updatedContent.type,
        version: updatedContent.version,
        isActive: updatedContent.isActive,
      });

      return updatedContent;
    } catch (error) {
      console.error('Error in updating content:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new Error(`Failed to update content: ${error.message}`);
    }
  }

  async remove(id: string): Promise<any> {
    try {
      console.log(`Deleting content with ID: ${id}`);

      await this.findOne(id);

      const result = await this.contentModel.findByIdAndDelete(id).exec();

      if (!result) {
        throw new NotFoundException(`Content with ID "${id}" not found`);
      }

      console.log('Content deleted successfully:', {
        id: result._id,
        type: result.type,
        version: result.version,
      });

      return { deleted: true, content: result };
    } catch (error) {
      console.error('Error in deleting content:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to delete content: ${error.message}`);
    }
  }

  async setActive(id: string): Promise<any> {
    try {
      console.log(`Setting content as active with ID: ${id}`);

      const content = await this.findOne(id);

      // Deactivate all other content of the same type
      await this.deactivateOtherVersions(content.type, id);

      // Set the specified content as active
      const updatedContent = await this.contentModel
        .findByIdAndUpdate(id, { isActive: true }, { new: true })
        .exec();

      console.log('Content activated successfully:', {
        id: updatedContent._id,
        type: updatedContent.type,
        version: updatedContent.version,
        isActive: updatedContent.isActive,
      });

      return updatedContent;
    } catch (error) {
      console.error('Error in setting content as active:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to activate content: ${error.message}`);
    }
  }

  async getContentTypes(): Promise<any> {
    try {
      console.log('Getting all content types');

      const types = Object.values(ContentType);

      console.log('Content types retrieved:', types);
      return types;
    } catch (error) {
      console.error('Error in getting content types:', error);
      throw new Error(`Failed to get content types: ${error.message}`);
    }
  }

  async getVersionsByType(type: ContentType): Promise<any> {
    try {
      console.log(`Getting versions for content type: ${type}`);

      const versions = await this.contentModel
        .find({ type })
        .distinct('version')
        .exec();

      console.log(`Found ${versions.length} versions for type: ${type}`);
      return versions;
    } catch (error) {
      console.error('Error in getting versions by type:', error);
      throw new Error(`Failed to get versions by type: ${error.message}`);
    }
  }
}
