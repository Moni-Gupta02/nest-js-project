import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Req,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { FindAllCustomersDto } from './dto/list-customer.dto';
import { Public } from 'src/common/decorators';
import { message } from 'src/common/assets';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';

@ApiTags('Customer')
@Controller('customer')
@ApiBearerAuth('access-token')
export class CustomerController {
  constructor(
    private readonly customerService: CustomerService,
    private readonly adminHistoryService: AdminHistoryService,
  ) {}

  @Public()
  @Post()
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    try {
      const result = await this.customerService.create(createCustomerDto);
      return {
        message: message.customers.CUSTOMER_LIST_FETCH,
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

  @Permissions({ resource: 'customers', actions: 'list' })
  @Get('list')
  async findAll(@Query() findAllCustomersDto: FindAllCustomersDto) {
    try {
      const { no_of_items } = findAllCustomersDto;

      // Normalize no_of_items if needed
      const normalizedItems =
        typeof no_of_items === 'string' ? [no_of_items] : no_of_items;
      const result = await this.customerService.findAll({
        ...findAllCustomersDto,
        no_of_items: normalizedItems,
      });
      return {
        message: message.customers.CUSTOMER_LIST_FETCH,
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

  @Permissions({ resource: 'customers', actions: 'read' })
  @Get('customer-page/detail/:id') //customer page
  async getCustomerById(@Param('id') id: string) {
    try {
      const result = await this.customerService.findCustomerById(id);
      return {
        message: message.customers.CUSTOMER_LIST_FETCH,
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
  @Permissions({ resource: 'Customer_page_details', actions: 'update' })
  @Patch('customer-page/edit/:id') //customer page
  @ApiOperation({ summary: 'Update customer details' })
  @ApiParam({ name: 'id', description: 'Customer ID', type: String })
  async updateCustomer(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    try {
      const user = request['user'];
      const updatedCustomer = await this.customerService.updateCustomer(
        id,
        updateCustomerDto,
      );
      console.log(updatedCustomer);
      if (updatedCustomer?.before_changes) {
        await this.adminHistoryService.createAdminHistory(
          'CUSTOMER_DETAIL_UPDATE',
          user,
          id,
          updatedCustomer.before_changes,
          updatedCustomer.current_changes,
        );
      }
      return {
        message: 'Update user details successfully',
        data: updatedCustomer,
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
