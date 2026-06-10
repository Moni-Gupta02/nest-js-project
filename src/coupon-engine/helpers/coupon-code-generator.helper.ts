/**
 * Helper class for generating coupon codes
 */
export class CouponCodeGeneratorHelper {
  /**
   * Generate random alphanumeric string
   */
  static generateRandomString(length: number): string {
    const chars =
      '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate array of coupon codes for bulk coupons
   */
  static generateBulkCouponCodes(
    count: number,
    prefix: string,
    startSerialNumber: number,
    needAlphanumeric: boolean,
    startIndex: number = 0,
  ): string[] {
    const couponCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const serialNumber = startSerialNumber + startIndex + i;
      if (needAlphanumeric) {
        couponCodes.push(
          prefix + this.generateRandomString(6) + serialNumber,
        );
      } else {
        couponCodes.push(prefix + serialNumber);
      }
    }

    return couponCodes;
  }
}
