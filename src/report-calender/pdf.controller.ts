import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../common/decorators';
import { PortioningSummaryExportPdfQueryDto } from './dto/create-report-calender.dto';
import { ReportCalenderService } from './report-calender.service';

@Public()
@Controller('pdf')
export class PdfController {
  constructor(
    private readonly reportCalenderService: ReportCalenderService,
  ) { }

  @Get('portioning_report')
  async portioningReport(
    @Query() query: PortioningSummaryExportPdfQueryDto,
    @Res() res: Response,
  ) {
    const { buffer, fileName } =
      await this.reportCalenderService.exportPortioningSummaryPdf(query);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );

    return res.send(buffer);
  }
}
