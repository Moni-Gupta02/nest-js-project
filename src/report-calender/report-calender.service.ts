import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { KitchenSummaryReportRepository } from './report-calender.repository';
import {
  buildCsvBase,
  buildCsvRows,
  buildPlatingCsvRows,
  buildPlatingSummaryPdfHtml,
  buildProductionCsvBase,
  buildProductionCsvRows,
  buildSummaryCsvBase,
  csvReportRowsToString,
  formatKitchenDate,
  createEmptyPlatingSizes,
  formatPlatingDate,
  totalPlatingSizes,
  getPhaseLabel,
  getPlatingPhaseLabel,
  getSummaryReportFileName,
  groupBySelectedMeal,
  groupNddItems,
  groupPlatingBySelectedMeal,
  MealSummaryReportKind,
  getMealSummaryReportMeta,
  groupProductionNddItems,
  groupProductionSelectedMeals,
} from './report-summary.helper';
import {
  KitchenSummaryReportQueryDto,
  PlatingSummaryReportQueryDto,
  PortioningSummaryExportPdfQueryDto,
  PortioningSummaryReportQueryDto,
} from './dto/create-report-calender.dto';
import {
  buildPortioningPdfHtml,
  buildPortioningSummaryData,
  getPortioningPdfFileName,
  getPortioningReportPhaseLabel,
  normalizePortioningReportType,
} from './portioning-summary.helper';

@Injectable()
export class ReportCalenderService {
  constructor(
    private readonly reportCalenderRepo: KitchenSummaryReportRepository,
  ) { }

  async getReport(query: KitchenSummaryReportQueryDto, includeCsv = false) {
    const { date, phase } = query;

    const deliveryDetails =
      await this.reportCalenderRepo.getKitchenSummaryReport(
        new Date(date),
        phase,
      );

    const { breakfastShow, mealShow, snacksShow, breakfastCount, mealCount, snackCount } =
      this.groupDeliveryItems(deliveryDetails);

    // const csvBaseRows = buildCsvBase(date, phase);

    // const csvReport = buildCsvRows(
    //   csvBaseRows,
    //   breakfastShow,
    //   breakfastCount,
    //   mealShow,
    //   mealCount,
    //   snacksShow,
    //   snackCount,
    // );

    const response: any = {
      message: 'Kitchen summary report fetched successfully',
      report: {
        title: `Kitchen Summary Report(${phase})`,
        phase,
        phaseLabel: getPhaseLabel(phase),
        deliveryDate: formatKitchenDate(date),
      },
      counts: {
        breakfastCount,
        mealCount,
        snackCount,
      },
      data: {
        breakfastShow,
        mealShow,
        snacksShow,
      },
    };

    if (includeCsv) {
      const csvBaseRows = buildCsvBase(date, phase);

      response.csvReport = buildCsvRows(
        csvBaseRows,
        breakfastShow,
        breakfastCount,
        mealShow,
        mealCount,
        snacksShow,
        snackCount,
      );
    }

    return response;
  }

  async getKitchenProductionReport(query: KitchenSummaryReportQueryDto, includeCsv = false) {
    const { date, phase } = query;

    const deliveryDetails =
      await this.reportCalenderRepo.getKitchenSummaryReport(
        new Date(date),
        phase,
      );

    const dumpRecipeData = await this.reportCalenderRepo.getDumpRecipeData(
      new Date(date),
    );

    const {
      breakfastList,
      mealList,
      snacksList,
      nddList,
    } = this.splitDeliveryItems(deliveryDetails);

    let breakfastShow = [];
    let mealShow = [];
    let snacksShow = [];

    let breakfastCount = 0;
    let mealCount = 0;
    let snackCount = 0;

    if (nddList.length > 0) {
      const nddGrouped = groupProductionNddItems(nddList);

      breakfastShow = nddGrouped.breakfastShow;
      mealShow = nddGrouped.mealShow;
      snacksShow = nddGrouped.snacksShow;

      breakfastCount = nddGrouped.breakfastCount;
      mealCount = nddGrouped.mealCount;
      snackCount = nddGrouped.snackCount;
    } else {
      const breakfastGrouped = groupProductionSelectedMeals(
        breakfastList,
        dumpRecipeData,
      );
      const mealGrouped = groupProductionSelectedMeals(mealList, dumpRecipeData);
      const snacksGrouped = groupProductionSelectedMeals(
        snacksList,
        dumpRecipeData,
      );

      breakfastShow = breakfastGrouped.rows;
      mealShow = mealGrouped.rows;
      snacksShow = snacksGrouped.rows;

      breakfastCount = breakfastGrouped.totalCount;
      mealCount = mealGrouped.totalCount;
      snackCount = snacksGrouped.totalCount;
    }

    // const csvBaseRows = buildProductionCsvBase(date, phase);

    // const csvReport = buildProductionCsvRows(
    //   csvBaseRows,
    //   breakfastShow,
    //   breakfastCount,
    //   mealShow,
    //   mealCount,
    //   snacksShow,
    //   snackCount,
    // );

    const response: any = {
      message: 'Kitchen production report fetched successfully',
      report: {
        title: `Kitchen Production Report (${phase})`,
        phase,
        phaseLabel: getPhaseLabel(phase),
        deliveryDate: formatKitchenDate(date),
      },
      counts: {
        breakfastCount,
        mealCount,
        snackCount,
      },
      data: {
        breakfastShow,
        mealShow,
        snacksShow,
      },
    };

    if (includeCsv) {
      const csvBaseRows = buildProductionCsvBase(date, phase);

      response.csvReport = buildProductionCsvRows(
        csvBaseRows,
        breakfastShow,
        breakfastCount,
        mealShow,
        mealCount,
        snacksShow,
        snackCount,
      );
    }

    return response;
  }

  private splitDeliveryItems(deliveryDetails: any[]) {
    const breakfastList = [];
    const mealList = [];
    const snacksList = [];
    const nddList = [];

    for (const delivery of deliveryDetails) {
      for (const item of delivery?.delivery_item || []) {
        if (item?.meal_type === 'lunch') {
          mealList.push(item?.selected_meal);
        } else if (item?.meal_type === 'breakfast') {
          breakfastList.push(item?.selected_meal);
        } else if (item?.meal_type === 'dinner') {
          mealList.push(item?.selected_meal);
        } else if (item?.meal_type === 'morning_snack') {
          snacksList.push(item?.selected_meal);
        } else if (item?.meal_type === 'evening_snack') {
          snacksList.push(item?.selected_meal);
        } else {
          nddList.push(item);
        }
      }
    }

    return { breakfastList, mealList, snacksList, nddList };
  }

  private groupDeliveryItems(deliveryDetails: any[]) {
    const { breakfastList, mealList, snacksList, nddList } =
      this.splitDeliveryItems(deliveryDetails);

    if (nddList.length > 0) {
      const nddGrouped = groupNddItems(nddList);

      return {
        breakfastShow: nddGrouped.breakfastShow,
        mealShow: nddGrouped.mealShow,
        snacksShow: nddGrouped.snacksShow,
        breakfastCount: nddGrouped.breakfastCount,
        mealCount: nddGrouped.mealCount,
        snackCount: nddGrouped.snackCount,
      };
    }

    const breakfastGrouped = groupBySelectedMeal(breakfastList);
    const mealGrouped = groupBySelectedMeal(mealList, true);
    const snacksGrouped = groupBySelectedMeal(snacksList);

    return {
      breakfastShow: breakfastGrouped.rows,
      mealShow: mealGrouped.rows,
      snacksShow: snacksGrouped.rows,
      breakfastCount: breakfastGrouped.totalCount,
      mealCount: mealGrouped.totalCount,
      snackCount: snacksGrouped.totalCount,
    };
  }

  async getPlatingSummaryReport(query: PlatingSummaryReportQueryDto) {
    const { csvReport, ...response } =
      await this.buildMealSummaryReport('plating', query);
    return response;
  }

  async getPortioningSummaryReport(query: PortioningSummaryReportQueryDto) {
    const { date, phase } = query;

    const [deliveryItems, dumpRecipe] = await Promise.all([
      this.reportCalenderRepo.getPortioningSummaryReport(
        new Date(date),
        phase,
      ),
      this.reportCalenderRepo.getDumpRecipesForDate(new Date(date)),
    ]);

    return buildPortioningSummaryData({
      deliveryItems,
      dumpRecipe,
      date,
      phase,
    });
  }

  private async buildMealSummaryReport(
    kind: MealSummaryReportKind,
    query: PlatingSummaryReportQueryDto | PortioningSummaryReportQueryDto,
  ) {
    const { date, phase } = query;
    const phaseLabel = getPlatingPhaseLabel(phase);
    const { title, successMessage } = getMealSummaryReportMeta(kind, phase);

    const deliveryDetails =
      kind === 'portioning'
        ? await this.reportCalenderRepo.getPortioningSummaryReport(
          new Date(date),
          phase,
        )
        : await this.reportCalenderRepo.getPlatingSummaryReport(
          new Date(date),
          phase,
        );

    const breakfastList = [];
    const mealList = [];
    const snacksList = [];

    for (const delivery of deliveryDetails) {
      for (const item of delivery?.delivery_item || []) {
        if (item?.meal_type === 'lunch') {
          mealList.push(item?.selected_meal);
        } else if (item?.meal_type === 'breakfast') {
          breakfastList.push(item?.selected_meal);
        } else if (item?.meal_type === 'dinner') {
          mealList.push(item?.selected_meal);
        } else if (item?.meal_type === 'morning_snack') {
          snacksList.push(item?.selected_meal);
        } else if (item?.meal_type === 'evening_snack') {
          snacksList.push(item?.selected_meal);
        }
      }
    }

    const breakfastGrouped = groupPlatingBySelectedMeal(breakfastList);
    const mealGrouped = groupPlatingBySelectedMeal(mealList, true);
    const snacksGrouped = groupPlatingBySelectedMeal(snacksList);

    const breakfastShow = breakfastGrouped.rows;
    const mealShow = mealGrouped.rows;
    const snacksShow = snacksGrouped.rows;

    const breakfastCount = breakfastGrouped.totalCount;
    const mealCount = mealShow.reduce(
      (sum, row) =>
        sum + totalPlatingSizes(row.sizes ?? createEmptyPlatingSizes()),
      0,
    );
    const snackCount = snacksGrouped.totalCount;

    const csvBaseRows = buildSummaryCsvBase(kind, date, phase);

    const csvReport = buildPlatingCsvRows(
      csvBaseRows,
      breakfastShow,
      breakfastCount,
      mealShow,
      mealCount,
      snacksShow,
      snackCount,
    );

    return {
      message: successMessage,
      report: {
        title,
        phase,
        phaseLabel,
        deliveryDate: formatPlatingDate(date),
      },
      counts: {
        breakfastCount,
        mealCount,
        snackCount,
      },
      data: {
        breakfastShow,
        mealShow,
        snacksShow,
      },
      csvReport,
    };
  }

  async exportPlatingSummaryCsv(query: PlatingSummaryReportQueryDto) {
    return this.exportMealSummaryCsv('plating', query);
  }

  async exportPlatingSummaryPdf(query: PlatingSummaryReportQueryDto) {
    return this.exportMealSummaryPdf('plating', query);
  }

  async exportPortioningSummaryPdf(query: PortioningSummaryExportPdfQueryDto) {
    const { date, phase, type } = query;
    const phaseLabel = getPortioningReportPhaseLabel(phase);
    const reportType = normalizePortioningReportType(type);

    const [deliveryItems, dumpRecipe] = await Promise.all([
      this.reportCalenderRepo.getPortioningSummaryReport(
        new Date(date),
        phase,
      ),
      this.reportCalenderRepo.getDumpRecipesForDate(new Date(date)),
    ]);

    const portioningData = buildPortioningSummaryData({
      deliveryItems,
      dumpRecipe,
      date,
      phase,
    });

    const dishes =
      reportType === 'meal'
        ? portioningData.data.mealShow
        : reportType === 'snack'
          ? portioningData.data.snackShow
          : portioningData.data.breakfastShow;

    const html = buildPortioningPdfHtml({
      dishes,
      type: reportType,
      date,
    });

    const fileName = getPortioningPdfFileName(date, reportType, phaseLabel);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          bottom: '20px',
          left: '20px',
          right: '20px',
        },
      });

      return { buffer, fileName };
    } finally {
      await browser.close();
    }
  }

  private async exportMealSummaryCsv(
    kind: MealSummaryReportKind,
    query: PlatingSummaryReportQueryDto | PortioningSummaryReportQueryDto,
  ) {
    const result = await this.buildMealSummaryReport(kind, query);
    const fileName = `${getSummaryReportFileName(
      kind,
      query.date,
      result.report.phaseLabel,
    )}.csv`;

    return {
      csv: csvReportRowsToString(result.csvReport),
      fileName,
    };
  }

  private async exportMealSummaryPdf(
    kind: MealSummaryReportKind,
    query: PlatingSummaryReportQueryDto | PortioningSummaryReportQueryDto,
  ) {
    const result = await this.buildMealSummaryReport(kind, query);
    const fileName = `${getSummaryReportFileName(
      kind,
      query.date,
      result.report.phaseLabel,
    )}.pdf`;
    const html = buildPlatingSummaryPdfHtml({ csvReport: result.csvReport });

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '32px',
          bottom: '32px',
          left: '28px',
          right: '28px',
        },
      });

      return { buffer, fileName };
    } finally {
      await browser.close();
    }
  }
}
