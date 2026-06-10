import { Controller, Get, Query } from '@nestjs/common';
import { DeliverFinanceReportsService } from './deliver-finance-reports.service';
import { ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Permissions } from 'src/common/decorators/permission.decorator';
@ApiBearerAuth('access-token')
@Controller('deliver-finance')
export class DeliverFinanceReportsController {
  constructor(private readonly deliverService: DeliverFinanceReportsService) { }
  @Permissions({ resource: 'finance_report', actions: 'read' })
  @Get('reports/manual')
  async getDeliveryFInanceReportManual(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.deliverService.getDeliveryFinanceReportManual(
      startDate,
      endDate,
    );
  }

  @Permissions({ resource: 'phone_sales_lead', actions: 'read' })
  @Get('abandoned-cart/dashboard')
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getAbandonedCartDashboard(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return await this.deliverService.getAbandonedCartDashboard(
      startDate,
      endDate,
    );
  }

  @Permissions({ resource: 'phone_sales_lead', actions: 'read' })
  @Get('abandoned-cart/list')
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'stage_code', required: false, type: String })
  @ApiQuery({ name: 'sub_stage', required: false, type: String })
  async getAbandonedCartList(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('stage_code') stage_code?: string,
    @Query('sub_stage') sub_stage?: string,
  ) {
    return await this.deliverService.getAbandonedCartList(
      startDate,
      endDate,
      page,
      limit,
      sub_stage,
      stage_code,
    );
  }

  @Permissions({ resource: 'cx_leads', actions: 'read' })
  @Get('abandoned-cart/mql-list')
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  @ApiQuery({ name: 'sub_stage', required: false, type: String })
  async getAbandonedCartMqlList(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sub_stage') sub_stage?: string,
  ) {
    return await this.deliverService.getAbandonedCartMqlList(
      startDate,
      endDate,
      page,
      limit,
      sub_stage,
    );
  }

  @Permissions({ resource: 'phone_sales_lead', actions: 'read' })
  @Get('abandoned-cart/converted-leads')
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  @ApiQuery({ name: 'page', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: String })
  async getConvertedLeadsWithCustomerDetails(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return await this.deliverService.getConvertedLeadsWithCustomerDetails(
      startDate,
      endDate,
      page,
      limit,
    );
  }
}
