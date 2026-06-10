import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Patch,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ActivityRuleService } from './activity-rule.service';
import { CreateActivityRuleDto } from './dto/create-activity-rule.dto';
import { message } from 'src/common/assets';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ValidationError } from 'class-validator';

@ApiTags('Activity Rules')
@ApiBearerAuth('access-token')
@Controller('activity_rules')
export class ActivityRuleController {
  constructor(private readonly activity_rule_service: ActivityRuleService) {}

  @Post()
  async create(@Body() dto: CreateActivityRuleDto) {
    const result = await this.activity_rule_service.create(dto);
    try {
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

  @Get()
  async find_all() {
    const result = await this.activity_rule_service.find_all();
    try {
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

  @Get(':id')
  async find_one(@Param('id') id: string) {
    const result = await this.activity_rule_service.find_one(id);
    try {
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

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: CreateActivityRuleDto) {
    const result = await this.activity_rule_service.update(id, dto);
    try {
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

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const result = await this.activity_rule_service.delete(id);
    try {
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
