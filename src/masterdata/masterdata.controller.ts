import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  Query,
  Req,
} from '@nestjs/common';
import { MasterdataService } from './masterdata.service';
import { CreateMasterdatumDto } from './dto/create-masterdatum.dto';
import {
  CreateMasterdataCouponDto,
  UpdateMasterdataCouponDto,
} from './dto/create-single-masterdatum.dto';
import { UpdateMasterdatumDto } from './dto/update-masterdatum.dto';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { DeleteMasterdatumDto } from './dto/delete-masterdatum.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { Public } from 'src/common/decorators';
import { HistoryService } from 'src/history/history.service';
import { message } from 'src/common/assets';

@ApiBearerAuth('access-token')
@ApiTags('Master Data')
@Controller(['masterdata', 'master-data'])
export class MasterdataController {
  constructor(
    private readonly masterdataService: MasterdataService,
    private readonly historyService: HistoryService,
  ) {}

  @Post('create')
  @Permissions({ resource: 'masterdata', actions: 'create' })
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async create(
    @Req() request: Request,
    @Body(ValidationPipe) createMasterdatumDto: CreateMasterdatumDto,
  ) {
    const user = request['user'];
    const data = await this.masterdataService.create(createMasterdatumDto);
    await this.historyService.createHistory(
      user._id,
      data?.data?._id,
      'ingredient',
      message.history.HISTORY_CREATED,
      null,
      createMasterdatumDto,
    );
    return data;
  }

  @Post('coupon/create')
  @Permissions({ resource: 'coupon_offer', actions: 'create' })
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async createCoupon(
    @Body(new ValidationPipe({ transform: true }))
    dto: CreateMasterdataCouponDto,
  ) {
    return this.masterdataService.createCoupon(dto);
  }

  @Patch('coupon/update/:id')
  @Permissions({ resource: 'coupon_offer', actions: 'update' })
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async updateCoupon(
    @Param('id') id: string,
    @Body(new ValidationPipe({ transform: true }))
    dto: UpdateMasterdataCouponDto,
  ) {
    return this.masterdataService.updateCoupon(id, dto);
  }

  @Get('coupon/list')
  @Permissions({ resource: 'coupon_offer', actions: 'list' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by discountCode (case-insensitive)',
  })
  @ApiQuery({
    name: 'type_of_customer',
    required: false,
    description: 'Filter by customer type (new / re-new)',
  })
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async listCoupons(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('type_of_customer') typeOfCustomer?: string,
  ) {
    return this.masterdataService.listCoupons(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
      search,
      typeOfCustomer,
    );
  }

  @Get('coupon/:id')
  @Permissions({ resource: 'coupon_offer', actions: 'read' })
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async getCouponById(@Param('id') id: string) {
    return this.masterdataService.getCouponById(id);
  }

  @Delete('coupon/delete/:id')
  @Permissions({ resource: 'coupon_offer', actions: 'delete' })
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async deleteCoupon(@Param('id') id: string) {
    return this.masterdataService.deleteCoupon(id);
  }

  @Public()
  @Get('get-ingredient')
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async getAllIngredient() {
    return this.masterdataService.getAllIngredientResponse();
  }

  @Public()
  @Get('list')
  // @Permissions({ resource: 'masterdata', actions: 'list' })
  // @Permissions({ resource: 'masterdata', actions: 'list' })
  @ApiQuery({ name: 'key', required: false }) // Make 'key' parameter optional
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  findAll(@Query('key') key?: string) {
    return this.masterdataService.findAll(key);
  }

  @Get('list/:key')
  @Public()

  // @Permissions({ resource: 'masterdata', actions: 'read' })
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  findOne(@Param('key') key: string) {
    return this.masterdataService.findOne(key);
  }

  @Patch('update/:key')
  @Permissions({ resource: 'masterdata', actions: 'update' })
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  update(
    @Param('key') key: string,
    @Body(ValidationPipe) updateMasterdatumDto: UpdateMasterdatumDto,
  ) {
    return this.masterdataService.update(key, updateMasterdatumDto);
  }

  //
  // @Delete(':key')
  // @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  // remove(@Param('key') key: string) {
  //   return this.masterdataService.remove(key);
  // }

  @Delete('delete/:key')
  @Permissions({ resource: 'masterdata', actions: 'delete' })
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  delete(
    @Param('key') key: string,
    @Body(ValidationPipe) deleteMasterdatumDto: DeleteMasterdatumDto,
  ) {
    return this.masterdataService.delete(key, deleteMasterdatumDto);
  }
}
