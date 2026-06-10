import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Put,
} from '@nestjs/common';
import { FaqService } from './faq.service';
import { CreateFAQDto, UpdateFAQDto } from './dto/faq.dto';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CreateFAQCategoryDto,
  UpdateFAQCategoryDto,
} from './dto/faq-category.dto';
import { Public } from 'src/common/decorators';
import { message } from 'src/common/assets';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ListQueryDto } from './dto/filter.dto';

@ApiTags('FAQ')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Public()
  @Post('create')
  @ApiOperation({ summary: 'Create a new FAQ' })
  async createFaq(@Body() createFAQDto: CreateFAQDto) {
    try {
      const result = await this.faqService.createFaq(createFAQDto);

      return {
        message: message.CREATE_SUCCESS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Public()
  @Get('list')
  async findAllFaq(@Query() query: ListQueryDto) {
    try {
      const { page, limit, search } = query;

      const result = await this.faqService.findAllFaq(search, page, limit);

      return {
        message: message.GET_DETAILS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Public()
  @Get('details/:id')
  @ApiOperation({ summary: 'Get a specific FAQ' })
  async findOneFaq(@Param('id') id: string) {
    try {
      const result = await this.faqService.findOneFaq(id);

      return {
        message: message.GET_DETAILS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Public()
  @Put('update/:id')
  @ApiOperation({ summary: 'Update an FAQ' })
  async updateFaq(@Param('id') id: string, @Body() updateFAQDto: UpdateFAQDto) {
    try {
      const result = await this.faqService.updateFaq(id, updateFAQDto);

      return {
        message: message.UPDATE_SUCCESS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Public()
  @Delete('delete/:id')
  @ApiOperation({ summary: 'Delete an FAQ' })
  async deleteFaq(@Param('id') id: string) {
    try {
      const result = await this.faqService.deleteFaq(id);

      return {
        message: message.DELETE_SUCCESS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Public()
  @Post('category/create')
  @ApiOperation({ summary: 'Create a new FAQ category' })
  async createFaqCategory(@Body() createFAQCategoryDto: CreateFAQCategoryDto) {
    try {
      const result =
        await this.faqService.createFaqCategory(createFAQCategoryDto);

      return {
        message: message.CREATE_SUCCESS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Public()
  @Get('category/list')
  async findAllFaqCategory(@Query() query: ListQueryDto) {
    try {
      const { search } = query;
      const result = await this.faqService.findAllFaqCategory(search);

      return {
        message: message.GET_DETAILS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Public()
  @Get('category/details/:id')
  @ApiOperation({ summary: 'Get a specific FAQ category' })
  async findOneFaqCategory(@Param('id') id: string) {
    try {
      const result = await this.faqService.findOneFaqCategory(id);

      return {
        message: message.GET_DETAILS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Public()
  @Put('category/update/:id')
  @ApiOperation({ summary: 'Update a FAQ category' })
  async updateFaqCategory(
    @Param('id') id: string,
    @Body() updateFAQCategoryDto: UpdateFAQCategoryDto,
  ) {
    try {
      const result = await this.faqService.updateFaqCategory(
        id,
        updateFAQCategoryDto,
      );

      return {
        message: message.UPDATE_SUCCESS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Public()
  @Delete('category/delete/:id')
  @ApiOperation({ summary: 'Delete a FAQ category' })
  async deleteFaqCategory(@Param('id') id: string) {
    try {
      const result = await this.faqService.deleteFaqCategory(id);

      return {
        message: message.DELETE_SUCCESS,
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
}
