import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { CartService } from './cart.service';
import { AbandonedCartListQueryDto } from './dto/ListQuery.dto';
import { message } from 'src/common/assets';
import { Response as NestResponse } from 'express'; // Import Response from NestJS
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/common/decorators/permission.decorator';

@ApiTags('cart')
@Controller('cart')
@ApiBearerAuth('access-token')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Permissions({ resource: 'abandoned_carts', actions: 'read' })
  @Get('detail/:cart_id')
  @ApiOperation({ summary: 'Get cart details by cart ID' })
  @ApiParam({ name: 'cart_id', description: 'Cart ID', type: String })
  async getCartDetail(@Param('cart_id') cartId: string) {
    try {
      const data = await this.cartService.getCartDetailById(cartId);
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

  @Permissions({ resource: 'abandoned_carts', actions: 'list' })
  @Get('abandoned-list')
  async getAbandonedCartList(
    @Res() res: NestResponse,
    @Query() query: AbandonedCartListQueryDto,
  ) {
    try {
      const {
        startDate,
        endDate,
        page,
        limit,
        search,
        customerType,
        type = 'list',
      } = query;
      if (type == 'list') {
        console.log('inside list', type);
        const result = await this.cartService.getAbandonedCartList(
          startDate,
          endDate,
          page,
          limit,
          search,
          customerType,
          type,
        );

        console.log('result in list', result);
        res.send({
          message: message.ingredient.INGREDIENT_CREATED,
          data: result,
          status: true,
        });
      } else if (type == 'csv') {
        console.log('start date and end date', startDate, endDate);
        const buffer = await this.cartService.getAbandonedCartList(
          startDate,
          endDate,
          page,
          limit,
          search,
          customerType,
          type,
        );

        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader(
          'Content-Disposition',
          'attachment; filename="BreakdownCost Order Report.xlsx"',
        );

        res.send(buffer);
      }
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
}
