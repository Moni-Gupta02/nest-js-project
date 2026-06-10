import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { NewsletterService } from './newsletter.service';
import { SearchListQueryDto } from 'src/common/dto/filter.dto';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ValidationError } from 'class-validator';
import { message } from 'src/common/assets';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/common/decorators/permission.decorator';

@ApiTags('News Letters')
@Controller('newsletter')
@ApiBearerAuth('access-token')
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Permissions({ resource: 'news_letter', actions: 'list' })
  @Get('list')
  async findAll(@Query() paginationDto: SearchListQueryDto) {
    try {
      const { search, page = 1, limit = 10 } = paginationDto;
      const data = await this.newsletterService.findAll(page, limit, search);
      return {
        message: message.GET_DETAILS,
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

  @Permissions({ resource: 'news_letter', actions: 'delete' })
  @Delete('delete/:id')
  async delete(@Param('id') id: string) {
    try {
      const data = await this.newsletterService.delete(id);
      return {
        message: message.DELETE_SUCCESS,
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
}
