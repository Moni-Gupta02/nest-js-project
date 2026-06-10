import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { NotificationMasterService } from './notification_master.service';
import { CreateNotificationMasterDto } from './dto/create-notification_master.dto';
import { UpdateNotificationMasterDto } from './dto/update-notification_master.dto';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { FilterNotificationMasterDto } from './dto/filter.dto';
import { message } from 'src/common/assets';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { Public } from 'src/common/decorators';

@ApiTags('Notification Master')
@Controller('notification-master')
export class NotificationMasterController {
  constructor(
    private readonly notificationMasterService: NotificationMasterService,
  ) {}

  @Public()
  @Post('create')
  async create(
    @Body() createNotificationMasterDto: CreateNotificationMasterDto,
  ) {
    try {
      const result = await this.notificationMasterService.create(
        createNotificationMasterDto,
      );
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
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'type_of_notification', required: false })
  @ApiQuery({ name: 'title', required: false })
  async findAll(
    @Query() filter: FilterNotificationMasterDto,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    try {
      const result = await this.notificationMasterService.findAll(
        filter,
        page,
        limit,
      );
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
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.notificationMasterService.findOne(id);
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
  @Patch('update/:id')
  async update(
    @Param('id') id: string,
    @Body() updateNotificationMasterDto: UpdateNotificationMasterDto,
  ) {
    try {
      const result = await this.notificationMasterService.update(
        id,
        updateNotificationMasterDto,
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
  @Delete('delete/:id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.notificationMasterService.remove(id);
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
