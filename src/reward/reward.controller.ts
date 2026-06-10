import { Controller, Post, Body } from '@nestjs/common';
import { RewardService } from './reward.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ValidationError } from 'class-validator';
import { message } from 'src/common/assets';
import {
  CreateRewardDto,
  RemoveRewardDto,
  RewardHistoryDto,
} from './dto/reward.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';

@ApiTags('Reward')
@ApiBearerAuth('access-token')
@Controller('reward')
export class RewardController {
  constructor(private readonly rewardService: RewardService) {}

  @Permissions({ resource: 'customers', actions: 'read' }) //customer page
  @Post('history')
  async getRewardHistory(@Body() rewardHistoryDto: RewardHistoryDto) {
    try {
      const { customerId, page = 1, limit = 500 } = rewardHistoryDto;

      const result = await this.rewardService.getRewardHistory(
        customerId,
        page,
        limit,
      );
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

  @Permissions({ resource: 'Customer_page_details', actions: 'update' }) //customer page
  @Post('add')
  async addReward(@Body() addRewardDto: CreateRewardDto) {
    try {
      const result = await this.rewardService.addReward(
        addRewardDto.customerId,
        addRewardDto.addedRewards,
        addRewardDto.loyaltyBenefits,
      );
      return {
        message: message.CREATE_SUCCESS,
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

  @Permissions({ resource: 'Customer_page_details', actions: 'update' }) //customer page
  @Post('remove')
  async removeReward(@Body() removeRewardDto: RemoveRewardDto) {
    try {
      const result = await this.rewardService.removeReward(removeRewardDto);
      return {
        message: message.DELETE_SUCCESS,
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
}
