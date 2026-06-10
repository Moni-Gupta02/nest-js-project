import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { ListLeadsDto } from './dto/list-lead.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { UpdateLeadDto } from './dto/update-lead.dto';

@ApiTags('Leads')
@Controller('leads')
@ApiBearerAuth('access-token')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Permissions({ resource: 'leads', actions: 'create' })
  @Post('create')
  async createLead(@Body() createLeadDto: CreateLeadDto) {
    try {
      const data = await this.leadsService.createLead(createLeadDto);
      return {
        message: 'Lead successfully created',
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

  @Patch('update/:id')
  @Permissions({ resource: 'leads', actions: 'update' })
  @ApiOperation({ summary: 'Update an existing lead' })
  async updateLead(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
  ) {
    try {
      const data = await this.leadsService.updateLead(id, updateLeadDto);
      return {
        message: 'Lead updated successfully',
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
  @Permissions({ resource: 'leads', actions: 'list' })
  @Get('list')
  @ApiOperation({
    summary: 'List all leads with pagination, search, and date range filter',
  })
  async listLeads(@Query() query: ListLeadsDto) {
    try {
      const { page, limit, search, startDate, endDate } = query;

      const data = await this.leadsService.listLeads(
        +page,
        +limit,
        search,
        startDate,
        endDate,
      );
      return {
        message: 'Get leads successfully',
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
  @Permissions({ resource: 'leads', actions: 'read' })
  @Get('details/:id')
  @ApiOperation({
    summary: 'List all leads with pagination, search, and date range filter',
  })
  async leadsDetails(@Param('id') id: string) {
    try {
      const data = await this.leadsService.leadsDetails(id);
      return {
        message: 'Lead details Get successfully',
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

  @Permissions({ resource: 'leads', actions: 'delete' })
  @Delete('delete/:id')
  @ApiOperation({ summary: 'Delete a lead by ID' })
  async deleteLead(@Param('id') id: string) {
    try {
      const data = await this.leadsService.deleteLead(id);
      return {
        message: 'Lead deleted successfully',
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
