import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as moment from 'moment';
import { DriverBarcodeQueryDto } from './dto/barcode.dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class DriverService {
  private readonly logger = new Logger(DriverService.name);

  constructor(
    @InjectModel('Deliveries') private deliveryModel?: Model<any>,
    @InjectModel('delivery_dumps') private deliveryDumpModel?: Model<any>,
    @InjectModel('DriverStepper') private driverStepperModel?: Model<any>,
    @InjectModel('MasterDataKMS') private masterDataModel?: Model<any>,
    @InjectModel('coupons') private couponModel?: Model<any>,
  ) {
    this.validateModels();
  }

  private validateModels() {
    const missing = [];
    if (!this.deliveryModel) missing.push('Deliveries');
    if (!this.deliveryDumpModel) missing.push('delivery_dumps');
    if (!this.driverStepperModel) missing.push('DriverStepper');
    if (!this.masterDataModel) missing.push('MasterDataKMS');
    if (!this.couponModel) missing.push('coupons');
    if (missing.length > 0) {
      this.logger.warn(`⚠️ Missing models: ${missing.join(', ')}`);
    }
  }
  // ✅ Add this helper to join arrays with comma
  private joinArray(arr: string[]): string {
    if (!arr || arr.length === 0) return '';
    return arr.filter(Boolean).join(', ');
  }

  // ✅ Already existing

  async generateBarcodeReport(dto: DriverBarcodeQueryDto) {
    try {
      // ✅ FIXED: Handle ISO date format 2026-02-05T00:00:00.000+00:00
      const startOfDayUTC = moment.utc(dto.date).startOf('day').toDate();
      const endOfDayUTC = moment.utc(dto.date).endOf('day').toDate();

      if (!moment(dto.date).isValid()) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
      }

      const driverStepperData = await this.driverStepperModel
        .findOne({
          date: startOfDayUTC,
        })
        .lean();

      let deliveryData = await this.getDeliveryData(startOfDayUTC, endOfDayUTC);
      if (!deliveryData?.length) {
        throw new NotFoundException(`No delivery data found for ${dto.date}`);
      }

      const masterData = await this.masterDataModel.findOne({}).lean();
      const couponALISTData = await this.couponModel
        .find({ name: 'ALIST 2025 AUG' }, { name: 1, coupon_code: 1 })
        .lean();

      if (dto.type === 'customer') {
        return this.generateCustomerBarcodeCSV(
          deliveryData,
          driverStepperData,
          startOfDayUTC,
          dto.phase,
        );
      } else {
        return this.generateItemBarcodeCSV(
          deliveryData,
          driverStepperData,
          startOfDayUTC,
          dto.phase,
          masterData,
          couponALISTData,
        );
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to generate barcode report: ${error.message}`,
      );
    }
  }

  /** ✅ FIXED: Updated for ISO delivery_date format */
  private async getDeliveryData(startOfDayUTC: Date, endOfDayUTC: Date) {
    console.log({ startOfDayUTC });
    const query = {
      delivery_date: startOfDayUTC,
      not_deliverable: false,
      is_delivery_freezed: false,
      delivery_type: 'subscription',
    };
    console.log({ query });
    let deliveryData = await this.deliveryModel
      .find(query, {
        _id: 1,
        delivery_item: 1,
        slot: 1,
        is_barcode_finalized: 1,
        delivery_note: 1,
        awb: 1,
        instruction: 1,
        customer_internal_code: 1,
      })
      .lean()
      .populate({
        path: 'order_id',
        select:
          'migrated_order_number order_number refundable_deposite coupon_id',
        options: { sort: { order_number: 1 } },
      })
      .populate('address_id')
      .populate(
        'subscription_id',
        'selected_meal is_refundable bag_info avoid_ingredients',
      )
      .populate(
        'customer_id',
        'first_name last_name country_code phone_number whatsapp_country_code whatsapp_number',
      )
      .sort({ 'order_id.order_number': 1 })
      .exec();

    if (!deliveryData.length) {
      deliveryData = await this.deliveryDumpModel
        .find(query, {
          _id: 1,
          delivery_item: 1,
          slot: 1,
          is_barcode_finalized: 1,
          delivery_note: 1,
          awb: 1,
          instruction: 1,
          customer_internal_code: 1,
        })
        .lean()
        .populate({
          path: 'order_id',
          select:
            'migrated_order_number order_number refundable_deposite coupon_id type_of_order',
          options: { sort: { order_number: 1 } },
        })
        .populate('address_id')
        .populate(
          'subscription_id',
          'selected_meal is_refundable bag_info avoid_ingredients',
        )
        .populate(
          'customer_id',
          'first_name last_name country_code phone_number whatsapp_country_code whatsapp_number',
        )
        .sort({ 'order_id.order_number': 1 })
        .exec();
    }

    return deliveryData;
  }

  private generateCustomerBarcodeCSV(
    deliveryData: any[],
    driverStepperData: any,
    date: Date,
    phase: string,
  ) {
    const csvData: any[] = [];
    const dateFormatted = moment(date).format('Do MMM YYYY');
    const dateStr = moment(date).format('DDMM');

    // Header rows (matching frontend exactly)
    csvData.push(
      { one: 'Report', three: 'Delivery Date' },
      { one: `Barcode Report(${phase})`, three: dateFormatted },
      { one: '' },
      { one: '' },
      { one: 'Barcode Report Customer Level' },
      { one: '' },
      { one: '' },
    );

    // Customer headers
    csvData.push({
      one: 'New Order Number',
      three: 'Customer Full Name',
      four: 'City',
      five: 'Delivery Slot',
      six: 'Chiller Barcode',
      seven: 'Transcorp Barcode',
      eight: 'Icode',
      nine: 'Transcorp Code',
      nine1: 'Influencer',
      fifteen: 'Area',
      ten: 'Address Type',
      eleven: 'Delivery Address',
      twelve: 'Phone Number',
      thirteen: 'WhatsApp Number',
      fourteen: 'Delivery Notes',
      sixteen: 'Admin Delivery Notes',
      seventeen: 'Is Bag Available',
      seventeen1: 'Bag Type',
      eighteen: 'Type Of Order',
      nineteen: 'Diet Type',
    });

    csvData.push({ one: '' });

    let customerCount = 1;

    deliveryData.forEach((delivery) => {
      const customerBarcodeObject = this.createCustomerBarcodeObject(
        delivery,
        customerCount,
        dateStr,
        phase,
        driverStepperData,
      );

      csvData.push({
        one: customerBarcodeObject.order_number || '--',
        three: customerBarcodeObject.customer_name || '--',
        four: customerBarcodeObject.city || '--',
        five: customerBarcodeObject.slot || '--',
        six: customerBarcodeObject.internal_code_with_date || '--',
        seven: customerBarcodeObject.transcorp_barcode || '--',
        eight: customerBarcodeObject.internal_code || '',
        nine: customerBarcodeObject.transcorp_code || '--',
        nine1: customerBarcodeObject.influencer || '',
        fifteen: customerBarcodeObject.area || '--',
        ten: customerBarcodeObject.address_type || '--',
        eleven: customerBarcodeObject.delivery_address || '--',
        twelve: customerBarcodeObject.phone_number || '--',
        thirteen: customerBarcodeObject.whatsapp_number || '--',
        fourteen: customerBarcodeObject.delivery_note || '--',
        sixteen: customerBarcodeObject.admin_delivery_note || '--',
        seventeen: customerBarcodeObject.bag_opted || '--',
        seventeen1: customerBarcodeObject.bag_type || '--',
        eighteen: customerBarcodeObject.type_of_order || '--',
        nineteen: customerBarcodeObject.protein_category || '--',
      });
      customerCount++;
    });

    return {
      csvData,
      filename: `Barcode_Report_Customer_Level(${dateFormatted})(${phase}).csv`,
      totalRecords: csvData.length,
    };
  }

  private createCustomerBarcodeObject(
    delivery: any,
    customerCount: number,
    dateStr: string,
    phase: string,
    driverStepperData: any,
  ) {
    const fullName =
      `${delivery.customer_id?.first_name?.trim() || ''} ${delivery.customer_id?.last_name?.trim() || ''}`.trim();

    const internalCode =
      delivery.customer_internal_code ||
      (driverStepperData?.mp?.step2
        ? null
        : `C${String(customerCount).padStart(3, '0')}`);

    const internalCodeWithDate = internalCode
      ? `${internalCode}${dateStr}`
      : null;
    const transcorpBarcode = internalCode ? `T${internalCode}${dateStr}` : null;

    let transcorpCode = '--';
    if (internalCode) {
      if (delivery.subscription_id?.bag_info?.bag_type === 'Paper Bag') {
        transcorpCode = `PC${internalCode}`;
      } else {
        transcorpCode = `C${internalCode}`;
      }
    }

    return {
      order_number: delivery.order_id?.order_number || '--',
      customer_name: fullName,
      city: delivery.address_id?.city || '--',
      slot: this.normalizeSlot(delivery.slot),
      internal_code: internalCode || '--',
      internal_code_with_date: internalCodeWithDate || '--',
      transcorp_barcode: transcorpBarcode || '--',
      transcorp_code: transcorpCode,
      influencer: this.hasInfluencerCoupon(delivery) ? 'Yes' : '',
      area: delivery.address_id?.province || '--',
      address_type: delivery.address_id?.address_type || '--',
      delivery_address: delivery.address_id?.full_address || '--',
      phone_number: `${delivery.customer_id?.country_code || ''}${delivery.customer_id?.phone_number || ''}`,
      whatsapp_number: `${delivery.customer_id?.whatsapp_country_code || ''}${delivery.customer_id?.whatsapp_number || ''}`,
      delivery_note: delivery.instruction || '--',
      admin_delivery_note: delivery.address_id?.delivery_note || '--',
      bag_opted: delivery.subscription_id?.is_refundable ? 'Yes' : 'No',
      bag_type: delivery.subscription_id?.is_refundable
        ? 'Chiller Bag'
        : delivery?.subscription_id?.bag_info?.name || 'Styrofoam Box',
      type_of_order:
        delivery.order_id?.type_of_order == 'new'
          ? 'New'
          : delivery?.order_id?.type_of_order == 're-new' &&
            delivery?.order_id?.welcome_back
            ? 'Welcome Back'
            : 'Re New',
      protein_category:
        delivery.delivery_item?.[0]?.protein_category || 'balance',
    };
  }
  private createCsvRow(barcodeObject: any) {
    return {
      one: barcodeObject?.order_number || '--',
      two: barcodeObject?.customer_name || '--',
      two1: barcodeObject?.first_name || '--',
      two2: barcodeObject?.first_name_length?.toString() || '--',
      three:
        (barcodeObject?.order_number || '--') +
        ' - ' +
        (barcodeObject?.customer_name || '--'),
      four: barcodeObject?.internal_code || '--',
      five: barcodeObject?.internal_code?.substring(1) || '--',
      six: barcodeObject?.dish_count?.toString() || '--',
      seven: barcodeObject?.no_of_dishes?.toString() || '--',
      eight: barcodeObject?.dish_code || '--',
      nine: barcodeObject?.bar_code || '--', // ✅ C895D1A format
      ten: barcodeObject?.category || '--',
      ten1:
        barcodeObject?.protein_category == 'balance'
          ? 'Balanced'
          : barcodeObject?.protein_category == 'high'
            ? 'High'
            : 'Low Carb',
      eleven: barcodeObject?.dish_name || '--', // ✅ FIXED
      twelve:
        (barcodeObject?.variant?.toLowerCase() == 'standard'
          ? '-'
          : barcodeObject?.variant) || '--',
      thirteen: barcodeObject?.kcal_range_string || '--',
      thirteen1: barcodeObject?.carb_diet_type || '',
      thirteen2: barcodeObject?.size || '',
      fourteen: barcodeObject?.kcal || '--',
      fifteen: barcodeObject?.protein || '--',
      sixteen: barcodeObject?.carb || '--',
      seventeen: barcodeObject?.fat || '--',
      eighteen: barcodeObject?.label_instruction || '--', // ✅ FIXED
      nineteen: barcodeObject?.allergens_list || '', // ✅ FIXED
      twenty: barcodeObject?.diet_change || '',
      twenty1: barcodeObject?.packaging_material || '--', // ✅ FIXED
    };
  }

  private generateItemBarcodeCSV(
    deliveryData: any[],
    driverStepperData: any,
    date: Date,
    phase: string,
    masterData: any,
    couponData: any[],
  ) {
    const csvData: any[] = [];
    const dateFormatted = moment(date).format('Do MMM YYYY');
    const dateStr = moment(date).format('DDMM');

    let customerCount = 1;

    deliveryData.forEach((delivery) => {
      let dishCount = 1; // ✅ Reset per delivery (not per item)

      delivery.delivery_item?.forEach((deliveryItem: any) => {
        const packagingMaterialData = [
          ...(deliveryItem?.selected_meal?.variants?.packaging_material || []),
        ].sort((a: any, b: any) => {
          const aMain = !!a?.is_main;
          const bMain = !!b?.is_main;
          return aMain === bMain ? 0 : aMain ? -1 : 1;
        });

        const sizeOfPackagingMaterial = packagingMaterialData;

        // ✅ EXACT AdminJS logic: Multiple vs Single packaging
        if (sizeOfPackagingMaterial?.length > 1) {
          // Multiple packaging materials - generate one row per material
          for (let i = 0; i < sizeOfPackagingMaterial.length; i++) {
            const ascii = String.fromCharCode(i + 65); // A, B, C...

            const barcodeObject = this.addItemLevelBarcode(
              ascii,
              sizeOfPackagingMaterial[i]?.description,
              sizeOfPackagingMaterial[i]?.instruction,
              sizeOfPackagingMaterial[i]?.packaging_material,
              sizeOfPackagingMaterial[i]?.material,
              delivery,
              deliveryItem,
              dishCount,
              customerCount,
              dateStr,
              driverStepperData,
              packagingMaterialData,
            );

            csvData.push(this.createCsvRow(barcodeObject));
          }
        } else {
          // Single packaging material
          const singleMaterial = sizeOfPackagingMaterial[0];
          const barcodeObject = this.addItemLevelBarcode(
            '',
            singleMaterial?.description || '',
            singleMaterial?.instruction || '',
            '',
            singleMaterial?.material,
            delivery,
            deliveryItem,
            dishCount,
            customerCount,
            dateStr,
            driverStepperData,
            packagingMaterialData,
          );

          csvData.push(this.createCsvRow(barcodeObject));
        }

        dishCount++; // ✅ Increment after each delivery_item
      });

      customerCount++; // ✅ Increment after each delivery
    });

    return {
      csvData,
      filename: `Barcode_Report_Item_Level(${dateFormatted})(${phase}).csv`,
      totalRecords: csvData.length,
    };
  }
  private addItemLevelBarcode(
    ascii: string,
    material: string,
    instr: string,
    pack_id: string,
    packMaterialName: string,
    val: any, // delivery object
    innervalue: any, // deliveryItem object
    dishCount: number,
    customerCount: number,
    dateStr: string,
    driverStepperData: any,
    packagingMaterialData: any[],
  ) {
    const barcodeObject: any = {};
    const fullName = (
      val?.customer_id?.first_name?.trim() +
      ' ' +
      val?.customer_id?.last_name?.trim()
    )?.split(' ');

    // ✅ FIXED: packaging_material (column twenty1)
    barcodeObject.packaging_material = packMaterialName || '--';

    // ✅ EXACT allergens logic from AdminJS
    const currentMaterial = packagingMaterialData?.find(
      (item) => item?.packaging_material?.toString() == pack_id?.toString(),
    );

    let finalAllergensPackageMaterial: string[] = [];
    if (currentMaterial) {
      if (currentMaterial?.is_main === true) {
        const mainAllergens = currentMaterial?.allergens || [];
        const insideAllergens = packagingMaterialData
          ?.filter((item) => item?.is_inside === true)
          ?.flatMap((item) => item?.allergens || []);
        finalAllergensPackageMaterial = [
          ...new Set([...mainAllergens, ...insideAllergens]),
        ];
      } else if (currentMaterial?.is_separate === true) {
        finalAllergensPackageMaterial = currentMaterial?.allergens || [];
      } else {
        finalAllergensPackageMaterial = currentMaterial?.allergens || [];
      }
    } else {
      finalAllergensPackageMaterial =
        packagingMaterialData?.filter(
          (allerItm) =>
            allerItm?.packaging_material?.toString() == pack_id?.toString(),
        )?.[0]?.allergens || [];
    }

    // ✅ avoid_ingredient
    let avoid_ingredient = '';
    val?.subscription_id?.avoid_ingredients?.forEach((ingr: string) => {
      avoid_ingredient += ingr + ', ';
    });
    barcodeObject.avoid_ingredient = avoid_ingredient.substring(
      0,
      avoid_ingredient.length - 2,
    );

    // ✅ EXACT protein_category_string logic
    const proteinCategoryString =
      innervalue?.selected_meal?.variants?.protein_category == 'low'
        ? 'Low Carb'
        : innervalue?.protein_category == 'high'
          ? 'High Carb'
          : innervalue?.protein_category == 'balance'
            ? 'Balanced'
            : 'Balanced';

    // ✅ EXACT kcalRangeString logic
    const kcalSize = innervalue?.selected_meal?.variants?.size;
    let kcalRangeString = '';
    if (kcalSize?.toLowerCase() == 'onesize') {
      kcalRangeString = 'Regular';
    } else if (kcalSize?.toLowerCase() == 'standard') {
      kcalRangeString = `Standard - ${innervalue?.selected_meal?.meal_category}`;
    } else {
      const sizeDisplay =
        kcalSize == 'extra_small'
          ? 'XS'
          : kcalSize == 'extra_large'
            ? 'XL'
            : kcalSize == 'large'
              ? 'L'
              : kcalSize == 'small'
                ? 'S'
                : 'M';
      kcalRangeString = `${proteinCategoryString} / ${sizeDisplay} / Meal`;
    }

    // ✅ EXACT first_name logic
    barcodeObject.first_name =
      fullName[0]?.length <= 2
        ? (this.cleanAndCapitalize(
          fullName[0] + ' ' + fullName[1],
        )?.toString() || '--') + '!'
        : (this.cleanAndCapitalize(fullName[0])?.toString() || '--') + '!';

    barcodeObject.first_name_length =
      fullName[0]?.length <= 2
        ? (fullName[0] + ' ' + fullName[1])?.length || 0
        : fullName[0]?.length;

    barcodeObject.customer_name =
      val?.customer_id?.first_name?.trim() +
      ' ' +
      val?.customer_id?.last_name?.trim();

    barcodeObject.protein_category =
      innervalue?.selected_meal?.variants?.protein_category || 'balance';

    barcodeObject.diet_change =
      innervalue?.selected_meal?.variants?.protein_category !=
        innervalue?.protein_category
        ? 'Change'
        : 'No Change';

    barcodeObject.item_id = innervalue?.selected_meal?._id;
    barcodeObject.delivery_id = val?._id;
    barcodeObject.delivery_item_type = innervalue?.meal_type;
    barcodeObject.order_number = val?.order_id?.order_number;

    // ✅ FIXED: dish_name (column eleven)
    barcodeObject.dish_name =
      ascii != ''
        ? material || '--'
        : material || innervalue?.selected_meal?.dish_name;

    barcodeObject.city = val?.address_id?.city;
    barcodeObject.slot = val?.slot == 'Before 7:30AM' ? '3AM - 6AM' : val?.slot;

    barcodeObject.variant =
      ascii != '' && ascii != 'A'
        ? '--'
        : innervalue?.selected_meal?.variants?.protein_option;

    barcodeObject.kcal =
      ascii != '' && ascii != 'A'
        ? '--'
        : innervalue?.selected_meal?.variants?.kcal;

    barcodeObject.kcal_range = innervalue?.selected_meal?.variants?.size;

    // ✅ EXACT carb_diet_type
    barcodeObject.carb_diet_type =
      (innervalue?.selected_meal?.meal_category == 'Snack' &&
        innervalue?.selected_meal?.variants?.protein_category == 'balance') ||
        (innervalue?.selected_meal?.meal_category == 'Breakfast' &&
          innervalue?.selected_meal?.variants?.protein_category == 'balance')
        ? 'Standard'
        : (innervalue?.selected_meal?.variants?.protein_category == 'balance'
          ? 'Balanced'
          : innervalue?.selected_meal?.variants?.protein_category == 'low'
            ? 'Low Carb'
            : 'High');

    barcodeObject.size =
      this.cleanAndCapitalize(
        innervalue?.selected_meal?.variants?.size || '',
      ) == 'Standard'
        ? '-'
        : this.cleanAndCapitalize(
          innervalue?.selected_meal?.variants?.size || '',
        );

    barcodeObject.kcal_range_string = kcalRangeString;

    barcodeObject.protein =
      ascii != '' && ascii != 'A'
        ? '--'
        : innervalue?.selected_meal?.variants?.protein;

    barcodeObject.carb =
      ascii != '' && ascii != 'A'
        ? '--'
        : innervalue?.selected_meal?.variants?.carb;

    barcodeObject.fat =
      ascii != '' && ascii != 'A'
        ? '--'
        : innervalue?.selected_meal?.variants?.fat;

    barcodeObject.is_auto_select = innervalue?.selected_meal?.is_auto_select;

    // ✅ FIXED: label_instruction (column eighteen)
    barcodeObject.label_instruction =
      ascii != ''
        ? instr
        : instr ||
        innervalue?.selected_meal?.protein_category_info?.filter(
          (protnItm: any) =>
            protnItm?.category ==
            innervalue?.selected_meal?.variants?.protein_category,
        )?.[0]?.label_instruction ||
        innervalue?.selected_meal?.label_instruction ||
        '--';

    barcodeObject.category = innervalue?.selected_meal?.meal_category;

    const internalCode = val?.customer_internal_code
      ? val?.customer_internal_code
      : driverStepperData?.mp?.step2
        ? null
        : 'C' + customerCount;

    barcodeObject.internal_code = internalCode;

    barcodeObject.internal_code_with_date = internalCode
      ? internalCode + dateStr
      : null;

    barcodeObject.internal_code_with_date_in_logistics =
      val?.customer_internal_code
        ? 'T' + val?.customer_internal_code + dateStr
        : driverStepperData?.mp?.step2
          ? null
          : 'TC' + customerCount + dateStr;

    barcodeObject.dish_code =
      (internalCode || '') +
      ' / ' +
      dishCount +
      ascii +
      ' - ' +
      val?.delivery_item?.length;

    barcodeObject.no_of_dishes = val?.delivery_item?.length;
    barcodeObject.dish_count = dishCount;

    // ✅ FIXED: allergens_list (column nineteen)
    barcodeObject.allergens_list =
      packagingMaterialData?.length > 1
        ? finalAllergensPackageMaterial?.length > 0
          ? 'Contains ' + this.joinArray(finalAllergensPackageMaterial)
          : ''
        : (innervalue?.selected_meal?.variants?.allergens || [])?.length > 0
          ? 'Contains ' +
          this.joinArray(innervalue?.selected_meal?.variants?.allergens || [])
          : '';

    // ✅ FIXED: bar_code (column nine) - WITHOUT ascii at the end
    barcodeObject.bar_code = internalCode
      ? internalCode + 'D' + dishCount + ascii
      : null;

    return barcodeObject;
  }

  private createItemBarcodeObject(
    delivery: any,
    deliveryItem: any,
    customerCount: number,
    dishCount: number,
    noOfDishes: number,
    dateStr: string,
    phase: string,
    driverStepperData: any,
    ascii: string, // ✅ FIXED: Pass ascii from packaging material loop
    material?: string, // ✅ NEW: From packagingMaterialData[i].description
    instr?: string, // ✅ NEW: From packagingMaterialData[i].instruction
    pack_id?: string, // ✅ NEW: From packagingMaterialData[i].packaging_material
    packMaterialName?: string, // ✅ NEW: From packagingMaterialData[i].material
  ) {
    const fullNameArray = (
      delivery.customer_id?.first_name?.trim() +
      ' ' +
      delivery.customer_id?.last_name?.trim()
    ).split(' ');

    const internalCode =
      delivery.customer_internal_code ||
      (driverStepperData?.mp?.step2
        ? null
        : `C${String(customerCount).padStart(3, '0')}`);

    // ✅ FIXED: Match AdminJS barcode logic EXACTLY
    const barCode = internalCode ? `${internalCode}D${dishCount}` : null; // ❌ REMOVED ascii
    const dishCode = `${internalCode || `C${String(customerCount).padStart(3, '0')}`} / ${dishCount}${ascii} - ${noOfDishes}`;

    const packagingMaterialData = [
      ...(deliveryItem?.selected_meal?.variants?.packaging_material || []),
    ].sort((a: any, b: any) => {
      const aMain = !!a?.is_main;
      const bMain = !!b?.is_main;
      return aMain === bMain ? 0 : aMain ? -1 : 1;
    });

    // ✅ FIXED: Use pack_id parameter OR fallback logic from AdminJS
    const currentMaterial = pack_id
      ? packagingMaterialData?.find(
        (item) => item?.packaging_material?.toString() == pack_id?.toString(),
      )
      : packagingMaterialData?.find(
        (item) =>
          item?.packaging_material?.toString() ===
          deliveryItem?.selected_meal?.variants?.packaging_material_id?.toString(),
      );

    let finalAllergensPackageMaterial: string[] = [];
    if (currentMaterial) {
      if (currentMaterial?.is_main === true) {
        const mainAllergens = currentMaterial?.allergens || [];
        const insideAllergens = packagingMaterialData
          ?.filter((item) => item?.is_inside === true)
          ?.flatMap((item) => item?.allergens || []);
        finalAllergensPackageMaterial = [
          ...new Set([...mainAllergens, ...insideAllergens]),
        ];
      } else if (currentMaterial?.is_separate === true) {
        finalAllergensPackageMaterial = currentMaterial?.allergens || [];
      } else {
        finalAllergensPackageMaterial = currentMaterial?.allergens || [];
      }
    } else {
      finalAllergensPackageMaterial =
        packagingMaterialData?.filter(
          (allerItm) =>
            allerItm?.packaging_material?.toString() == pack_id?.toString(),
        )?.[0]?.allergens || [];
    }

    // ✅ FIXED: AdminJS exact protein_category logic
    const proteinCategoryString =
      deliveryItem?.selected_meal?.variants?.protein_category === 'low'
        ? 'Low Carb'
        : deliveryItem?.protein_category === 'high'
          ? 'High Carb'
          : deliveryItem?.protein_category === 'balance'
            ? 'Balanced'
            : 'Balanced';

    const kcalSize = deliveryItem?.selected_meal?.variants?.size;
    let kcalRangeString = '';
    if (kcalSize?.toLowerCase() === 'onesize') {
      kcalRangeString = 'Regular';
    } else if (kcalSize?.toLowerCase() === 'standard') {
      kcalRangeString = `Standard - ${deliveryItem?.selected_meal?.meal_category}`;
    } else {
      const sizeDisplay =
        kcalSize === 'extra_small'
          ? 'XS'
          : kcalSize === 'extra_large'
            ? 'XL'
            : kcalSize === 'large'
              ? 'L'
              : kcalSize === 'small'
                ? 'S'
                : 'M';
      kcalRangeString = `${proteinCategoryString} / ${sizeDisplay} / Meal`;
    }

    // ✅ FIXED: first_name logic EXACTLY as AdminJS
    const firstName = fullNameArray[0];
    const firstNameDisplay =
      firstName?.length <= 2
        ? (this.cleanAndCapitalize(
          fullNameArray[0] + ' ' + fullNameArray[1],
        )?.toString() || '--') + '!'
        : (this.cleanAndCapitalize(fullNameArray[0])?.toString() || '--') + '!';

    // ✅ FIXED: INS (column 18) - label_instruction logic
    const labelInstruction =
      ascii !== ''
        ? instr
        : instr ||
        deliveryItem?.selected_meal?.protein_category_info?.filter(
          (protnItm: any) =>
            protnItm?.category ===
            deliveryItem?.selected_meal?.variants?.protein_category,
        )?.[0]?.label_instruction ||
        deliveryItem?.selected_meal?.label_instruction ||
        '--';

    // ✅ FIXED: dish_name logic
    const dishName =
      ascii !== ''
        ? material || '--'
        : material || deliveryItem?.selected_meal?.dish_name;

    // ✅ FIXED: carb_diet_type EXACT logic
    const carbDietType =
      (deliveryItem?.selected_meal?.meal_category === 'Snack' &&
        deliveryItem?.selected_meal?.variants?.protein_category ===
        'balance') ||
        (deliveryItem?.selected_meal?.meal_category === 'Breakfast' &&
          deliveryItem?.selected_meal?.variants?.protein_category === 'balance')
        ? 'Standard'
        : (deliveryItem?.selected_meal?.variants?.protein_category === 'balance'
          ? 'Balanced'
          : deliveryItem?.selected_meal?.variants?.protein_category === 'low'
            ? 'Low Carb'
            : 'High');

    // ✅ FIXED: ten1 (DIET TYPE) logic
    const dietTypeDisplay =
      deliveryItem?.protein_category === 'balance'
        ? 'Balanced'
        : deliveryItem?.protein_category === 'high'
          ? 'High'
          : 'Low Carb';

    // ✅ FIXED: twelve (PROTEINS) - variant logic
    const variantDisplay =
      (deliveryItem?.selected_meal?.variants?.protein_option?.toLowerCase() ===
        'standard'
        ? '-'
        : deliveryItem?.selected_meal?.variants?.protein_option) || '--';

    return {
      order_number: delivery.order_id?.order_number || '--',
      customer_name:
        `${delivery.customer_id?.first_name?.trim() || ''} ${delivery.customer_id?.last_name?.trim() || ''}`.trim(),
      first_name: firstNameDisplay,
      first_name_length:
        firstName?.length <= 2
          ? (firstName + ' ' + fullNameArray[1])?.length || 0
          : firstName?.length || 0,
      label_name: `${delivery.order_id?.order_number || '--'} - ${delivery.customer_id?.first_name?.trim() || ''} ${delivery.customer_id?.last_name?.trim() || ''}`,
      internal_code: internalCode || '--',
      arrange_wise: internalCode?.substring(1) || '--',
      tray_count: dishCount.toString(),
      dish_count: noOfDishes,
      final_id: dishCode,
      bar_code: barCode || '--', // ✅ FIXED: Now "C895D1" instead of "C895D1A"
      meal: deliveryItem?.selected_meal?.meal_category || '--',
      diet_type: dietTypeDisplay, // ✅ FIXED: ten1 column
      product_label: dishName, // ✅ FIXED: eleven column
      proteins: variantDisplay, // ✅ FIXED: twelve column
      kcal_diet: kcalRangeString,
      carb: carbDietType, // ✅ FIXED: thirteen1 column
      size:
        this.cleanAndCapitalize(
          deliveryItem?.selected_meal?.variants?.size || '',
        ) === 'Standard'
          ? '-'
          : this.cleanAndCapitalize(
            deliveryItem?.selected_meal?.variants?.size || '',
          ),
      kcals:
        ascii !== '' && ascii !== 'A'
          ? '--'
          : deliveryItem?.selected_meal?.variants?.kcal || '--',
      protein:
        ascii !== '' && ascii !== 'A'
          ? '--'
          : deliveryItem?.selected_meal?.variants?.protein || '--',
      carbs:
        ascii !== '' && ascii !== 'A'
          ? '--'
          : deliveryItem?.selected_meal?.variants?.carb || '--',
      fats:
        ascii !== '' && ascii !== 'A'
          ? '--'
          : deliveryItem?.selected_meal?.variants?.fat || '--',
      instructions: labelInstruction, // ✅ FIXED: eighteen (INS) column
      allergens_list:
        packagingMaterialData?.length > 1
          ? finalAllergensPackageMaterial.length > 0
            ? `Contains ${finalAllergensPackageMaterial.join(', ')}`
            : ''
          : (deliveryItem?.selected_meal?.variants?.allergens || [])?.length > 0
            ? `Contains ${deliveryItem?.selected_meal?.variants?.allergens.join(', ')}`
            : '',
      diet_change:
        deliveryItem?.selected_meal?.variants?.protein_category !==
          deliveryItem?.protein_category
          ? 'Change'
          : 'No Change',
      packaging_material:
        packMaterialName ||
        deliveryItem?.selected_meal?.variants?.packaging_material_name ||
        '--', // ✅ FIXED: twenty1
    };
  }

  // Helper methods
  private normalizeSlot(slot: string): string {
    const slotMap: { [key: string]: string } = {
      'Before 7:30AM': '3AM - 6AM',
      '3AM - 7:30AM': '3AM - 6AM',
      '3AM - 6AM': '3AM - 6AM',
    };
    return slotMap[slot] || slot;
  }

  private hasInfluencerCoupon(delivery: any): boolean {
    const couponId =
      delivery?.order_id?.coupon_id ||
      delivery?.subscription_id?.coupon_id ||
      delivery?.coupon_id;
    return !!couponId;
  }

  private getProteinCategory(delivery: any): string {
    return (
      delivery?.subscription_id?.selected_meal?.[0]?.variants
        ?.protein_category || 'Balanced'
    );
  }

  private cleanAndCapitalize(str: string): string {
    return (
      str
        ?.trim()
        .replace(
          /\w\S*/g,
          (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase(),
        ) || ''
    );
  }

  async downloadBarcodeReportExcel(
    dto: DriverBarcodeQueryDto,
  ): Promise<Buffer> {
    try {
      const startOfDayUTC = moment.utc(dto.date).startOf('day').toDate();
      const endOfDayUTC = moment.utc(dto.date).endOf('day').toDate();

      if (!moment(dto.date).isValid()) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
      }

      const driverStepperData = await this.driverStepperModel
        .findOne({ date: startOfDayUTC })
        .lean();

      let deliveryData = await this.getDeliveryData(startOfDayUTC, endOfDayUTC);

      if (!deliveryData?.length) {
        throw new NotFoundException(`No delivery data found for ${dto.date}`);
      }

      const masterData = await this.masterDataModel.findOne({}).lean();
      const couponALISTData = await this.couponModel
        .find({ name: 'ALIST 2025 AUG' }, { name: 1, coupon_code: 1 })
        .lean();

      if (dto.type === 'customer') {
        return this.generateCustomerBarcodeExcel(
          deliveryData,
          driverStepperData,
          startOfDayUTC,
          dto.phase,
        );
      } else {
        return this.generateItemBarcodeExcel(
          deliveryData,
          driverStepperData,
          startOfDayUTC,
          dto.phase,
          masterData,
          couponALISTData,
        );
      }
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to generate barcode report: ${error.message}`,
      );
    }
  }

  private async generateCustomerBarcodeExcel(
    deliveryData: any[],
    driverStepperData: any,
    date: Date,
    phase: string,
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Barcode Report');

    const dateFormatted = moment(date).format('Do MMM YYYY');
    const dateStr = moment(date).format('DDMM');

    // ✅ Add title rows with styling
    const titleRow = worksheet.addRow(['Report', '', '', 'Delivery Date']);
    titleRow.font = { bold: true, size: 12 };
    worksheet.addRow([`Barcode Report(${phase})`, '', '', dateFormatted]);
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow(['Barcode Report Customer Level']);
    worksheet.addRow([]);
    worksheet.addRow([]);

    // ✅ Header row with styling
    const headerRow = worksheet.addRow([
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
    ]);

    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF000000' },
    };

    worksheet.addRow([]);

    // ✅ Add data rows
    let customerCount = 1;
    deliveryData.forEach((delivery) => {
      const customerBarcodeObject = this.createCustomerBarcodeObject(
        delivery,
        customerCount,
        dateStr,
        phase,
        driverStepperData,
      );

      worksheet.addRow([
        customerBarcodeObject.order_number || '--',
        customerBarcodeObject.customer_name || '--',
        customerBarcodeObject.city || '--',
        customerBarcodeObject.slot || '--',
        customerBarcodeObject.internal_code_with_date || '--',
        customerBarcodeObject.transcorp_barcode || '--',
        customerBarcodeObject.internal_code || '',
        customerBarcodeObject.transcorp_code || '--',
        customerBarcodeObject.influencer || '',
        customerBarcodeObject.area || '--',
        customerBarcodeObject.address_type || '--',
        customerBarcodeObject.delivery_address || '--',
        customerBarcodeObject.phone_number || '--',
        customerBarcodeObject.whatsapp_number || '--',
        customerBarcodeObject.delivery_note || '--',
        customerBarcodeObject.admin_delivery_note || '--',
        customerBarcodeObject.bag_opted || '--',
        customerBarcodeObject.bag_type || '--',
        customerBarcodeObject.type_of_order || '--',
        customerBarcodeObject.protein_category || '--',
      ]);

      customerCount++;
    });

    // ✅ Auto-fit columns
    worksheet.columns.forEach((col) => {
      col.width = 15;
    });

    // ✅ Convert to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }

  private async generateItemBarcodeExcel(
    deliveryData: any[],
    driverStepperData: any,
    date: Date,
    phase: string,
    masterData: any,
    couponData: any[],
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Barcode Report');

    const dateFormatted = moment(date).format('Do MMM YYYY');
    const dateStr = moment(date).format('DDMM');

    // ✅ Add title rows
    const titleRow = worksheet.addRow(['Report', '', '', 'Delivery Date']);
    titleRow.font = { bold: true, size: 12 };
    worksheet.addRow([`Barcode Report(${phase})`, '', '', dateFormatted]);
    worksheet.addRow([]);
    worksheet.addRow([]);
    worksheet.addRow(['Barcode Report Item Level']);
    worksheet.addRow([]);
    worksheet.addRow([]);

    // ✅ Header row with styling
    const headerRow = worksheet.addRow([
      'Order Number',
      'Customer Name',
      'First Name',
      'First Name Length',
      'Order - Customer',
      'Internal Code',
      'Arrange Wise',
      'Dish Count',
      'No Of Dishes',
      'Dish Code',
      'Bar Code',
      'Category',
      'Diet Type',
      'Product Label',
      'Proteins',
      'Kcal Diet',
      'Kcals',
      'Protein',
      'Carb',
      'Fat',
      'Instructions',
      'Allergens',
      'Diet Change',
      'Packaging Material',
    ]);

    headerRow.font = { bold: true, color: { argb: '000000' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'DADADA' },
    };

    worksheet.addRow([]);

    // ✅ Add data rows
    let customerCount = 1;

    deliveryData.forEach((delivery) => {
      let dishCount = 1;

      delivery.delivery_item?.forEach((deliveryItem: any) => {
        const packagingMaterialData = [
          ...(deliveryItem?.selected_meal?.variants?.packaging_material || []),
        ].sort((a: any, b: any) => {
          const aMain = !!a?.is_main;
          const bMain = !!b?.is_main;
          return aMain === bMain ? 0 : aMain ? -1 : 1;
        });

        const sizeOfPackagingMaterial = packagingMaterialData;

        if (sizeOfPackagingMaterial?.length > 1) {
          for (let i = 0; i < sizeOfPackagingMaterial.length; i++) {
            const ascii = String.fromCharCode(i + 65);

            const barcodeObject = this.addItemLevelBarcode(
              ascii,
              sizeOfPackagingMaterial[i]?.description,
              sizeOfPackagingMaterial[i]?.instruction,
              sizeOfPackagingMaterial[i]?.packaging_material,
              sizeOfPackagingMaterial[i]?.material,
              delivery,
              deliveryItem,
              dishCount,
              customerCount,
              dateStr,
              driverStepperData,
              packagingMaterialData,
            );

            worksheet.addRow([
              barcodeObject.order_number || '--',
              barcodeObject.customer_name || '--',
              barcodeObject.first_name || '--',
              barcodeObject.first_name_length?.toString() || '--',
              (barcodeObject.order_number || '--') +
              ' - ' +
              (barcodeObject.customer_name || '--'),
              barcodeObject.internal_code || '--',
              barcodeObject.internal_code?.substring(1) || '--',
              barcodeObject.dish_count?.toString() || '--',
              barcodeObject.no_of_dishes?.toString() || '--',
              barcodeObject.dish_code || '--',
              barcodeObject.bar_code || '--',
              barcodeObject.category || '--',
              barcodeObject.carb_diet_type || '--',
              barcodeObject.dish_name || '--',
              (barcodeObject.variant?.toLowerCase() === 'standard'
                ? '-'
                : barcodeObject.variant) || '--',
              barcodeObject.kcal_range_string || '--',
              barcodeObject.kcal || '--',
              barcodeObject.protein || '--',
              barcodeObject.carb || '--',
              barcodeObject.fat || '--',
              barcodeObject.label_instruction || '--',
              barcodeObject.allergens_list || '',
              barcodeObject.diet_change || '',
              barcodeObject.packaging_material || '--',
            ]);
          }
        } else {
          const singleMaterial = sizeOfPackagingMaterial[0];
          const barcodeObject = this.addItemLevelBarcode(
            '',
            singleMaterial?.description || '',
            singleMaterial?.instruction || '',
            '',
            singleMaterial?.material,
            delivery,
            deliveryItem,
            dishCount,
            customerCount,
            dateStr,
            driverStepperData,
            packagingMaterialData,
          );

          worksheet.addRow([
            barcodeObject.order_number || '--',
            barcodeObject.customer_name || '--',
            barcodeObject.first_name || '--',
            barcodeObject.first_name_length?.toString() || '--',
            (barcodeObject.order_number || '--') +
            ' - ' +
            (barcodeObject.customer_name || '--'),
            barcodeObject.internal_code || '--',
            barcodeObject.internal_code?.substring(1) || '--',
            barcodeObject.dish_count?.toString() || '--',
            barcodeObject.no_of_dishes?.toString() || '--',
            barcodeObject.dish_code || '--',
            barcodeObject.bar_code || '--',
            barcodeObject.category || '--',
            barcodeObject.carb_diet_type || '--',
            barcodeObject.dish_name || '--',
            (barcodeObject.variant?.toLowerCase() === 'standard'
              ? '-'
              : barcodeObject.variant) || '--',
            barcodeObject.kcal_range_string || '--',
            barcodeObject.kcal || '--',
            barcodeObject.protein || '--',
            barcodeObject.carb || '--',
            barcodeObject.fat || '--',
            barcodeObject.label_instruction || '--',
            barcodeObject.allergens_list || '',
            barcodeObject.diet_change || '',
            barcodeObject.packaging_material || '--',
          ]);
        }

        dishCount++;
      });

      customerCount++;
    });

    // ✅ Auto-fit columns
    worksheet.columns.forEach((col) => {
      col.width = 15;
    });

    // ✅ Convert to buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
  }
}
