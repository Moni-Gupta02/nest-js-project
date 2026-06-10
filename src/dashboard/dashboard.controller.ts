import {
  BadRequestException,
  Controller,
  Get,
  Query,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/common/decorators/permission.decorator';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }


  @Permissions({ resource: 'Dashboard', actions: 'read' })
  @Get('overall')
  getOverall(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.runWithDates(startDate, endDate, (s, e) =>
      this.dashboardService.getOverall(s, e),
    );
  }

  @Permissions({ resource: 'Dashboard', actions: 'read' })
  @Get('auto-selection')
  getAutoSelection(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.runWithDates(startDate, endDate, (s, e) =>
      this.dashboardService.getAutoSelection(s, e),
    );
  }

  @Permissions({ resource: 'Dashboard', actions: 'read' })
  @Get('cancellations')
  getCancellations(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.runWithDates(startDate, endDate, (s, e) =>
      this.dashboardService.getCancellations(s, e),
    );
  }

  @Permissions({ resource: 'Dashboard', actions: 'read' })
  @Get('order-device-analytics')
  getOrderDeviceAnalytics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.runWithDates(startDate, endDate, (s, e) =>
      this.dashboardService.getOrderDeviceAnalytics(s, e),
    );
  }

  @Permissions({ resource: 'Dashboard', actions: 'read' })
  @Get('order-charts')
  getOrderCharts(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('type') type?: string,
    @Query('diff') diff?: string,
  ) {
    return this.runWithDates(startDate, endDate, (s, e) =>
      this.dashboardService.getOrderCharts(s, e, type, diff),
    );
  }

  private async runWithDates<T>(
    startDate: string,
    endDate: string,
    fn: (startDate: string, endDate: string) => Promise<T>,
  ): Promise<T> {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate query params are required');
    }
    try {
      return await fn(startDate, endDate);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Dashboard request failed';
      throw new BadRequestException(message);
    }
  }
}
