import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Post,
  Req,
} from '@nestjs/common';
import { AddressService } from './address.service';
import {
  CustomerAddressDeleteDto,
  UpdateAddressDto,
} from './dto/update-address.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ValidationError } from 'class-validator';
import { message } from 'src/common/assets';
import { FindAllAddressesDto } from './dto/filter-address.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { CreateAddressDto } from './dto/create-address.dto';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';

@ApiTags('Addresses')
@Controller('addresses')
@ApiBearerAuth('access-token')
export class AddressController {
  constructor(
    private readonly addressService: AddressService,
    private readonly adminHistoryService: AdminHistoryService,
  ) {}

  @Public()
  @Get('list')
  @ApiOperation({ summary: 'Retrieve all addresses' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved addresses' })
  async findAll(@Query() filterDto: FindAllAddressesDto) {
    try {
      const result = await this.addressService.findAll(filterDto);
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
  @Permissions({ resource: 'Customer_page_details', actions: 'update' })
  @Post('create')
  async create(@Req() request: Request, @Body() data: CreateAddressDto) {
    try {
      const user = request['user'];
      const result = await this.addressService.create(data);
      await this.adminHistoryService.createAdminHistory(
        'CUSTOMER_ADDRESS_CREATE',
        user,
        data.customer_id,
        {},
        data,
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
  @Public()
  @Get('detail/:id')
  @ApiOperation({ summary: 'Get a specific address by ID' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved address' })
  async findOne(@Param('id') id: string) {
    try {
      const result = await this.addressService.findOne(id);
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

  @Permissions({ resource: 'Customer_page_details', actions: 'update' })
  @Patch('update/:id') // customer page
  @ApiOperation({ summary: 'Update an address by ID' })
  @ApiResponse({ status: 200, description: 'Successfully updated address' })
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    try {
      const user = request['user'];
      const result = await this.addressService.update(id, updateAddressDto);
      if (
        !(
          Object.keys(result.before_changes).length === 0 &&
          Object.keys(result.before_changes).length === 0
        )
      ) {
        result.before_changes.address_id = id?.toString();
        result.current_changes.address_id = id?.toString();
        await this.adminHistoryService.createAdminHistory(
          'CUSTOMER_ADDRESS_UPDATE',
          user,
          updateAddressDto.customer_id,
          result.before_changes,
          result.current_changes,
        );
      }
      return {
        message: 'Updated address successfully ',
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

  @Public()
  @Delete('delete/:id')
  @ApiOperation({ summary: 'Delete an address by ID' })
  @ApiResponse({ status: 200, description: 'Successfully deleted address' })
  async remove(@Req() request: Request, @Param('id') id: string) {
    try {
      const result: any = await this.addressService.remove(id);
      const before_changes = {
        address_id: result?._id || '',
        customer_id: result?.customer_id || '',
        address_type: result?.address_type || '',
        full_address: result?.full_address || '',
        city: result?.city || '',
        province: result?.province || '',
        country: result?.country || '',
      };
      const user = request['user'];
      await this.adminHistoryService.createAdminHistory(
        'CUSTOMER_ADDRESS_DELETE',
        user,
        result.customer_id,
        before_changes,
        {},
      );
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

  @ApiBearerAuth('access-token')
  @Permissions({ resource: 'Customer_page_details', actions: 'read' })
  @Get('customer-page/by-customer-id/:id') //customer page
  @ApiOperation({ summary: 'Retrieve all addresses' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved addresses' })
  async findCustomerAddress(@Param('id') customerId: string) {
    try {
      const result = await this.addressService.findCustomerAddress(customerId);
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

  @Permissions({ resource: 'Customer_page_details', actions: 'update' })
  @Post('delete-and-replace')
  @ApiBody({ type: CustomerAddressDeleteDto })
  async deleteAddress(
    @Req() request: Request,
    @Body() body: CustomerAddressDeleteDto,
  ) {
    try {
      const user = request['user'];

      const result =
        await this.addressService.customerAddressDeleteAndReplace(body);
      await this.adminHistoryService.createAdminHistory(
        'CUSTOMER_ADDRESS_DELETE_AND_REPLACE',
        user,
        body.customer_id,
        result?.before_changes,
        result?.after_changes,
        {},
      );
      return {
        message: 'Delete address successfully',
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
