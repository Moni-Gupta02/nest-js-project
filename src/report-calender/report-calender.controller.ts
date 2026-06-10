import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import * as puppeteer from 'puppeteer';
import { Public } from '../common/decorators';
import { ReportCalenderService } from './report-calender.service';
import {
  KitchenSummaryReportQueryDto,
  PlatingSummaryReportQueryDto,
  PortioningSummaryExportPdfQueryDto,
  PortioningSummaryReportQueryDto,
} from './dto/create-report-calender.dto';

function escapeCsvValue(value: any): string {
  if (value === null || value === undefined) return '';

  const stringValue = String(value);

  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function buildCsv(rows: any[]): string {
  return rows
    .map((row) =>
      [row.first ?? '', row.second ?? '', row.third ?? '']
        .map(escapeCsvValue)
        .join(','),
    )
    .join('\r\n');
}
@Public()
@Controller('report-calender')
export class ReportCalenderController {
  constructor(
    private readonly reportCalenderService: ReportCalenderService,
  ) { }

  @Get('kitchen-summary-report')
  async getReport(@Query() query: KitchenSummaryReportQueryDto) {
    return this.reportCalenderService.getReport(query);
  }

  @Get('kitchen-summary-report/export-csv')
  async exportCsv(
    @Query() query: KitchenSummaryReportQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.reportCalenderService.getReport(query, true);
    const csv = buildCsv(result.csvReport);

    const fileName = `Kitchen_Summary_Report(${result.report.phaseLabel})(${result.report.deliveryDate}).csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return res.send('\uFEFF' + csv);
  }

  @Get('kitchen-summary-report/export-pdf')
  async exportKitchenSummaryPdf(
    @Query() query: KitchenSummaryReportQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.reportCalenderService.getReport(query);

    const html = this.buildKitchenSummaryPdfHtml(result);

    const pdfBuffer = await this.generatePdfBuffer(html);

    const fileName = `Kitchen_Summary_Report(${result.report.phaseLabel})(${result.report.deliveryDate}).pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return res.send(pdfBuffer);
  }

  @Get('kitchen-production-report')
  async getKitchenProductionReport(
    @Query() query: KitchenSummaryReportQueryDto,
  ) {
    return this.reportCalenderService.getKitchenProductionReport(query);
  }

  @Get('kitchen-production-report/export-csv')
  async exportKitchenProductionCsv(
    @Query() query: KitchenSummaryReportQueryDto,
    @Res() res: Response,
  ) {
    const result =
      await this.reportCalenderService.getKitchenProductionReport(query, true);

    const csv = buildCsv(result.csvReport);

    const fileName = `Kitchen_Production_Report(${result.report.phaseLabel})(${result.report.deliveryDate}).csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return res.send('\uFEFF' + csv);
  }

  @Get('kitchen-production-report/export-pdf')
  async exportKitchenProductionPdf(
    @Query() query: KitchenSummaryReportQueryDto,
    @Res() res: Response,
  ) {
    const result =
      await this.reportCalenderService.getKitchenProductionReport(query);

    const html = this.buildKitchenProductionPdfHtml(result);
    const pdfBuffer = await this.generatePdfBuffer(html);

    const fileName = `Kitchen_Production_Report(${result.report.deliveryDate})(${result.report.phaseLabel}).pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return res.send(pdfBuffer);
  }

  private async generatePdfBuffer(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();

      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '12px',
          right: '15px',
          bottom: '12px',
          left: '15px',
        },
      });

      return Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  private buildKitchenSummaryPdfHtml(result: any): string {
    const escapeHtml = (value: any) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const renderSimpleSection = (title: string, count: number, rows: any[]) => `
      <div class="summary-section simple-section">
        <div class="summary-header">
          <span>${escapeHtml(title)}</span>
          <span>${escapeHtml(count)}</span>
        </div>
  
        ${rows
        ?.map(
          (item, index) => `
              <div class="simple-row">
                <span class="sr">${index + 1}</span>
                <span class="name">${escapeHtml(item?.name)}</span>
                <span class="count">${escapeHtml(item?.count)}</span>
              </div>
            `,
        )
        .join('') || ''}
      </div>
    `;

    const renderLunchDinner = (rows: any[]) => `
      <div class="summary-section">
        <div class="summary-header">
          <span>Lunch/Dinner</span>
          <span>${escapeHtml(result.counts.mealCount)}</span>
        </div>
  
        ${rows
        ?.map(
          (item, index) => `
              <div class="meal-main-row">
                <span class="sr">${index + 1}</span>
                <span class="name">${escapeHtml(item?.name)}</span>
                <span class="count">${escapeHtml(item?.count)}</span>
              </div>
  
              ${item?.variants
              ?.map(
                (variant) => `
                      <div class="variant-summary-row">
                        <span class="sr"></span>
                        <span class="name">-${escapeHtml(variant?.name)}</span>
                        <span class="count">${escapeHtml(variant?.count)}</span>
                      </div>
                    `,
              )
              .join('') || ''
            }
            `,
        )
        .join('') || ''}
      </div>
    `;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
  
          <style>
            @page {
              size: A4;
              margin: 43px;
            }
  
            * {
              box-sizing: border-box;
            }
  
            body {
              margin: 5px;
              padding: 5px;
              font-family: Arial, Helvetica, sans-serif;
              color: #000000;
              line-height: 1.5;
            }
  
            .top {
              position: relative;
              height: 80px;
            }
  
            .report-label {
              position: absolute;
              left: 0;
              top: 0;
              font-size: 9px;
              font-weight: 400;
              line-height: 1.5;
            }
  
            .report-title {
              position: absolute;
              left: 0;
              top: 15px;
              font-size: 11px;
              font-weight: 400;
              line-height: 1.5;
            }
  
            .date-label {
              position: absolute;
              right: 0;
              top: 0;
              font-size: 9px;
              font-weight: 400;
              line-height: 1.5;
            }
  
            .date-value {
              position: absolute;
              right: 0;
              top: 15px;
              font-size: 11px;
              font-weight: 400;
              line-height: 1.5;
            }
  
            .summary-section {
              margin-top: 18px;
              page-break-inside: auto;
            }
  
            .simple-section {
              page-break-inside: avoid;
            }
  
            .summary-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #fff2cf;
              min-height: 24px;
              padding: 10px 8px;
              font-size: 12px;
              font-weight: 500;
              line-height: 1.5;
            }
  
            .simple-row,
            .meal-main-row,
            .variant-summary-row {
              display: grid;
              grid-template-columns: 45px 1fr 45px;
              align-items: center;
              min-height: 22px;
              padding: 3px 0;
              border-bottom: 0.5px solid #f6f7fb;
              line-height: 1.5;
            }
  
            .simple-row span,
            .meal-main-row span {
              font-size: 9px;
              line-height: 1.5;
            }
  
            .variant-summary-row span {
              font-size: 8.6px;
              line-height: 1.5;
            }
  
            .meal-main-row {
              background: #cde2f2;
            }
  
            .sr {
              padding-left: 5px;
            }
  
            .name {
              padding-left: 5px;
            }
  
            .count {
              text-align: right;
              padding-right: 5px;
            }
          </style>
        </head>
  
        <body>
          <div class="top">
            <div class="report-label">Report</div>
            <div class="report-title">${escapeHtml(result.report.title)}</div>
  
            <div class="date-label">Delivery Date</div>
            <div class="date-value">${escapeHtml(result.report.deliveryDate)}</div>
          </div>
  
          ${renderSimpleSection(
      'Breakfasts',
      result.counts.breakfastCount,
      result.data.breakfastShow,
    )}
  
          ${renderLunchDinner(result.data.mealShow)}
  
          ${renderSimpleSection(
      'Snacks',
      result.counts.snackCount,
      result.data.snacksShow,
    )}
        </body>
      </html>
    `;
  }

  private buildKitchenProductionPdfHtml(result: any): string {
    const escapeHtml = (value: any) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    const renderSection = (title: string, totalCount: number, data: any[]) => {
      const rows = data?.length
        ? data
          .map((item, index) => {
            const variants = item?.variants?.length
              ? item.variants
                .map(
                  (variant) => `
                        <tr class="variant-row">
                          <td></td>
                          <td> - ${escapeHtml(variant?.name)}</td>
                          <td>${escapeHtml(
                    `${Number(variant?.value || 0).toFixed(0)} gms`,
                  )}</td>
                        </tr>
                      `,
                )
                .join('')
              : '';

            return `
                <tr class="item-row">
                  <td>${index + 1}</td>
                  <td>${escapeHtml(item?.name)}</td>
                  <td>${escapeHtml(item?.count)}</td>
                </tr>
                ${variants}
              `;
          })
          .join('')
        : `
          <tr>
            <td colspan="3">No Data Available</td>
          </tr>
        `;

      return `
        <div class="production-section">
          <div class="production-section-header">
            ${escapeHtml(title)} (Total: ${escapeHtml(totalCount)})
          </div>

          <table>
            <tbody>
              <tr class="table-header-row">
                <td>Sr No</td>
                <td>Item</td>
                <td>Count</td>
              </tr>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />

          <style>
            @page {
              size: A4;
              margin: 42px;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 3px;
              padding: 3px;
              font-family: Arial, Helvetica, sans-serif;
              color: #000000;
              font-size: 11px;
            }

            .report-title {
              font-size: 15px;
              font-weight: 500;
              text-align: center;
              margin-bottom: 14px;
            }

            .meta {
              font-size: 14px;
              margin-bottom: 13px;
            }

            .meta-line {
              display: flex;
              justify-content: space-between;
              margin-bottom: 6px;
            }

            .production-section {
              margin-top: 10px;
              page-break-inside: auto;
            }

            .production-section-header {
              background: #fff2cf;
              color: #000000;
              font-size: 13px;
              font-weight: 500;
              padding: 6px;
              margin-bottom: 6px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            td {
              font-size: 11px;
              color: #000000;
              padding: 3px 1px;
              border-bottom: 1px solid #eaeaea;
              vertical-align: top;
              line-height: 1.25;
            }

            td:nth-child(1) {
              width: 50px;
            }

            td:nth-child(2) {
              width: auto;
            }

            td:nth-child(3) {
              width: 80px;
              text-align: right;
            }

            .table-header-row td {
              font-size: 11px;
              font-weight: 500;
              color: #000000;
              text-align: left;
              padding: 3px 1px;
              border-bottom: 1px solid #eaeaea;
            }

            .table-header-row td:nth-child(3) {
              text-align: right;
            }

            .variant-row td {
              border-bottom: none;
            }
          </style>
        </head>

        <body>
          <div class="report-title">Kitchen Production Report</div>

          <div class="meta">
            <div class="meta-line">
              <div>Phase: ${escapeHtml(result.report.phase)}</div>
              <div>Delivery Date: ${escapeHtml(result.report.deliveryDate)}</div>
            </div>
          </div>

          ${renderSection(
      'Breakfasts',
      result.counts.breakfastCount,
      result.data.breakfastShow,
    )}

          ${renderSection(
      'Lunch/Dinner',
      result.counts.mealCount,
      result.data.mealShow,
    )}

          ${renderSection(
      'Snacks',
      result.counts.snackCount,
      result.data.snacksShow,
    )}
        </body>
      </html>
    `;
  }

  @Get('plating-summary-export-csv')
  async exportPlatingSummaryCsv(
    @Query() query: PlatingSummaryReportQueryDto,
    @Res() res: Response,
  ) {
    const { csv, fileName } =
      await this.reportCalenderService.exportPlatingSummaryCsv(query);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );

    return res.send(csv);
  }

  @Get('plating-summary-export-pdf')
  async exportPlatingSummaryPdf(
    @Query() query: PlatingSummaryReportQueryDto,
    @Res() res: Response,
  ) {
    const { buffer, fileName } =
      await this.reportCalenderService.exportPlatingSummaryPdf(query);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );

    return res.send(buffer);
  }

  @Get('plating-summary-report')
  async getPlatingSummaryReport(@Query() query: PlatingSummaryReportQueryDto) {
    return this.reportCalenderService.getPlatingSummaryReport(query);
  }

  @Get('portioning-summary-export-pdf')
  async exportPortioningSummaryPdf(
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

  @Get('portioning-summary-report')
  async getPortioningSummaryReport(
    @Query() query: PortioningSummaryReportQueryDto,
  ) {
    return this.reportCalenderService.getPortioningSummaryReport(query);
  }
}