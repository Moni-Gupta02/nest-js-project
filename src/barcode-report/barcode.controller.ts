import { Body, Controller, Get, Patch, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { BarcodeReportService } from './barcode-report.service';
import { BarcodeReportDto, BarcodeReportQueryDto } from './dto/barcode.dto';
// import { Public } from '../common/decorators';

// @Public()
@Controller('barcode-report')
export class BarcodeReportController {
  constructor(private readonly service: BarcodeReportService) { }

  @Get('customer-csv')
  async downloadCustomerCsv(
    @Query() dto: BarcodeReportDto,
    @Res({ passthrough: false }) res: Response,
  ) {
    const result = await this.service.downloadCustomerBarcodeCsv(dto);

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-cache',
    });

    return res.status(200).send(result.csv);
  }

  @Get('item-csv')
  async downloadItemCsv(
    @Query() dto: BarcodeReportDto,
    @Res({ passthrough: false }) res: Response,
  ) {
    const result = await this.service.downloadItemBarcodeCsv(dto);

    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-cache',
    });

    return res.status(200).send(result.csv);
  }

  @Get()
  getReport(@Query() dto: BarcodeReportQueryDto) {
    return this.service.getReport(dto, {
      page: dto.page ?? 1,
      limit: dto.limit ?? 20,
    });
  }

  @Post('finalize')
  finalizeBarcode(@Body() dto: BarcodeReportDto) {
    return this.service.finalizeBarcode(dto);
  }

  @Get('finalized-status')
  checkFinalizedStatus(@Query() dto: BarcodeReportDto) {
    return this.service.checkFinalizedStatus(dto);
  }

  @Patch('stepper')
  updateStepper(@Body() dto: BarcodeReportDto) {
    return this.service.updateStepperAfterFinalize(dto);
  }
}