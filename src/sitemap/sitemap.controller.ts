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
import { SitemapService } from './sitemap.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ValidationError } from 'class-validator';
import { message } from 'src/common/assets';
import { Public } from 'src/common/decorators';
import { CreateSiteMapDto } from './dto/create-sitemap.dto';
import { UpdateSiteMapDto } from './dto/update-sitemap.dto';

@ApiTags('sitemap')
@Controller('sitemap')
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}
  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a sitemap URL' })
  @ApiResponse({
    status: 201,
    description: 'The sitemap URL has been successfully created.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  async create(@Body() createSiteMapDto: CreateSiteMapDto) {
    try {
      const data = this.sitemapService.create(createSiteMapDto);

      return {
        message: message.CREATE_SUCCESS,
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
  @Get()
  @ApiOperation({ summary: 'Retrieve all sitemap URLs' })
  @ApiResponse({ status: 200, description: 'List of all sitemap URLs.' })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    example: 1,
    description: 'Current page number',
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
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
  async findAll(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('search') search?: string,
  ) {
    try {
      const data = await this.sitemapService.findAll(page, limit, search);

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
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a sitemap URL by ID' })
  @ApiResponse({ status: 200, description: 'Sitemap URL found.' })
  @ApiResponse({ status: 404, description: 'Sitemap URL not found.' })
  async findOne(@Param('id') id: string) {
    try {
      const data = await this.sitemapService.findOne(id);

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
  @Put(':id')
  @ApiOperation({ summary: 'Update a sitemap URL by ID' })
  @ApiResponse({
    status: 200,
    description: 'The sitemap URL has been successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Sitemap URL not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateSiteMapDto: UpdateSiteMapDto,
  ) {
    try {
      const data = await this.sitemapService.update(id, updateSiteMapDto);

      return {
        message: message.UPDATE_SUCCESS,
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
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a sitemap URL by ID' })
  @ApiResponse({
    status: 204,
    description: 'The sitemap URL has been successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Sitemap URL not found.' })
  async remove(@Param('id') id: string) {
    try {
      const data = await this.sitemapService.remove(id);

      return {
        message: message.DELETE_SUCCESS,
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
