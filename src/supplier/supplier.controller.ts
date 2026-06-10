import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UsePipes,
  ValidationPipe,
  Query,
  Req,
} from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { message } from 'src/common/assets';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ValidationError } from 'class-validator';
import { HistoryService } from 'src/history/history.service';
import { OptionalListFilterDto } from 'src/common/dto/filter.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';

@ApiTags('Supplier')
@ApiBearerAuth('access-token')
@Controller('Supplier')
export class SupplierController {
  constructor(
    public readonly supplierService: SupplierService,
    private readonly historyService: HistoryService,
  ) {}

  // @ApiConsumes('multipart/form-data')
  @Post('create')
  @Permissions({ resource: 'supplier', actions: 'create' })
  async create(
    @Req() request: Request,
    @Body() createSupplierDto: CreateSupplierDto,
  ) {
    try {
      const user = request['user'];

      const createdSupplier =
        await this.supplierService.create(createSupplierDto);
      await this.historyService.createHistory(
        user?._id,
        createdSupplier?._id,
        'supplier',
        message.history.HISTORY_CREATED,
        null,
        createSupplierDto,
      );
      return {
        status: true,
        message: message.supplier.SUPPLIER_CREATED,
        data: createdSupplier,
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Get('list')
  @Permissions({ resource: 'public', actions: 'read' })
  async findAll(@Query() supplierDto: OptionalListFilterDto) {
    const getAllSupplier = await this.supplierService.findAll(
      supplierDto.search,
      supplierDto.page,
      supplierDto.limit,
      supplierDto.sort,
      supplierDto.order,
    );
    return {
      status: true,
      message: message.supplier.SUPPLIER_LIST,
      data: getAllSupplier,
    };
  }
  @Get('supplier-detail/:id')
  @Permissions({ resource: 'public', actions: 'read' })
  async findOne(@Param('id') id: string) {
    const getSupplier = await this.supplierService.findOne(id);
    return {
      status: true,
      message: message.supplier.SUPPLIER_LIST,
      data: getSupplier,
    };
  }
  @UsePipes(new ValidationPipe({ transform: true })) // Apply validation pipe
  @Patch('update/:id')
  @Permissions({ resource: 'supplier', actions: 'update' })
  async update(
    @Req() request: Request,

    @Param('id') id: string,
    @Body() UpdateSupplierDto: UpdateSupplierDto,
  ) {
    const user = request['user'];

    const updateSupplier = await this.supplierService.update(
      id,
      UpdateSupplierDto,
    );

    await this.historyService.createHistory(
      user._id,
      id,
      'supplier',
      message.history.HISTORY_UPDATE,
      updateSupplier.before_changes,
      updateSupplier.current_changes,
    );
    return {
      status: true,
      message: message.supplier.SUPPLIER_UPDATED,
      data: updateSupplier,
    };
  }
  @Delete('delete/:id')
  @Permissions({ resource: 'supplier', actions: 'delete' })
  async remove(@Param('id') id: string) {
    const deleteSupplier = await this.supplierService.remove(id);
    return {
      status: true,
      message: message.supplier.SUPPLIER_DELETED,
      data: deleteSupplier,
    };
  }
}
