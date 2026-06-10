import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
} from '@nestjs/common';
import { WebstoriesService } from './webstories.service';
import {
  CreateWebStoriesCategoryDto,
  UpdateWebStoriesCategoryDto,
} from './dto/webstory-category.dto';
import { Public } from 'src/common/decorators';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { message } from 'src/common/assets';
import { GetWebStoriesDto } from './dto/getWebstories.dto';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { CreateWebStoryDto } from './dto/webstories.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';

@ApiTags('Web Stories')
@ApiBearerAuth('access-token')
@Controller('webstories')
export class WebstoriesController {
  constructor(private readonly webstoriesService: WebstoriesService) {}

  @Permissions({ resource: 'web_stories', actions: 'list' }) //customer page
  @Get('list')
  async listAllWebStories(@Query() query: GetWebStoriesDto) {
    try {
      const result = await this.webstoriesService.getAllWebStories(query);
      return {
        message: message.GET_DETAILS,
        data: result,
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
  @Permissions({ resource: 'web_stories_category', actions: 'create' })
  @Post('add-category')
  @ApiOperation({ summary: 'Create a new web story category' })
  @ApiResponse({
    status: 201,
    description: 'The web story category has been created.',
  })
  async createCategory(
    @Body() createWebStoriesCategoryDto: CreateWebStoriesCategoryDto,
  ) {
    try {
      const data = await this.webstoriesService.createCategory(
        createWebStoriesCategoryDto,
      );
      return {
        message: 'Category created successfully',
        data,
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

  @Public()
  @Get('category-list')
  @ApiOperation({ summary: 'Get all web story categories' })
  @ApiResponse({ status: 200, description: 'Return all web story categories.' })
  async findAllCategory() {
    try {
      const data = await this.webstoriesService.findAllCategory();
      return {
        message: 'Categories retrieved successfully',
        data,
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

  @Public()
  @Get('category-detail/:id')
  @ApiOperation({ summary: 'Get a web story category by ID' })
  @ApiResponse({ status: 200, description: 'Return the web story category.' })
  async findOneCategory(@Param('id') id: string) {
    try {
      const data = await this.webstoriesService.findOneCategory(id);
      return {
        message: 'Category retrieved successfully',
        data,
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

  @Permissions({ resource: 'web_stories_category', actions: 'update' })
  @Put('update-category/:id')
  @ApiOperation({ summary: 'Update a web story category by ID' })
  @ApiResponse({
    status: 200,
    description: 'The web story category has been updated.',
  })
  async updateCategory(
    @Param('id') id: string,
    @Body() updateWebStoriesCategoryDto: UpdateWebStoriesCategoryDto,
  ) {
    try {
      const data = await this.webstoriesService.updateCategory(
        id,
        updateWebStoriesCategoryDto,
      );
      return {
        message: 'Category updated successfully',
        data,
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

  @Permissions({ resource: 'web_stories_category', actions: 'delete' })
  @Delete('delete-category/:id')
  @ApiOperation({ summary: 'Delete a web story category by ID' })
  @ApiResponse({
    status: 200,
    description: 'The web story category has been deleted.',
  })
  async removeCategory(@Param('id') id: string) {
    try {
      const data = await this.webstoriesService.removeCategory(id);
      return {
        message: 'Category deleted successfully',
        data,
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
  @Permissions({ resource: 'web_stories', actions: 'create' }) //customer page
  @Post('create')
  async create(@Body() createWebStoryDto: CreateWebStoryDto) {
    try {
      const data = await this.webstoriesService.create(createWebStoryDto);
      return {
        message: 'Create web story successfully',
        data,
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

  @Permissions({ resource: 'web_stories', actions: 'update' }) //customer page
  @Put('update/:id')
  async update(
    @Param('id') id: string,
    @Body() createWebStoryDto: CreateWebStoryDto,
  ) {
    try {
      const data = await this.webstoriesService.update(id, createWebStoryDto);
      return {
        message: 'Update an existing web story successfully',
        data,
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

  @Permissions({ resource: 'web_stories', actions: 'read' }) //customer page
  @Get('detail/:id')
  async Detail(@Param('id') id: string) {
    try {
      const data = await this.webstoriesService.Detail(id);
      return {
        message: 'Get Web story details successfully',
        data,
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
}
