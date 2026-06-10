import { Controller, Get, Param, Delete, Query } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { FilterLoggerDto } from './dto/filter-logger.dto';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { message } from 'src/common/assets';
import { Public } from 'src/common/decorators';

@ApiTags('Logger')
@Controller('logger')
export class LoggerController {
  constructor(private readonly loggerService: LoggerService) {}
  @Public()
  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'fromDate', required: false, example: '2024-10-01' })
  @ApiQuery({ name: 'toDate', required: false, example: '2024-10-03' })
  @ApiQuery({ name: 'requestMethod', required: false })
  @ApiQuery({ name: 'clientIp', required: false })
  @ApiQuery({ name: 'requestUrl', required: false })
  async findAll(
    @Query() filter: FilterLoggerDto,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    try {
      const result = await this.loggerService.findAll(filter, page, limit);
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
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.loggerService.findOne(id);
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
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.loggerService.remove(+id);
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
