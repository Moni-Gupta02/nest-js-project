import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { TranscorpReportService } from './transcorp-report.service';
// import { Public } from 'src/common/decorators';
import {
  FinalizeDriversCodeQueryDto,
  MergeAllTranscorpDto,
  ManualMergeTranscorpDto,
  UnmergeTranscorpDto,
} from './dto/transcorp-report.dto';

// @Public()
@Controller('transcorp-report')
export class TranscorpReportController {
  constructor(
    private readonly transcorpReportService: TranscorpReportService,
  ) { }

  @Get('pick')
  async pickTranscorpReport(
    @Query('date') date: string,
    @Query('type') type: string,
    @Query('vendor') vendor: string,
  ) {
    return this.transcorpReportService.pickTranscorpReport({
      date,
      type,
      vendor,
    });
  }

  @Get('download-unmerged-csv')
  async downloadUnmergedCsv(
    @Query('date') date: string,
    @Query('type') type: string,
    @Query('vendor') vendor: string,
    @Res() res: Response,
  ) {
    const csv = await this.transcorpReportService.downloadUnmergedCsv({
      date,
      type,
      vendor,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Transcorp_Report_Before_Merge_${date}_${type}.csv"`,
    );

    return res.send(csv);
  }

  @Get('download-after-merge-csv')
  async downloadAfterMergeCsv(
    @Query('date') date: string,
    @Query('type') type: string,
    @Query('vendor') vendor: string,
    @Res() res: Response,
  ) {
    const csv = await this.transcorpReportService.downloadAfterMergeCsv({
      date,
      type,
      vendor,
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Transcorp_Report_After_Merge_${date}_${type}.csv"`,
    );

    return res.send(csv);
  }

  @Get('generate-csv')
  async generateCsv(
    @Query('date') date: string,
    @Query('type') type: string,
    @Query('vendor') vendor: string,
  ) {
    return this.transcorpReportService.generateCsv({
      date,
      type,
      vendor,
    });
  }

  @Post('finalize-drivers-code')
  async finalizeDriversCode(@Body() body: FinalizeDriversCodeQueryDto) {
    return this.transcorpReportService.finalizeDriversCode(body);
  }

  @Post('merge-all')
  async mergeAllAddress(@Body() body: MergeAllTranscorpDto) {
    return this.transcorpReportService.mergeAllAddress(body);
  }

  @Post('merge')
  async mergeAddress(@Body() body: ManualMergeTranscorpDto) {
    return this.transcorpReportService.mergeAddress(body);
  }

  @Post('unmerge')
  async unmergeAddress(@Body() body: UnmergeTranscorpDto) {
    return this.transcorpReportService.unmergeAddress(body);
  }
}