import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Post,
  HttpException,
  Req,
  Query,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import {
  EditAvoidIngredientsDto,
  UpdateSubscriptionDto,
  UpdateSubscriptionFixPriceDto,
} from './dto/update-subscription.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from 'src/common/decorators';
import { message } from 'src/common/assets';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ValidationError } from 'class-validator';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { PartialSubscriptionCancelDto } from './dto/create-subscription.dto';
import {
  AutoSelectionForParticularDto,
  CalculatedMealPriceDto,
  ChangeCategoryDto,
  ChangeMealTypeSubscriptionDto,
  CompleteSubscriptionCancelDto,
  InitiateBagRefundDto,
} from './dto/subscription.dto';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
@ApiTags('subscription')
@ApiBearerAuth('access-token')
@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly adminHistoryService: AdminHistoryService,
  ) { }

  @Public()
  @Get('price-list')
  async findAllSubscriptionPrice() {
    try {
      const data = await this.subscriptionService.findAllSubscriptionPrice();
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

  @Public()
  @Get('fix-price-list')
  async findAllSubscriptionFixPrice() {
    try {
      const data = await this.subscriptionService.findAllSubscriptionFixPrice();
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
  @Permissions({ resource: 'subscription_price', actions: 'read' })
  @Get('price-detail/:id')
  async getPriceDetails(@Param('id') id: string) {
    try {
      const data = await this.subscriptionService.getPriceDetails(id);
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
  @Permissions({ resource: 'subscription_fix_price', actions: 'read' })
  @Get('fix-price-detail/:id')
  async getFixPriceDetails(@Param('id') id: string) {
    try {
      const data = await this.subscriptionService.getFixPriceDetails(id);
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
  @Permissions({ resource: 'subscription_price', actions: 'update' })
  @Patch('update-price/:id')
  async updatePrice(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    try {
      const data = await this.subscriptionService.updatePrice(
        id,
        updateSubscriptionDto,
      );
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
  @Permissions({ resource: 'subscription_fix_price', actions: 'update' })
  @Patch('update-fix-price/:id')
  async updateFixPrice(
    @Param('id') id: string,
    @Body() updateSubscriptionFixPriceDto: UpdateSubscriptionFixPriceDto,
  ) {
    try {
      const data = await this.subscriptionService.updateFixPrice(
        id,
        updateSubscriptionFixPriceDto,
      );
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
  @Public()
  @Delete('price/:id')
  async removePrice(@Param('id') id: string) {
    try {
      const data = await this.subscriptionService.removePrice(id);
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
  @Public()
  @Delete('fix-price/:id')
  async removeFixPrice(@Param('id') id: string) {
    try {
      const data = await this.subscriptionService.removeFixPrice(id);
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
  @Permissions({ resource: 'customers', actions: 'read' })
  @Post('customer-page/partial-cancel')
  @ApiOperation({ summary: 'Partially cancel a subscription' })
  async partialSubscriptionCancel(
    @Body() partialCancelDto: PartialSubscriptionCancelDto,
  ) {
    try {
      const data = await this.subscriptionService.partialSubscriptionCancel(
        partialCancelDto.subscriptionId,
        partialCancelDto.orderId,
        partialCancelDto.startDate,
        partialCancelDto,
      );
      return {
        message: message.GET_DETAILS,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException for the appropriate status code
      }
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'customers', actions: 'read' })
  @Post('auto-selection-for-particular')
  async autoSelectionForParticular(
    @Body() body: AutoSelectionForParticularDto,
  ) {
    return await this.subscriptionService.autoSelectionForParticular(body);
  }

  @Permissions({ resource: 'customers', actions: 'read' }) //customer page
  @Patch('customer-page/edit-avoid-ingredients')
  async editAvoidIngredients(@Body() body: EditAvoidIngredientsDto) {
    try {
      const data = await this.subscriptionService.editAvoidIngredients(body);
      return {
        message: message.UPDATE_SUCCESS,
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException for the appropriate status code
      }
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'customers', actions: 'read' }) //customer page
  @Patch('customer-page/change-category')
  async changeCategory(
    @Req() request: Request,
    @Body() body: ChangeCategoryDto,
  ) {
    try {
      const user = request['user'];
      console.log('body in api', body);
      const data = await this.subscriptionService.changeCategory(body);
      await this.adminHistoryService.createAdminHistory(
        'ORDER_MEAL_PLAN_EDIT',
        user,
        body?.customer_id,

        data?.historyDetails?.before,
        data?.historyDetails?.after,
        {
          customer_id: body?.customer_id,
          order_number: body?.order_number,
          order_id: body?.order_id,
        },
      );
      return {
        message: 'Change category successfully',
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException for the appropriate status code
      }
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Public()
  @Get('customer-page/diet-plan-mandatory-meals')
  getDietPlanMandatoryMeals(@Query('protein_category') proteinCategory?: string) {
    return {
      status: true,
      message: message.GET_DETAILS,
      data: this.subscriptionService.getDietPlanMandatoryMealsConfig(
        proteinCategory,
      ),
    };
  }

  @Public()
  @Patch('customer-page/calculated-price')
  async getCalculatedPrice(@Body() body: CalculatedMealPriceDto) {
    try {
      const data = await this.subscriptionService.getCalculatedPrice(body);

      return {
        message: 'Price Calculated Sucessfully!',
        data: data,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException for the appropriate status code
      }
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'customers', actions: 'read' }) //customer page
  @Post('customer-page/complete-subscription-cancel')
  @ApiOperation({ summary: 'Cancel a subscription and handle related updates' })
  async completeSubscriptionCancel(
    @Body() body: CompleteSubscriptionCancelDto,
  ) {
    try {
      const response =
        await this.subscriptionService.completeSubscriptionCancel(body);
      return {
        message: 'Subscription cancelled successfully!',
        status: true,
        data: response,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException for the appropriate status code
      }
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Permissions({ resource: 'customers', actions: 'read' }) //customer page
  @Post('customer-page/change-plan')
  async changeMealType(
    @Req() request: Request,
    @Body() changeMealTypeDto: ChangeMealTypeSubscriptionDto,
  ) {
    try {
      const user = request['user'];
      const result =
        await this.subscriptionService.changeMealTypeSubscription(
          changeMealTypeDto,
        );
      await this.adminHistoryService.createAdminHistory(
        'ORDER_MEAL_PLAN_EDIT',
        user,
        changeMealTypeDto?.customer_id,
        result?.historyChanges?.before,
        result?.historyChanges?.after,
        {
          customer_id: changeMealTypeDto?.customer_id,
          order_number: changeMealTypeDto?.order_number,
          order_id: changeMealTypeDto?.order_id,
        },
      );
      return {
        message: 'Subscription meal type updated successfully',
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException for the appropriate status code
      }
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'customers', actions: 'read' }) //customer page
  @Post('customer-page/initiate-bag-refund')
  async initiateBagRefund(@Body() dto: InitiateBagRefundDto) {
    try {
      const result = await this.subscriptionService.initiateBagRefund(dto);

      return {
        message: 'Subscription meal type updated successfully',
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException for the appropriate status code
      }
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'customers', actions: 'read' }) //customer page
  @Post('customer-page/check-bag-deposit')
  async checkBagDeposit(@Body() dto: InitiateBagRefundDto) {
    try {
      const result = await this.subscriptionService.checkBagDeposit(dto);

      return {
        message: 'Subscription meal type updated successfully',
        data: result,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error; // Re-throw HttpException for the appropriate status code
      }
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
}
