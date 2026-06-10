import {
  Controller,
  Get,
  Param,
  Delete,
  Body,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { message } from 'src/common/assets';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ValidationError } from 'class-validator';
import { Public } from 'src/common/decorators';
import { BlogsService } from './blogs.service';
import { CreateBlogTagDto, UpdateBlogTagDto } from './dto/blog-tag.dto';
import {
  CreateBlogCategoryDto,
  UpdateBlogCategoryDto,
} from './dto/blog-category.dto';

@ApiTags('blogs')
@Controller('blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Public()
  @Get('blog-list')
  @ApiOperation({
    summary: 'Retrieve all blogs with pagination, search, and filters',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: true,
    example: 1,
    description: 'Current page number',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: true,
    example: 10,
    description: 'Number of blogs per page',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: false,
    example: 'technology',
    description: 'Search query',
  })
  async findAllBlogs(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
  ) {
    try {
      const data = await this.blogsService.findAllBlogs(page, limit, search);
      return {
        message: message.GET_DETAILS,
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
  @Post('add-blog-tag')
  @ApiOperation({ summary: 'Create a new blog tag' })
  @ApiResponse({ status: 201, description: 'The blog tag has been created.' })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  async createBlogTag(@Body() createBlogTagDto: CreateBlogTagDto) {
    try {
      const data = await this.blogsService.createBlogTag(createBlogTagDto);
      return {
        message: message.GET_DETAILS,
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
  @Get('blog-tag-detail:id')
  @ApiOperation({ summary: 'Get a blog tag by ID' })
  @ApiResponse({ status: 200, description: 'Return the blog tag.' })
  @ApiResponse({ status: 404, description: 'Blog tag not found.' })
  async findOneBlogTag(@Param('id') id: string) {
    try {
      const data = await this.blogsService.findOneBlogTag(id);
      return {
        message: message.GET_DETAILS,
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
  @Get('blog-tag-list')
  @ApiOperation({ summary: 'Get a blog tag by ID' })
  @ApiResponse({ status: 200, description: 'Return the blog tag.' })
  @ApiResponse({ status: 404, description: 'Blog tag not found.' })
  async listBlogTag() {
    try {
      const data = await this.blogsService.listBlogTag();
      return {
        message: message.GET_DETAILS,
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
  @Put('update-blog-tag/:id')
  @ApiOperation({ summary: 'Update a blog tag by ID' })
  @ApiResponse({ status: 200, description: 'The blog tag has been updated.' })
  @ApiResponse({ status: 404, description: 'Blog tag not found.' })
  async updateBlogTag(
    @Param('id') id: string,
    @Body() updateBlogTagDto: UpdateBlogTagDto,
  ) {
    try {
      const data = await this.blogsService.updateBlogTag(id, updateBlogTagDto);
      return {
        message: message.GET_DETAILS,
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
  @Delete('delete-blog-tag/:id')
  @ApiOperation({ summary: 'Delete a blog tag by ID' })
  @ApiResponse({ status: 200, description: 'The blog tag has been deleted.' })
  @ApiResponse({ status: 404, description: 'Blog tag not found.' })
  async removeBlogTag(@Param('id') id: string) {
    try {
      const data = await this.blogsService.removeBlogTag(id);
      return {
        message: message.GET_DETAILS,
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
  @Post('add-blog-category')
  @ApiOperation({ summary: 'Create a new blog category' })
  @ApiResponse({
    status: 201,
    description: 'The blog category has been created.',
  })
  @ApiResponse({ status: 400, description: 'Invalid input.' })
  async createBlogCategory(
    @Body() createBlogCategoryDto: CreateBlogCategoryDto,
  ) {
    try {
      const data = await this.blogsService.createBlogCategory(
        createBlogCategoryDto,
      );
      return {
        message: message.GET_DETAILS,
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
  @Get('blog-category-detail:id')
  @ApiOperation({ summary: 'Get a blog category by ID' })
  @ApiResponse({ status: 200, description: 'Return the blog category.' })
  @ApiResponse({ status: 404, description: 'Blog category not found.' })
  async findOneBlogCategory(@Param('id') id: string) {
    try {
      const data = await this.blogsService.findOneBlogCategory(id);
      return {
        message: message.GET_DETAILS,
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
  @Get('blog-category-list')
  @ApiOperation({ summary: 'Get a blog tag by ID' })
  @ApiResponse({ status: 200, description: 'Return the blog tag.' })
  @ApiResponse({ status: 404, description: 'Blog tag not found.' })
  async listBlogCategory() {
    try {
      const data = await this.blogsService.listBlogCategory();
      return {
        message: message.GET_DETAILS,
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
  @Put('update-blog-category/:id')
  @ApiOperation({ summary: 'Update a blog category by ID' })
  @ApiResponse({
    status: 200,
    description: 'The blog category has been updated.',
  })
  @ApiResponse({ status: 404, description: 'Blog category not found.' })
  async updateBlogCategory(
    @Param('id') id: string,
    @Body() updateBlogCategoryDto: UpdateBlogCategoryDto,
  ) {
    try {
      const data = await this.blogsService.updateBlogCategory(
        id,
        updateBlogCategoryDto,
      );
      return {
        message: message.GET_DETAILS,
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
  @Delete('delete-blog-category/:id')
  @ApiOperation({ summary: 'Delete a blog category by ID' })
  @ApiResponse({
    status: 200,
    description: 'The blog category has been deleted.',
  })
  @ApiResponse({ status: 404, description: 'Blog category not found.' })
  async removeBlogCategory(@Param('id') id: string) {
    try {
      const data = await this.blogsService.removeBlogCategory(id);
      return {
        message: message.GET_DETAILS,
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
