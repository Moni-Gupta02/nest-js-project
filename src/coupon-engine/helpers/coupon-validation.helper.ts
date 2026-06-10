import { CouponResponseDto } from '../dto/create-coupon-engine.dto';

export class CouponValidationHelper {
  static validateRequiredField(
    value: any,
    fieldName: string,
  ): CouponResponseDto | null {
    if (value === '' || value === undefined || value === null) {
      return {
        message: `${fieldName} Should Be Filled!`,
        status: false,
        data: null,
      };
    }

    return null;
  }

  static validateSingleCouponFields(
    finalPayload: any,
  ): CouponResponseDto | null {
    const nameError = this.validateRequiredField(
      finalPayload?.name,
      'Name / Coupon Label',
    );
    if (nameError) return nameError;

    const codeError = this.validateRequiredField(
      finalPayload?.coupon_code,
      'Coupon Code',
    );
    if (codeError) return codeError;

    const titleError = this.validateRequiredField(
      finalPayload?.coupon_title,
      'Coupon Title',
    );
    if (titleError) return titleError;

    if (
      finalPayload?.total_times_uses !== undefined &&
      finalPayload?.total_times_uses !== null &&
      Number(finalPayload?.total_times_uses) <= 0
    ) {
      return {
        message: 'Maximum Time Coupon Usage Should Be Greater Than 0!',
        status: false,
        data: null,
      };
    }

    return null;
  }

  static validateBulkCouponFields(finalPayload: any): CouponResponseDto | null {
    const nameError = this.validateRequiredField(
      finalPayload?.name,
      'Campaign Name',
    );
    if (nameError) return nameError;

    const agencyError = this.validateRequiredField(
      finalPayload?.agency_name,
      'Agency Name',
    );
    if (agencyError) return agencyError;

    const companyError = this.validateRequiredField(
      finalPayload?.company,
      'Company',
    );
    if (companyError) return companyError;

    if (
      finalPayload?.no_of_coupons === '' ||
      finalPayload?.no_of_coupons === undefined ||
      finalPayload?.no_of_coupons === null ||
      Number(finalPayload?.no_of_coupons) <= 0
    ) {
      return {
        message: 'Number of Coupons Should Be Filled!',
        status: false,
        data: null,
      };
    }

    if (Number(finalPayload?.no_of_coupons) > 1000) {
      return {
        message: 'Max Coupon Can be 1000!',
        status: false,
        data: null,
      };
    }

    const prefixError = this.validateRequiredField(
      finalPayload?.coupon_pattern?.pre_fix,
      'Coupon Initials',
    );
    if (prefixError) return prefixError;

    if (
      finalPayload?.coupon_pattern?.serial_number === '' ||
      finalPayload?.coupon_pattern?.serial_number === undefined ||
      finalPayload?.coupon_pattern?.serial_number === null ||
      Number(finalPayload?.coupon_pattern?.serial_number) <= 0
    ) {
      return {
        message: 'Coupon Serial Number Should Be Filled!',
        status: false,
        data: null,
      };
    }

    return null;
  }

  static validateDates(
    start_date: any,
    end_date: any,
  ): CouponResponseDto | null {
    if (!end_date) {
      return {
        message: 'Please Enter End Date!',
        status: false,
        data: null,
      };
    }

    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      return {
        message: 'End Date Should Be Greater Than Start Date!',
        status: false,
        data: null,
      };
    }

    return null;
  }

  static validateEligibilityList(eligibility: any[]): CouponResponseDto | null {
    if (!eligibility || !Array.isArray(eligibility) || eligibility.length <= 0) {
      return {
        message: 'Please Enter Eligibility Of Coupon!',
        status: false,
        data: null,
      };
    }

    if (eligibility.length > 15) {
      return {
        message: 'Maximum 15 Eligibility Criteria is Possible!',
        status: false,
        data: null,
      };
    }

    return null;
  }

  static validateEligibilityItem(item: any): CouponResponseDto | null {
    if (!item?.diet_type || item.diet_type.length <= 0) {
      return {
        message: 'Please Select Atleast 1 Diet Type!',
        status: false,
        data: null,
      };
    }

    if (!item?.order_type || item.order_type.length <= 0) {
      return {
        message: 'Please Select Atleast 1 Plan!',
        status: false,
        data: null,
      };
    }

    if (!item?.plan_type || item.plan_type.length <= 0) {
      return {
        message: 'Please Select Atleast 1 Plan Type!',
        status: false,
        data: null,
      };
    }

    if (item?.discount_type === 'free_meals' && item?.free_meal?.length <= 0) {
      return {
        message: 'Please Select Atleast 1 Meal and days!',
        status: false,
        data: null,
      };
    }

    if (
      item?.discount_type === 'percentage' &&
      (item?.percentage_discount_type === null ||
        item?.percentage_discount_type === undefined)
    ) {
      return {
        message: 'Please Enter Percentage Type!',
        status: false,
        data: null,
      };
    }

    if (
      item?.discount_type === 'percentage' &&
      item?.percentage_discount_type === 'overall' &&
      !item?.discount_value
    ) {
      return {
        message: 'Please Enter Discount Percentage!',
        status: false,
        data: null,
      };
    }

    if (
      item?.discount_type === 'percentage' &&
      item?.percentage_discount_type === 'selected' &&
      item?.percent_meal?.length <= 0
    ) {
      return {
        message: 'Please Select Atleast 1 Meal And Its Percentage Discount!',
        status: false,
        data: null,
      };
    }

    if (item?.discount_type === 'value' && !item?.discount_value) {
      return {
        message: 'Please Enter Discount Value!',
        status: false,
        data: null,
      };
    }

    if (
      item?.discount_type === 'free_days' &&
      (!item?.discount_value || Number(item?.discount_value) <= 0)
    ) {
      return {
        message:
          'Please Enter No Of Free Days And It Should Be Greater Than Zero!',
        status: false,
        data: null,
      };
    }

    if (
      item?.discount_type === 'percentage' &&
      item?.percentage_discount_type === 'overall' &&
      Number(item?.discount_value) > 100
    ) {
      return {
        message: 'Discount Percentage Should Be Less Then Or Equal to 100',
        status: false,
        data: null,
      };
    }

    if (
      item?.use_max_discount &&
      (!item?.max_discount_value || Number(item?.max_discount_value) <= 0)
    ) {
      return {
        message: 'Please Enter Maximum Discount Value!',
        status: false,
        data: null,
      };
    }

    if (
      item?.minimum_purchage !== 'no_minimum' &&
      Number(item?.minimum_purchage_value) <= 0
    ) {
      return {
        message: 'Minimum Purchase Value/Quantity Should Be Greater Than 0',
        status: false,
        data: null,
      };
    }

    if (!item?.limit_per_user || Number(item?.limit_per_user) <= 0) {
      return {
        message: 'Limit Per User Should Be Greater Than 0',
        status: false,
        data: null,
      };
    }

    if (
      item?.type_of_order === 'specific_customers' &&
      (!item?.customer_eligibility_value ||
        item?.customer_eligibility_value?.length <= 0)
    ) {
      return {
        message: 'Please Select Alteast 1 Customer',
        status: false,
        data: null,
      };
    }

    return null;
  }
}