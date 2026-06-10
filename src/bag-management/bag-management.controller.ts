import { Controller, Get, Query } from '@nestjs/common';
import { BagManagementService } from './bag-management.service';
import { QueryBagManagementDto } from './dto/bag-management.dto';
import { ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { message } from 'src/common/assets';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ValidationError } from 'class-validator';
import { Public } from 'src/common/decorators';

@ApiTags('bag-management')
@Controller('bag-management')
export class BagManagementController {
  constructor(private readonly bagManagementService: BagManagementService) {}
  @Get('live-status')
  @Public()
  @ApiQuery({ name: 'bag_code', required: false })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['In Store', 'Dispatched'],
  })
  @ApiQuery({ name: 'bag_status', required: false, enum: ['Ok', 'Damaged'] })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'List of bags with pagination.' })
  async findAll(@Query() query: QueryBagManagementDto) {
    try {
      const data = await this.bagManagementService.findAll(query);
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
}
