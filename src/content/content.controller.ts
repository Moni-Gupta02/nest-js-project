import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ContentService } from './content.service';
import {
  CreateContentDto,
  UpdateContentDto,
  ContentQueryDto,
} from './dto/content.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { ContentType } from './schema/content.schema';

@ApiTags('Content Management')
@Controller('content')
@ApiBearerAuth('access-token')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Permissions({ resource: 'content', actions: 'create' })
  @Post('create')
  @ApiOperation({ summary: 'Create new content' })
  async create(@Body() createContentDto: CreateContentDto) {
    try {
      const data = await this.contentService.create(createContentDto);
      return {
        message: 'Content successfully created',
        data: data,
        status: true,
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'content', actions: 'read' })
  @Get('list')
  @ApiOperation({ summary: 'Get all content with filters' })
  @ApiQuery({ name: 'type', required: false, enum: ContentType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'version', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(@Query() query: ContentQueryDto) {
    try {
      const data = await this.contentService.findAll(query);
      return {
        message: 'Content retrieved successfully',
        data: data,
        status: true,
      };
    } catch (error) {
      handleUnexpectedError(error);
    }
  }

  @Permissions({ resource: 'content', actions: 'read' })
  @Get('types')
  @ApiOperation({ summary: 'Get all available content types' })
  async getContentTypes() {
    try {
      const data = await this.contentService.getContentTypes();
      return {
        message: 'Content types retrieved successfully',
        data: data,
        status: true,
      };
    } catch (error) {
      handleUnexpectedError(error);
    }
  }

  @Permissions({ resource: 'content', actions: 'read' })
  @Get('type/:type')
  @ApiOperation({ summary: 'Get content by type' })
  @ApiParam({ name: 'type', enum: ContentType })
  async findByType(@Param('type') type: string) {
    try {
      if (!Object.values(ContentType).includes(type as ContentType)) {
        throw new BadRequestException(`Invalid content type: ${type}`);
      }
      const data = await this.contentService.findByType(type as ContentType);
      return {
        message: `Content of type ${type} retrieved successfully`,
        data: data,
        status: true,
      };
    } catch (error) {
      handleUnexpectedError(error);
    }
  }

  @Permissions({ resource: 'content', actions: 'read' })
  @Get(':id')
  @ApiOperation({ summary: 'Get content by ID' })
  @ApiParam({ name: 'id', type: String })
  async findOne(@Param('id') id: string) {
    try {
      const data = await this.contentService.findOne(id);
      return {
        message: 'Content retrieved successfully',
        data: data,
        status: true,
      };
    } catch (error) {
      handleUnexpectedError(error);
    }
  }

  @Permissions({ resource: 'content', actions: 'update' })
  @Patch('update/:id')
  @ApiOperation({ summary: 'Update content by ID' })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('id') id: string,
    @Body() updateContentDto: UpdateContentDto,
  ) {
    try {
      const data = await this.contentService.update(id, updateContentDto);
      return {
        message: 'Content successfully updated',
        data: data,
        status: true,
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'content', actions: 'update' })
  @Patch('activate/:id')
  @ApiOperation({ summary: 'Set content as active' })
  @ApiParam({ name: 'id', type: String })
  async setActive(@Param('id') id: string) {
    try {
      const data = await this.contentService.setActive(id);
      return {
        message: 'Content successfully activated',
        data: data,
        status: true,
      };
    } catch (error) {
      handleUnexpectedError(error);
    }
  }

  @Permissions({ resource: 'content', actions: 'delete' })
  @Delete('delete/:id')
  @ApiOperation({ summary: 'Delete content by ID' })
  @ApiParam({ name: 'id', type: String })
  async remove(@Param('id') id: string) {
    try {
      await this.contentService.remove(id);
      return {
        message: 'Content successfully deleted',
        data: null,
        status: true,
      };
    } catch (error) {
      handleUnexpectedError(error);
    }
  }
}
