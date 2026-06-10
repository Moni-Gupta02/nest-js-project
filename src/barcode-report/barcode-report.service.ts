import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { BarcodeReportDto, Phase } from './dto/barcode.dto';
import { DeliveryRepository } from './barcode-report.repository';
import { BarcodeHelper } from './barcode-report.helper';
const moment = require('moment');

@Injectable()
export class BarcodeReportService {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly helper: BarcodeHelper,
  ) { }

  async getReport(
    dto: BarcodeReportDto,
    pagination?: { page: number; limit: number },
  ) {
    try {
      const date = this.helper.normalizeDate(dto.date);
      const driverStepper = await this.repo.getDriverStepper(date);

      let response;

      if (dto.phase === Phase.BATCH1) {
        response = await this.handleBatch1(date, driverStepper);
      } else if (dto.phase === Phase.NDD) {
        response = await this.handleNdd(date, driverStepper);
      } else {
        throw new BadRequestException('Invalid phase');
      }

      if (pagination) {
        return this.applyReportPagination(response, pagination);
      }

      return response;
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException({
        success: false,
        message:
          (error as Error)?.message || 'Failed to generate barcode report',
      });
    }
  }

  private applyReportPagination(
    response: {
      success: boolean;
      message: string;
      data: Record<string, any>;
    },
    pagination: { page: number; limit: number },
  ) {
    const page = Math.max(1, Number(pagination.page) || 1);
    const limit = Math.max(1, Number(pagination.limit) || 20);
    const skip = (page - 1) * limit;

    const paginateList = (list: any[] = []) => {
      const total = list.length;
      const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

      return {
        items: list.slice(skip, skip + limit),
        total,
        totalPages,
        page,
        limit,
      };
    };

    const customerBarcodeList = paginateList(
      response.data?.customerBarcodeList,
    );
    const barcodeList = paginateList(response.data?.barcodeList);
    const missingBarcodeArray = paginateList(response.data?.missingBarcodeArray);

    return {
      ...response,
      data: {
        ...response.data,
        customerBarcodeList: customerBarcodeList.items,
        barcodeList: barcodeList.items,
        missingBarcodeArray: missingBarcodeArray.items,
        pagination: {
          page,
          limit,
          customerBarcodeList: {
            total: customerBarcodeList.total,
            totalPages: customerBarcodeList.totalPages,
          },
          barcodeList: {
            total: barcodeList.total,
            totalPages: barcodeList.totalPages,
          },
          missingBarcodeArray: {
            total: missingBarcodeArray.total,
            totalPages: missingBarcodeArray.totalPages,
          },
        },
      },
    };
  }

  async finalizeBarcode(dto: BarcodeReportDto) {
    const date = this.helper.normalizeDate(dto.date);

    const currentPhaseReportResponse = await this.getReport(dto);
    const currentPhaseReport = currentPhaseReportResponse.data;

    await this.storeBarcodeData({
      date,
      barcodeList: currentPhaseReport.barcodeList,
    });

    await this.storeAwbData({
      date,
      customerBarcodeList: currentPhaseReport.customerBarcodeList,
      phase: dto.phase,
    });

    const otherPhase = dto.phase === Phase.BATCH1 ? Phase.NDD : Phase.BATCH1;

    const driverStepper: any = await this.repo.getDriverStepper(date);

    const shouldFinalizeOther =
      otherPhase === Phase.BATCH1
        ? !driverStepper?.mp?.step2
        : !driverStepper?.ndd?.step2;

    let otherPhaseFinalized = false;

    if (shouldFinalizeOther) {
      const otherReportResponse = await this.getReport({
        date: dto.date,
        phase: otherPhase,
      });

      await this.storeBarcodeData({
        date,
        barcodeList: otherReportResponse.data.barcodeList,
      });

      await this.storeAwbData({
        date,
        customerBarcodeList: otherReportResponse.data.customerBarcodeList,
        phase: otherPhase,
      });

      otherPhaseFinalized = true;
    }

    const isCurrentFinalized = await this.checkFinalizedBoolean(dto);

    const isOtherFinalized = shouldFinalizeOther
      ? await this.checkFinalizedBoolean({
        date: dto.date,
        phase: otherPhase,
      })
      : true;

    if ((!isCurrentFinalized || !isOtherFinalized) && !dto.forceContinue) {
      return {
        success: false,
        message: 'Some barcode is not finalized',
        data: {
          currentPhase: dto.phase,
          currentPhaseFinalized: isCurrentFinalized,
          otherPhase,
          otherPhaseFinalized: isOtherFinalized,
          canForceContinue: true,
        },
      };
    }

    await this.updateStepperAfterFinalize(dto, otherPhaseFinalized);

    return {
      success: true,
      message: 'Barcode finalized successfully',
      data: {
        phase: dto.phase,
        otherPhase,
        currentPhaseFinalized: isCurrentFinalized,
        otherPhaseFinalized: isOtherFinalized,
      },
    };
  }

  private async storeBarcodeData(params: {
    date: Date;
    barcodeList: any[];
  }) {
    const { date, barcodeList } = params;

    if (!barcodeList?.length) return;

    const finalDate = moment(date).format('DDMM');

    const uniqueMap = new Map<string, any>();

    for (const item of barcodeList) {
      if (!item?.delivery_id || !item?.internal_code) continue;

      uniqueMap.set(item.delivery_id.toString(), item);
    }

    const bulkOps = [];

    for (const item of uniqueMap.values()) {
      const internalCode =
        typeof item.internal_code === 'string' &&
          item.internal_code.startsWith('T')
          ? item.internal_code.substring(1)
          : item.internal_code;

      bulkOps.push({
        updateOne: {
          filter: { _id: item.delivery_id },
          update: {
            $set: {
              customer_internal_code: internalCode,
              awb: `DLC-${item.internal_code}-${finalDate}-1`,
              is_customer_ready_for_pacakaging: false,
              is_packed_for_delivery: false,
              is_customer_ready: false,
              is_ready_for_dispatch: false,
              is_barcode_finalized: true,
            },
          },
        },
      });
    }

    if (bulkOps.length) {
      await this.repo.bulkUpdateDeliveries(bulkOps);
    }
  }

  private async storeAwbData(params: {
    date: Date;
    customerBarcodeList: any[];
    phase: Phase;
  }) {
    const { date, customerBarcodeList, phase } = params;

    if (!customerBarcodeList?.length) return;

    const deliveryDate = moment(date).format('YYYY-MM-DD');

    const payload = customerBarcodeList
      .filter((item) => item?.transcorp_barcode || item?.transcorp_code)
      .map((item) => {
        const awb =
          item?.awb ||
          `DLC-${item?.transcorp_code || item?.transcorp_barcode}-${moment(
            date,
          ).format('DDMM')}-1`;

        return {
          ...item,
          awb,
          delivery_date: deliveryDate,
          type: phase === Phase.BATCH1 ? 'subscription' : 'NDD',
          active: true,
          vendor: 'DLC',
        };
      });

    await this.repo.replaceAwbData(payload);
  }

  async checkFinalizedStatus(dto: BarcodeReportDto) {
    const isFinalized = await this.checkFinalizedBoolean(dto);

    return {
      success: true,
      data: {
        isFinalized,
      },
    };
  }

  private async checkFinalizedBoolean(dto: BarcodeReportDto) {
    const date = this.helper.normalizeDate(dto.date);

    const deliveryType = dto.phase === Phase.BATCH1 ? 'subscription' : 'NDD';

    const count = await this.repo.countUnfinalizedBarcode(date, deliveryType);

    return count === 0;
  }

  async updateStepperAfterFinalize(
    dto: BarcodeReportDto,
    updateOther = false,
  ) {
    const date = this.helper.normalizeDate(dto.date);

    const mpData = {
      step1: true,
      step2: true,
      step3: false,
      step4: false,
    };

    const nddData = {
      step1: true,
      step2: true,
      step3: false,
      step4: false,
    };

    let updatePayload = {};

    if (updateOther) {
      updatePayload = {
        mp: mpData,
        ndd: nddData,
      };
    } else if (dto.phase === Phase.BATCH1) {
      updatePayload = {
        mp: mpData,
      };
    } else {
      updatePayload = {
        ndd: nddData,
      };
    }

    await this.repo.updateDriverStepper(date, updatePayload);

    return {
      success: true,
      message: 'Stepper updated successfully',
    };
  }

  private async handleBatch1(date: Date, driverStepper: any) {
    const deliveryData = await this.repo.getDeliveryWithFallback(
      date,
      'subscription',
    );

    const [masterData, coupons, ownDeliveryData] = await Promise.all([
      this.repo.getMasterData(),
      this.repo.getCoupons(),
      this.repo.getOwnDeliveryList(),
    ]);

    const report = this.helper.buildBarcodeReport({
      phase: Phase.BATCH1,
      date,
      deliveryDetails: deliveryData,
      countStart: 1,
      driverStepperData: driverStepper,
      instruction: (masterData as any)?.instruction || [],
      coupons,
      ownDeliveryData,
    });

    return {
      success: true,
      message: 'Barcode report generated successfully',
      data: report,
    };
  }

  private async handleNdd(date: Date, driverStepper: any) {
    let countOfSubscription = await this.repo.countSubscriptions(date);
    let deliveryData = await this.repo.findDeliveryByType(date, 'NDD');

    if (!deliveryData?.length) {
      countOfSubscription = await this.repo.countSubscriptionDump(date);
      deliveryData = await this.repo.findDumpDeliveryByType(date, 'NDD');
    }

    const [masterData, coupons, ownDeliveryData] = await Promise.all([
      this.repo.getMasterData(),
      this.repo.getCoupons(),
      this.repo.getOwnDeliveryList(),
    ]);

    const report = this.helper.buildBarcodeReport({
      phase: Phase.NDD,
      date,
      deliveryDetails: deliveryData,
      countStart: Number(countOfSubscription) + 1,
      driverStepperData: driverStepper,
      instruction: (masterData as any)?.instruction || [],
      coupons,
      ownDeliveryData,
    });

    return {
      success: true,
      message: 'Barcode report generated successfully',
      data: report,
    };
  }

  async downloadCustomerBarcodeCsv(dto: BarcodeReportDto) {
    const reportResponse = await this.getReport(dto);
    const customerBarcodeList = reportResponse?.data?.customerBarcodeList || [];

    const csv = this.buildCustomerBarcodeCsv(customerBarcodeList, dto);

    const phaseName = dto.phase === Phase.BATCH1 ? 'MP' : 'NDD';
    const fileDate = moment(dto.date).format('DD_MMM_YYYY');

    return {
      filename: `Barcode_Report_Customer_Level_${fileDate}_${phaseName}.csv`,
      csv: '\uFEFF' + csv,
    };
  }

  private buildCustomerBarcodeCsv(
    customerBarcodeList: any[],
    dto: BarcodeReportDto,
  ) {
    const phaseName = dto.phase === Phase.BATCH1 ? 'MP' : 'NDD';
    const displayDate = moment(dto.date).format('Do MMMM YYYY');

    const headers = [
      'New Order Number',
      'Customer Full Name',
      'City',
      'Delivery Slot',
      'Chiller Barcode',
      'Transcorp Barcode',
      'Icode',
      'Transcorp Code',
      'Influencer',
      'Area',
      'Address Type',
      'Delivery Address',
      'Phone Number',
      'WhatsApp Number',
      'Delivery Notes',
      'Admin Delivery Notes',
      'Is Bag Available',
      'Bag Type',
      'Type Of Order',
      'Diet Type',
    ];

    const rows = customerBarcodeList.map((item) => [
      item.order_number,
      item.customer_name,
      item.city,
      item.slot,
      item.internal_code_with_date,
      item.transcorp_barcode,
      item.internal_code,
      item.transcorp_code,
      item.influencer,
      item.area,
      item.address_type,
      item.delivery_address,
      item.phone_number,
      item.whatsapp_number,
      item.delivery_note,
      item.admin_delivery_note,
      item.bag_opted,
      item.bag_type,
      item.type_of_order,
      item.protein_category,
    ]);

    const csvRows = [
      [''],
      ['Report', 'Delivery Date'],
      [`Barcode Report(${phaseName})`, displayDate],
      [],
      [],
      ['BarcodeReportCustomerLevel'],
      [],
      [],
      headers,
      [],
      ...rows,
    ];

    return csvRows
      .map((row) => row.map((value) => this.escapeCsvValue(value)).join(','))
      .join('\n');
  }

  private escapeCsvValue(value: any): string {
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

  async downloadItemBarcodeCsv(dto: BarcodeReportDto) {
    const reportResponse = await this.getReport(dto);
    const barcodeList = reportResponse?.data?.barcodeList || [];

    const csv = this.buildItemBarcodeCsv(barcodeList);

    const phaseName = dto.phase === Phase.BATCH1 ? 'MP' : 'NDD';
    const fileDate = moment(dto.date).format('DD_MMM_YYYY');

    return {
      filename: `Barcode_Report_Item_Level_${fileDate}_${phaseName}.csv`,
      csv: '\uFEFF' + csv,
    };
  }

  private buildItemBarcodeCsv(barcodeList: any[]) {
    const headers = [
      'Order #',
      'ORDER NAME',
      'First Name',
      'First Name Length',
      'LABEL NAME',
      'ICODE',
      'ARRANGE WISE',
      'TRAY COUNT',
      'DISH COUNT',
      'FINAL ID',
      'BAR CODE',
      'Meal',
      'DIET TYPE',
      'PRODUCT FOR LABEL',
      'PROTEINS',
      'KCAL & DIET',
      'Carb',
      'Size',
      'Kcals',
      'Protein',
      'Carbs',
      'Fats',
      'INS',
      'Allergens List',
      'Diet Change',
      'Packaging Material',
    ];

    const rows = barcodeList.map((item) => ({
      one: item?.order_number || '--',
      two: item?.customer_name || '--',
      two1: item?.first_name || '--',
      two2: item?.first_name_length || '--',
      three: `${item?.order_number || '--'} - ${item?.customer_name || '--'}`,
      four: item?.internal_code || '--',
      five: this.getArrangeWise(item?.internal_code),
      six: item?.dish_count || '--',
      seven: item?.no_of_dishes || '--',
      eight: item?.dish_code || '--',
      nine: item?.bar_code || '--',
      ten: item?.category || '--',
      ten1: this.getDietType(item?.protein_category),
      eleven: item?.dish_name || '--',
      twelve:
        item?.variant?.toLowerCase?.() === 'standard'
          ? '-'
          : item?.variant || '--',
      thirteen: item?.kcal_range_string || this.getKcalDiet(item),
      thirteen1:
        item?.carb_diet_type || this.getDietType(item?.protein_category),
      thirteen2: item?.size || this.cleanSize(item?.kcal_range),
      fourteen: item?.kcal || '--',
      fifteen: item?.protein || '--',
      sixteen: item?.carb || '--',
      seventeen: item?.fat || '--',
      eighteen: item?.label_instruction || '--',
      nineteen: item?.allergens_list || '',
      twenty: item?.diet_change || '',
      twenty1: item?.packaging_material || '--',
    }));

    const sortedRows = rows.sort((a, b) => {
      const mealCompare = String(a.eleven || '').localeCompare(
        String(b.eleven || ''),
      );

      if (mealCompare !== 0) return mealCompare;

      const dietOrder = ['Balanced', 'Low Carb', 'PCOS', 'Diabetes'];

      const aDiet = dietOrder.findIndex((diet) =>
        String(a.thirteen || '').startsWith(diet),
      );

      const bDiet = dietOrder.findIndex((diet) =>
        String(b.thirteen || '').startsWith(diet),
      );

      if (aDiet !== bDiet) return aDiet - bDiet;

      const proteinCompare = String(a.twelve || '').localeCompare(
        String(b.twelve || ''),
      );

      if (proteinCompare !== 0) return proteinCompare;

      return String(a.thirteen || '').localeCompare(String(b.thirteen || ''));
    });

    const csvRows = [
      headers,
      ...sortedRows.map((item) => [
        item.one,
        item.two,
        item.two1,
        item.two2,
        item.three,
        item.four,
        item.five,
        item.six,
        item.seven,
        item.eight,
        item.nine,
        item.ten,
        item.ten1,
        item.eleven,
        item.twelve,
        item.thirteen,
        item.thirteen1,
        item.thirteen2,
        item.fourteen,
        item.fifteen,
        item.sixteen,
        item.seventeen,
        item.eighteen,
        item.nineteen,
        item.twenty,
        item.twenty1,
      ]),
    ];

    return csvRows
      .map((row) => row.map((value) => this.escapeCsvValue(value)).join(','))
      .join('\n');
  }

  private getArrangeWise(internalCode: any) {
    if (!internalCode) return '--';

    return String(internalCode).replace(/\D/g, '') || '--';
  }

  private getDietType(value: any): string {
    if (value === 'balance') return 'Balanced';
    if (value === 'high') return 'High';
    if (value === 'pcos') return 'PCOS';
    if (value === 'diabetes') return 'Diabetes';
    if (value === 'low') return 'Low Carb';
    if (value === 'smart_saver') return 'Essential';

    return value || 'Balanced';
  }

  private cleanSize(value: any): string {
    if (!value) return '--';

    const size = String(value);

    if (size.toLowerCase() === 'standard') return '-';

    return size
      .split('_')
      .join(' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private getKcalDiet(item: any): string {
    if (item?.kcal_range?.toLowerCase?.() === 'onesize') {
      return 'Regular';
    }

    if (item?.kcal_range?.toLowerCase?.() === 'standard') {
      return `Standard - ${item?.category || ''}`;
    }

    return item?.kcal_range || '--';
  }
}