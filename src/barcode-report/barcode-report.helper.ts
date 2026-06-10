import { Injectable } from '@nestjs/common';
const moment = require('moment');

@Injectable()
export class BarcodeHelper {
  private readonly cityOrder = [
    'Abu Dhabi',
    'Al Ain',
    'Sharjah',
    'Dubai',
    'Fujairah',
    'Ras Al Khaimah',
    'Ras Al Khamiah',
    'Ajman',
    'Al Ghadeer',
    'Umm Al Quwain',
  ];

  private readonly slotOrder = [
    '3AM - 6AM',
    '6AM - 9AM',
    '9AM - 1PM',
    '9AM - 12PM',
    '8AM - 6PM',
    '9AM - 10PM',
    '9AM - 6PM',
    '12PM - 3PM',
    '2PM - 6PM',
    '3PM - 7PM',
    '2PM - 10PM',
    '6PM - 10PM',
    '7PM - 11PM',
  ];

  private readonly cityRank = new Map(
    this.cityOrder.map((city, index) => [city, index]),
  );

  private readonly slotRank = new Map(
    this.slotOrder.map((slot, index) => [slot, index]),
  );

  normalizeDate(date: string): Date {
    return new Date(
      moment(date).startOf('day').format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
    );
  }

  private getTypeOfOrder(order: any): string {
    if (order?.type_of_order === 'new') return 'New';

    if (order?.type_of_order === 're-new' && order?.welcome_back === true) {
      return 'Welcome Back';
    }

    return 'Re New';
  }

  private normalizeSlot(slot?: string): string {
    if (
      slot === 'Before 7:30AM' ||
      slot === '3AM - 7:30AM' ||
      slot === '3AM - 6AM'
    ) {
      return '3AM - 6AM';
    }

    return slot || '--';
  }

  private getStep2Done(phase: 'Batch1' | 'NDD', stepper: any): boolean {
    return phase === 'Batch1' ? !!stepper?.mp?.step2 : !!stepper?.ndd?.step2;
  }

  private customerName(delivery: any): string {
    const firstName = String(delivery?.customer_id?.first_name || '').trimEnd();
    const lastName = String(delivery?.customer_id?.last_name || '').trimEnd();

    return `${firstName} ${lastName}`;
  }

  private getMissingBarcodeObject(delivery: any) {
    return {
      order_number: delivery?.order_id?.order_number || '--',
      customer_name: this.customerName(delivery) || '-- --',
      city: delivery?.address_id?.city || '--',
      slot: this.normalizeSlot(delivery?.slot),
    };
  }

  private capitalize(value: string): string {
    if (!value) return '';

    return value
      .split('_')
      .join(' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private cleanFirstName(value: string): string {
    return String(value || '').replace(/[^a-zA-Z0-9 ]/g, '');
  }

  private dietName(value?: string): string {
    if (value === 'balance') return 'Balanced';
    if (value === 'high') return 'High';
    if (value === 'pcos') return 'PCOS';
    if (value === 'diabetes') return 'Diabetes';
    if (value === 'low') return 'Low Carb';
    if (value === 'smart_saver') return 'Essential';

    return 'Balanced';
  }

  private joinArray(arr: any[]): string {
    return [...new Set(arr || [])].filter(Boolean).join(', ');
  }

  private formatAllergens(allergens: any[]): string {
    const uniqueAllergens = [...new Set(allergens || [])].filter(Boolean);

    if (!uniqueAllergens.length) return '';

    if (uniqueAllergens.length === 1) {
      return `Contains ${uniqueAllergens[0]}.`;
    }

    const firstPart = uniqueAllergens.slice(0, -1).join(', ');
    const lastPart = uniqueAllergens[uniqueAllergens.length - 1];

    return `Contains ${firstPart} & ${lastPart}.`;
  }

  private getMealGroupIndex(delivery: any): number {
    const meals = delivery?.subscription_id?.selected_meal || [];
    const has = (meal: string) => meals.includes(meal);
    const len = meals.length;

    if (len === 1 && (has('lunch') || has('dinner'))) return 1;
    if (len === 2 && has('lunch') && has('dinner')) return 2;
    if (len === 2 && has('breakfast') && (has('dinner') || has('lunch')))
      return 3;
    if (len === 2 && has('morning_snack') && (has('dinner') || has('lunch')))
      return 4;
    if (len === 2 && has('evening_snack') && (has('dinner') || has('lunch')))
      return 5;

    if (
      len === 3 &&
      has('dinner') &&
      has('lunch') &&
      (has('morning_snack') || has('evening_snack') || has('breakfast'))
    )
      return 6;

    if (
      len === 3 &&
      has('evening_snack') &&
      has('morning_snack') &&
      (has('lunch') || has('dinner'))
    )
      return 7;

    if (
      len === 3 &&
      has('lunch') &&
      has('breakfast') &&
      (has('morning_snack') || has('evening_snack'))
    )
      return 8;

    if (
      len === 3 &&
      has('dinner') &&
      has('breakfast') &&
      (has('morning_snack') || has('evening_snack'))
    )
      return 9;

    if (
      len === 4 &&
      has('breakfast') &&
      has('morning_snack') &&
      has('evening_snack') &&
      (has('lunch') || has('dinner'))
    )
      return 10;

    if (
      len === 4 &&
      has('breakfast') &&
      has('lunch') &&
      has('dinner') &&
      (has('morning_snack') || has('evening_snack'))
    )
      return 11;

    if (
      len === 4 &&
      has('evening_snack') &&
      has('lunch') &&
      has('dinner') &&
      has('morning_snack')
    )
      return 12;

    if (len === 5) return 13;

    return 14;
  }

  private sortDeliveriesLikeFrontend(deliveries: any[]): any[] {
    return [...(deliveries || [])].sort((a, b) => {
      const mealA = this.getMealGroupIndex(a);
      const mealB = this.getMealGroupIndex(b);

      if (mealA !== mealB) return mealA - mealB;

      const cityA = this.cityRank.get(a?.address_id?.city?.trim()) ?? 999;
      const cityB = this.cityRank.get(b?.address_id?.city?.trim()) ?? 999;

      if (cityA !== cityB) return cityA - cityB;

      const slotA = this.slotRank.get(this.normalizeSlot(a?.slot)) ?? 999;
      const slotB = this.slotRank.get(this.normalizeSlot(b?.slot)) ?? 999;

      if (slotA !== slotB) return slotA - slotB;

      return 0;
    });
  }

  private sortPackagingMaterials(materials: any[]): any[] {
    return [...(materials || [])].sort((a, b) => {
      const aMain = !!a?.is_main;
      const bMain = !!b?.is_main;

      return aMain === bMain ? 0 : aMain ? -1 : 1;
    });
  }

  private isOwnDelivery(customer: any, ownDeliverySet: Set<string>): boolean {
    if (!ownDeliverySet?.size) return false;

    return ownDeliverySet.has(
      `${customer?.city}|${customer?.area}|${customer?.slot}`,
    );
  }

  private hasInfluencerCoupon(delivery: any, couponIdSet: Set<string>): boolean {
    if (!couponIdSet?.size) return false;

    const couponId =
      delivery?.order_id?.coupon_id ||
      delivery?.subscription_id?.coupon_id ||
      delivery?.coupon_id;

    return !!couponId && couponIdSet.has(couponId?.toString());
  }

  private getInstructionNames(
    delivery: any,
    instructionMap: Map<any, string>,
  ): string {
    return (
      delivery?.instruction
        ?.map((id: any) => {
          return instructionMap.get(id) || instructionMap.get(id?.toString?.()) || '';
        })
        ?.filter((name: string) => name !== '')
        ?.join(', ') || ''
    );
  }

  private getCsvTranscorpCode(customer: any): string {
    if (!customer?.internal_code) return '--';

    if (customer?.bag_opted === 'Yes') {
      return `TC${customer.internal_code}`;
    }

    if (customer?.bag_type === 'Paper Bag') {
      return `PC${customer.internal_code}`;
    }

    return `C${customer.internal_code}`;
  }

  private getCustomerBarcodeObject(params: {
    delivery: any;
    date: Date;
    customerCount: number;
    step2Done: boolean;
    instructionMap: Map<any, string>;
    couponIdSet: Set<string>;
  }) {
    const {
      delivery,
      date,
      customerCount,
      step2Done,
      instructionMap,
      couponIdSet,
    } = params;

    const existingCode = delivery?.customer_internal_code;

    const internalCode = existingCode
      ? existingCode.replace(/^C/, '')
      : step2Done
        ? null
        : customerCount;

    const customerBarcodeObject: any = {
      order_number: delivery?.order_id?.order_number || '--',
      customer_name: this.customerName(delivery),
      customer_id: delivery?.customer_id?._id,
      order_id: delivery?.order_id?._id,
      delivery_id: delivery?._id,

      city: delivery?.address_id?.city || '--',
      country: delivery?.address_id?.country || '--',
      slot: this.normalizeSlot(delivery?.slot),

      internal_code: internalCode,
      internal_code_with_date: internalCode
        ? `${internalCode}${moment(date).format('DDMM')}`
        : null,

      transcorp_barcode: internalCode
        ? existingCode
          ? `T${existingCode}${moment(date).format('DDMM')}`
          : `TC${internalCode}${moment(date).format('DDMM')}`
        : null,

      transcorp_code: null,

      influencer: this.hasInfluencerCoupon(delivery, couponIdSet) ? 'ALIST' : '',

      area: delivery?.address_id?.province || '--',
      address_type: delivery?.address_id?.address_type || '--',

      delivery_address: [
        delivery?.address_id?.full_address,
        delivery?.address_id?.province,
        delivery?.address_id?.city,
        delivery?.address_id?.country,
      ]
        .filter(Boolean)
        .join(', '),

      phone_number: `${delivery?.customer_id?.country_code || ''} ${delivery?.customer_id?.phone_number || ''}`,

      whatsapp_number: `${delivery?.customer_id?.whatsapp_country_code || ''} ${delivery?.customer_id?.whatsapp_number || ''}`,

      delivery_note: this.getInstructionNames(delivery, instructionMap),
      instruction: delivery?.instruction || [],

      admin_delivery_note: delivery?.address_id?.delivery_note || '',

      bag_opted: delivery?.subscription_id?.is_refundable ? 'Yes' : 'No',

      bag_type: delivery?.subscription_id?.is_refundable
        ? 'Chiller Bag'
        : delivery?.subscription_id?.bag_info?.name || 'Styrofoam Box',

      type_of_order: this.getTypeOfOrder(delivery?.order_id),

      protein_category:
        delivery?.delivery_item?.[0]?.protein_category || 'balance',
    };

    customerBarcodeObject.transcorp_code =
      this.getCsvTranscorpCode(customerBarcodeObject);

    return customerBarcodeObject;
  }

  private getKcalRangeString(item: any): string {
    const size = item?.selected_meal?.variants?.size;
    const proteinCategory =
      item?.selected_meal?.variants?.protein_category || item?.protein_category;

    const proteinCategoryString =
      proteinCategory === 'low'
        ? 'Low Carb'
        : proteinCategory === 'high'
          ? 'High Carb'
          : this.dietName(proteinCategory);

    if (size?.toLowerCase() === 'onesize') return 'Regular';

    if (size?.toLowerCase() === 'standard') {
      return `Standard - ${item?.selected_meal?.meal_category || ''}`;
    }

    const sizeMap: Record<string, string> = {
      extra_small: 'XS',
      small: 'S',
      medium: 'M',
      large: 'L',
      extra_large: 'XL',
    };

    return `${proteinCategoryString} / ${sizeMap[size] || this.capitalize(size || '')} / Meal`;
  }

  private getCarbDietTypeForCsv(item: any): string {
    const size = item?.selected_meal?.variants?.size;
    const proteinCategory = item?.selected_meal?.variants?.protein_category;

    if (
      size?.toLowerCase?.() === 'standard' &&
      proteinCategory === 'balance'
    ) {
      return 'Standard';
    }

    return this.dietName(proteinCategory);
  }

  private getAllergensForMaterial(
    packagingMaterials: any[],
    currentMaterial: any,
    selectedMeal: any,
  ) {
    if (!packagingMaterials?.length) {
      const allergens = selectedMeal?.variants?.allergens || [];
      return this.formatAllergens(allergens);
    }

    let finalAllergens: any[] = [];

    if (currentMaterial?.is_main === true) {
      const mainAllergens = currentMaterial?.allergens || [];

      const insideAllergens = packagingMaterials
        ?.filter((item) => item?.is_inside === true)
        ?.flatMap((item) => item?.allergens || []);

      finalAllergens = [...new Set([...mainAllergens, ...insideAllergens])];
    } else if (currentMaterial?.is_separate === true) {
      finalAllergens = currentMaterial?.allergens || [];
    } else {
      finalAllergens = currentMaterial?.allergens || [];
    }

    return this.formatAllergens(finalAllergens);
  }

  private getItemBarcodeRows(params: {
    delivery: any;
    phase: 'Batch1' | 'NDD';
    date: Date;
    customerCount: number;
    step2Done: boolean;
  }) {
    const { delivery, phase, date, customerCount, step2Done } = params;

    const barcodeRows: any[] = [];
    const customerName = this.customerName(delivery);
    const normalizedSlot = this.normalizeSlot(delivery?.slot);
    const orderNumber = delivery?.order_id?.order_number || '--';

    const existingCode = delivery?.customer_internal_code;

    const baseInternalCode = existingCode
      ? existingCode
      : step2Done
        ? null
        : `C${customerCount}`;

    let dishCount = 1;

    for (const item of delivery?.delivery_item || []) {
      if (phase === 'NDD') {
        const packagingMaterials = this.sortPackagingMaterials(
          item?.variants?.packaging_material || [],
        );

        const materials = packagingMaterials.length ? packagingMaterials : [{}];

        let nddMealCount = 0;

        for (
          let quantityIndex = 1;
          quantityIndex <= Number(item?.qty || 1);
          quantityIndex++
        ) {
          nddMealCount++;

          for (let i = 0; i < materials.length; i++) {
            const material = materials[i];

            const ascii =
              materials.length > 1 ? String.fromCharCode(i + 65) : '';

            const row = {
              protein_category: item?.protein_category || 'balance',
              packaging_material: material?.material || '--',
              customer_name: customerName,
              item_id: item?.recipe_id,
              delivery_id: delivery?._id,
              delivery_item_type: item?.meal_type,
              order_number: orderNumber,
              dish_name:
                ascii !== ''
                  ? material?.description || '--'
                  : item?.dish_name || '--',
              city: delivery?.address_id?.city || '--',
              slot: normalizedSlot,
              variant:
                ascii !== '' && ascii !== 'A'
                  ? '--'
                  : item?.variants?.protein_option || '--',
              kcal:
                ascii !== '' && ascii !== 'A'
                  ? '--'
                  : item?.variants?.kcal || '--',
              kcal_range: item?.variants?.size || '--',
              protein:
                ascii !== '' && ascii !== 'A'
                  ? '--'
                  : item?.variants?.protein || '--',
              carb:
                ascii !== '' && ascii !== 'A'
                  ? '--'
                  : item?.variants?.carb || '--',
              fat:
                ascii !== '' && ascii !== 'A'
                  ? '--'
                  : item?.variants?.fat || '--',
              label_instruction:
                ascii !== ''
                  ? material?.instruction || '--'
                  : item?.label_instruction || item?.plating_instruction || '--',
              category: item?.meal_category || '--',
              internal_code: baseInternalCode,
              internal_code_with_date: baseInternalCode
                ? `${baseInternalCode}${moment(date).format('DDMM')}`
                : null,
              internal_code_with_date_in_logistics: baseInternalCode
                ? `T${baseInternalCode}${moment(date).format('DDMM')}`
                : null,
              dish_code: baseInternalCode
                ? `${baseInternalCode} / ${nddMealCount}${ascii} - ${item?.qty} - NDD`
                : null,
              no_of_dishes: item?.qty || 1,
              dish_count: nddMealCount,
              allergens_list: this.formatAllergens(item?.variants?.allergens || []),
              bar_code: baseInternalCode
                ? `${baseInternalCode}D${dishCount}-${quantityIndex}${ascii}`
                : null,
            };

            barcodeRows.push(row);
          }
        }

        dishCount++;
      } else {
        const selectedMeal = item?.selected_meal || {};

        const packagingMaterials = this.sortPackagingMaterials(
          selectedMeal?.variants?.packaging_material || [],
        );

        const materials = packagingMaterials.length ? packagingMaterials : [{}];

        for (let i = 0; i < materials.length; i++) {
          const material = materials[i];

          const ascii =
            materials.length > 1 ? String.fromCharCode(i + 65) : '';

          const fullName = this.customerName(delivery).split(' ');

          const cleanFirst = this.cleanFirstName(fullName?.[0] || '');
          const cleanSecond = this.cleanFirstName(fullName?.[1] || '');

          const firstName =
            cleanFirst?.length <= 2
              ? `${this.capitalize(`${cleanFirst} ${cleanSecond}`)}!`
              : `${this.capitalize(cleanFirst)}!`;

          const row = {
            packaging_material: material?.material || '--',
            first_name: firstName,
            first_name_length:
              cleanFirst?.length <= 2
                ? `${cleanFirst} ${cleanSecond}`.length
                : cleanFirst?.length || 0,
            customer_name: this.customerName(delivery),
            protein_category:
              selectedMeal?.variants?.protein_category || 'balance',
            diet_change:
              selectedMeal?.variants?.protein_category !== item?.protein_category
                ? 'Change'
                : 'No Change',
            item_id: selectedMeal?._id,
            delivery_id: delivery?._id,
            delivery_item_type: item?.meal_type,
            order_number: orderNumber,
            dish_name:
              ascii !== ''
                ? material?.description || '--'
                : material?.description || selectedMeal?.dish_name || '--',
            city: delivery?.address_id?.city || '--',
            slot: normalizedSlot,
            variant:
              ascii !== '' && ascii !== 'A'
                ? '--'
                : selectedMeal?.variants?.protein_option || '--',
            kcal:
              ascii !== '' && ascii !== 'A'
                ? '--'
                : selectedMeal?.variants?.kcal || '--',
            kcal_range: selectedMeal?.variants?.size || '--',
            kcal_range_string: this.getKcalRangeString(item),
            carb_diet_type: this.getCarbDietTypeForCsv(item),
            size:
              this.capitalize(selectedMeal?.variants?.size || '') === 'Standard'
                ? '-'
                : this.capitalize(selectedMeal?.variants?.size || ''),
            protein:
              ascii !== '' && ascii !== 'A'
                ? '--'
                : selectedMeal?.variants?.protein || '--',
            carb:
              ascii !== '' && ascii !== 'A'
                ? '--'
                : selectedMeal?.variants?.carb || '--',
            fat:
              ascii !== '' && ascii !== 'A'
                ? '--'
                : selectedMeal?.variants?.fat || '--',
            is_auto_select: selectedMeal?.is_auto_select,
            label_instruction:
              ascii !== ''
                ? material?.instruction || '--'
                : material?.instruction ||
                selectedMeal?.protein_category_info?.find(
                  (info) =>
                    info?.category ===
                    selectedMeal?.variants?.protein_category,
                )?.label_instruction ||
                selectedMeal?.label_instruction ||
                '--',
            category: selectedMeal?.meal_category || '--',
            internal_code: baseInternalCode,
            internal_code_with_date: baseInternalCode
              ? `${baseInternalCode}${moment(date).format('DDMM')}`
              : null,
            internal_code_with_date_in_logistics: baseInternalCode
              ? `T${baseInternalCode}${moment(date).format('DDMM')}`
              : null,
            dish_code: baseInternalCode
              ? `${baseInternalCode} / ${dishCount}${ascii} - ${delivery?.delivery_item?.length || 0}`
              : null,
            no_of_dishes: delivery?.delivery_item?.length || 0,
            dish_count: dishCount,
            allergens_list:
              materials.length > 1
                ? this.getAllergensForMaterial(
                  packagingMaterials,
                  material,
                  selectedMeal,
                )
                : this.formatAllergens(selectedMeal?.variants?.allergens || []),
            bar_code: baseInternalCode
              ? `${baseInternalCode}D${dishCount}${ascii}`
              : null,
          };

          barcodeRows.push(row);
        }

        dishCount++;
      }
    }

    return { barcodeRows };
  }

  buildBarcodeReport(params: {
    phase: 'Batch1' | 'NDD';
    date: Date;
    deliveryDetails: any[];
    countStart: number;
    driverStepperData: any;
    instruction?: any[];
    coupons?: any[];
    ownDeliveryData?: any[];
  }) {
    const {
      phase,
      date,
      deliveryDetails,
      countStart,
      driverStepperData,
      instruction = [],
      coupons = [],
      ownDeliveryData = [],
    } = params;

    const step2Done = this.getStep2Done(phase, driverStepperData);

    const instructionMap = new Map(
      (instruction || []).flatMap((item) => [
        [item?.id, item?.name],
        [item?.id?.toString?.(), item?.name],
      ]),
    );

    const couponIdSet = new Set(
      (coupons || []).map((coupon) => coupon?._id?.toString()).filter(Boolean),
    );

    const ownDeliverySet = new Set(
      (ownDeliveryData || [])
        .flatMap((city) =>
          (city?.area || []).flatMap((area) =>
            (area?.slot_list || []).map(
              (slot) => `${city?.city}|${area?.name}|${slot?.time}`,
            ),
          ),
        )
        .filter(Boolean),
    );

    const sortedDeliveries = this.sortDeliveriesLikeFrontend(deliveryDetails);

    const normalQueue: any[] = [];
    const bagQueue: any[] = [];
    const ownQueue: any[] = [];
    const missingBarcodeArray: any[] = [];

    for (const delivery of sortedDeliveries) {
      const city = delivery?.address_id?.city?.trim();
      const slot = this.normalizeSlot(delivery?.slot);

      const cityKnown = this.cityRank.has(city);
      const slotKnown = this.slotRank.has(slot);

      if (!cityKnown || !slotKnown) {
        missingBarcodeArray.push(this.getMissingBarcodeObject(delivery));
        continue;
      }

      const tempCustomer = this.getCustomerBarcodeObject({
        delivery,
        date,
        customerCount: countStart,
        step2Done,
        instructionMap,
        couponIdSet,
      });

      const isBagDelivery = tempCustomer?.bag_opted === 'Yes';
      const isOwnDelivery = this.isOwnDelivery(tempCustomer, ownDeliverySet);

      if (isOwnDelivery) {
        ownQueue.push(delivery);
      } else if (isBagDelivery) {
        bagQueue.push(delivery);
      } else {
        normalQueue.push(delivery);
      }
    }

    const normalCustomers: any[] = [];
    const bagCustomers: any[] = [];
    const ownDeliveryCustomers: any[] = [];

    const normalItems: any[] = [];
    const bagItems: any[] = [];
    const ownDeliveryItems: any[] = [];

    let customerCount = countStart;

    const processQueue = (
      queue: any[],
      customerTarget: any[],
      itemTarget: any[],
    ) => {
      for (const delivery of queue) {
        const customer = this.getCustomerBarcodeObject({
          delivery,
          date,
          customerCount,
          step2Done,
          instructionMap,
          couponIdSet,
        });

        const itemResult = this.getItemBarcodeRows({
          delivery,
          phase,
          date,
          customerCount,
          step2Done,
        });

        customerTarget.push(customer);
        itemTarget.push(...itemResult.barcodeRows);

        if (!step2Done && !delivery?.customer_internal_code) {
          customerCount++;
        }
      }
    };

    processQueue(normalQueue, normalCustomers, normalItems);
    processQueue(bagQueue, bagCustomers, bagItems);
    processQueue(ownQueue, ownDeliveryCustomers, ownDeliveryItems);

    missingBarcodeArray.sort((a, b) => {
      const slotA = this.slotRank.get(a?.slot) ?? 999;
      const slotB = this.slotRank.get(b?.slot) ?? 999;

      if (slotA !== slotB) return slotA - slotB;

      return Number(a?.order_number || 0) - Number(b?.order_number || 0);
    });

    return {
      stepperStatus: {
        step1: true,
        step2: step2Done,
        step3: false,
        step4: false,
        canGenerateBarcode: !step2Done,
        isFinalized: step2Done,
      },
      countStart,
      deliveryCount: deliveryDetails?.length || 0,
      barcodeList: [...normalItems, ...bagItems, ...ownDeliveryItems],
      customerBarcodeList: [
        ...normalCustomers,
        ...bagCustomers,
        ...ownDeliveryCustomers,
      ],
      missingBarcodeArray,
    };
  }
}