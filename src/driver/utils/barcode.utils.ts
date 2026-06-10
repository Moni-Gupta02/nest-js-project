import * as moment from 'moment';

export function cleanAndCapitalize(string: string): string {
  if (!string) return '';

  const cleanedString = string
    .replace(/_/g, ' ')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim();

  const capitalizedWords = cleanedString
    .split(' ')
    .map((word) => {
      if (word === word.toUpperCase() && word.length > 1) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      } else {
        return word.charAt(0).toUpperCase() + word.slice(1);
      }
    })
    .join(' ');

  return capitalizedWords;
}

export const hasInfluencerCoupon = (
  deliveryData: any,
  couponList: any[],
): boolean => {
  if (!couponList || couponList.length === 0) return false;

  const couponId =
    deliveryData?.order_id?.coupon_id ||
    deliveryData?.subscription_id?.coupon_id ||
    deliveryData?.coupon_id;

  if (!couponId) return false;

  return couponList.some((couponItm) => {
    const match =
      couponItm._id && couponItm._id.toString() === couponId.toString();
    return match;
  });
};

export const getInternalCode = (
  delivery: any,
  customerCount: number,
  phase: string,
  driverStepperData: any,
): string => {
  if (delivery?.customer_internal_code) return delivery.customer_internal_code;

  const isStep2Done =
    phase === 'MP'
      ? driverStepperData?.mp?.step2
      : driverStepperData?.batch1?.step2;
  return isStep2Done ? null : `C${customerCount.toString().padStart(3, '0')}`;
};

export const getKcalRangeString = (item: any): string => {
  const size = item?.selected_meal?.variants?.size?.toLowerCase();
  const mealType = item?.selected_meal?.meal_type;
  const mealCategory = item?.selected_meal?.meal_category;

  if (size === 'onesize') return 'Regular';
  else if (size === 'standard') {
    if (mealType === 'breakfast') return `Standard - ${mealCategory}`;
    else if (mealType === 'morning_snack' || mealType === 'evening_snack')
      return 'Standard - Snack';
    return 'Standard';
  }

  const sizeMap: { [key: string]: string } = {
    extrasmall: 'XS',
    extralarge: 'XL',
    large: 'L',
    small: 'S',
    medium: 'M',
  };
  const proteinCategory = item?.selected_meal?.variants?.protein_category;
  const proteinString =
    proteinCategory === 'low'
      ? 'Low Carb'
      : proteinCategory === 'high'
        ? 'High Carb'
        : 'Balanced';

  return `${proteinString} ${sizeMap[size] || cleanAndCapitalize(size)} Meal`;
};

export const getTypeOfOrder = (delivery: any): string => {
  if (delivery?.order_id?.type_of_order === 'new') return 'New';
  if (delivery?.order_id?.type_of_order === 're-new') {
    return delivery?.order_id?.welcome_back ? 'Welcome Back' : 'Re New';
  }
  return '';
};
// export const parseDateInput = (dateStr: string) => {
//   try {
//     // Accept YYYY-MM-DD and convert to MongoDB UTC timestamp
//     if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
//       const dateObj = new Date(dateStr + 'T00:00:00.000Z');
//       return moment(dateObj)
//         .startOf('day')
//         .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
//     }
//     // Fallback for ISO dates
//     return moment(new Date(dateStr))
//       .startOf('day')
//       .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
//   } catch {
//     throw new Error('Invalid date format. Use YYYY-MM-DD (e.g. 2026-01-12)');
//   }
// };
// ✅ FIXED - Works everywhere
// ✅ FIXED - Replace in barcode.utils.ts
export const parseDateInput = (dateStr: string): string => {
  try {
    // 1. Validate YYYY-MM-DD format
    const yyyyMmDdRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!yyyyMmDdRegex.test(dateStr)) {
      throw new Error('Date must be YYYY-MM-DD format');
    }

    // 2. Split and validate components
    const [year, month, day] = dateStr.split('-').map(Number);

    // 3. Check valid ranges
    if (year < 1900 || year > 2100) throw new Error('Invalid year');
    if (month < 1 || month > 12) throw new Error('Invalid month');
    if (day < 1 || day > 31) throw new Error('Invalid day');

    // 4. Create UTC date (month is 0-indexed)
    const dateObj = new Date(Date.UTC(year, month - 1, day));

    // 5. Verify it's a real date
    if (
      isNaN(dateObj.getTime()) ||
      dateObj.getUTCFullYear() !== year ||
      dateObj.getUTCMonth() !== month - 1 ||
      dateObj.getUTCDate() !== day
    ) {
      throw new Error('Invalid date (e.g. Feb 30)');
    }

    // 6. Format for MongoDB
    return moment(dateObj)
      .utc()
      .startOf('day')
      .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');
  } catch (error) {
    console.error('🚨 parseDateInput failed:', dateStr, error);
    throw new Error('Invalid date format. Use YYYY-MM-DD (e.g. 2026-01-12)');
  }
};
