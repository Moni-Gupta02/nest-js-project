import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { DriverService } from './driver.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators';
import { DriverBarcodeQueryDto } from './dto/barcode.dto';
import * as moment from 'moment';
import { Permissions } from 'src/common/decorators/permission.decorator';

@ApiTags('Driver - Barcode Reports')
@ApiBearerAuth('access-token')
@Controller('driver')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  /**
   * Legacy endpoint - Returns raw delivery data (unchanged)
   */
  @Permissions({ resource: 'menu_live', actions: 'list' })
  @Get('barcode-report')
  @ApiOperation({
    summary: 'Generate Customer or Item Barcode CSV Report',
    description:
      'Generate barcode reports for driver delivery operations matching AdminJS BarcodeReportZ functionality.',
  })
  @ApiQuery({
    name: 'date',
    description: 'Date (YYYY-MM-DD)',
    example: '2026-01-13',
    required: true,
  })
  @ApiQuery({
    name: 'phase',
    enum: ['Batch1', 'MP', 'NDD'],
    example: 'Batch1',
    required: true,
  })
  @ApiQuery({
    name: 'type',
    enum: ['customer', 'item'],
    example: 'customer',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Barcode report generated successfully',
    schema: {
      example: {
        csvData: [{ one: 'C001', three: 'John Doe' /* ... */ }],
        filename: 'Barcode_Report_Customer_Level(13th Jan 2026)(Batch1).csv',
        totalRecords: 150,
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input parameters',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No data found for given date/phase',
  })
  async getBarcodeReport(@Query() dto: DriverBarcodeQueryDto) {
    return this.driverService.generateBarcodeReport(dto);
  }
  @Permissions({ resource: 'menu_live', actions: 'list' })
  @Get('barcode-report-excel')
  @ApiOperation({
    summary: 'Download Customer or Item Barcode Excel Report',
    description:
      'Download barcode reports as Excel file for driver delivery operations.',
  })
  @ApiQuery({
    name: 'date',
    description: 'Date (YYYY-MM-DD)',
    example: '2026-01-13',
    required: true,
  })
  @ApiQuery({
    name: 'phase',
    enum: ['Batch1', 'MP', 'NDD'],
    example: 'Batch1',
    required: true,
  })
  @ApiQuery({
    name: 'type',
    enum: ['customer', 'item'],
    example: 'customer',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Excel file downloaded successfully',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input parameters',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No data found for given date/phase',
  })
  async downloadBarcodeReportExcel(
    @Query() dto: DriverBarcodeQueryDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.driverService.downloadBarcodeReportExcel(dto);
      const dateFormatted = moment(dto.date).format('Do MMM YYYY');
      const filename =
        dto.type === 'customer'
          ? `Barcode_Report_Customer_Level(${dateFormatted})(${dto.phase}).xlsx`
          : `Barcode_Report_Item_Level(${dateFormatted})(${dto.phase}).xlsx`;

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.send(buffer);
    } catch (error) {
      throw error;
    }
  }
}
