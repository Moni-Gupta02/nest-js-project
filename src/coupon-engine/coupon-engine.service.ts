import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as moment from 'moment';

import {
  Coupon,
  CouponDocument,
} from './schemas/coupon-engine.schema';

import {
  Loyalty,
  LoyaltyDocument,
} from './schemas/coupon-loyalty.schema';

import {
  Customer,
  CustomerDocument,
} from 'src/customer/schemas/customer.schema';

import {
  CouponResponseDto,
  CreateCouponDto,
} from './dto/create-coupon-engine.dto';

import {
  SubscriptionFixPrice,
  SubscriptionFixPriceDocument,
} from 'src/subscription/schemas/subscriptionFixPrice';


import { CouponValidationHelper } from './helpers/coupon-validation.helper';
import { CouponCodeGeneratorHelper } from './helpers/coupon-code-generator.helper';

@Injectable()
export class CouponEngineService {
  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,

    @InjectModel(Loyalty.name)
    private readonly loyaltyModel: Model<LoyaltyDocument>,

    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,

    @InjectModel('subscription_fix_prices')
    private readonly subscriptionFixPriceModel: Model<SubscriptionFixPriceDocument>,
  ) { }


  async getSubscriptionPriceData() {
    const subscriptionPriceData = await this.subscriptionFixPriceModel
      .find({})
      .lean<any[]>();

    const daysSet = new Set<number>();

    const firstPriceDoc = subscriptionPriceData?.[0] as any;

    if (firstPriceDoc?.durations?.length > 0) {
      firstPriceDoc.durations.forEach((durationItem: any) => {
        if (durationItem?.days?.length > 0) {
          durationItem.days.forEach((dayItem: any) => {
            const dayNumber = Number(dayItem);

            if (!isNaN(dayNumber)) {
              daysSet.add(dayNumber);
            }
          });
        }
      });
    }

    const daysArray = Array.from(daysSet).sort((a, b) => a - b);

    return {
      days: daysArray,
      options: [
        { label: 'All', value: 'all' },
        ...daysArray.map((day) => ({
          label: String(day),
          value: day,
        })),
      ],
    };
  }

  async customerListForCoupon(search = '', limit = 20) {
    const safeLimit = Math.min(Number(limit) || 20, 50);
    const searchText = String(search || '').trim();

    const firstSearch = searchText.split(' ')?.[0] || '';
    const secondSearch = searchText.split(' ')?.[1] || '';

    const query: any = {
      user_register_flag: 'user_verified',
    };

    if (searchText) {
      query.$or = [
        { first_name: { $regex: searchText, $options: 'i' } },
        { last_name: { $regex: searchText, $options: 'i' } },
        {
          $and: [
            { first_name: { $regex: firstSearch, $options: 'i' } },
            { last_name: { $regex: secondSearch, $options: 'i' } },
          ],
        },
        {
          $and: [
            { first_name: { $regex: secondSearch, $options: 'i' } },
            { last_name: { $regex: firstSearch, $options: 'i' } },
          ],
        },
        { phone_number: { $regex: searchText, $options: 'i' } },
        { whatsapp_number: { $regex: searchText, $options: 'i' } },
        { email: { $regex: searchText, $options: 'i' } },
      ];
    }

    const customers = await this.customerModel
      .find(query, {
        first_name: 1,
        last_name: 1,
        email: 1,
        country_code: 1,
        phone_number: 1,
        whatsapp_country_code: 1,
        whatsapp_number: 1,
      })
      .sort({ createdAt: -1 })
      .limit(safeLimit)
      .lean();

    return customers.map((customer: any) => ({
      _id: customer._id,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      country_code: customer.country_code,
      phone_number: customer.phone_number,
      whatsapp_country_code: customer.whatsapp_country_code,
      whatsapp_number: customer.whatsapp_number,

      // frontend selection-ready data
      name: `${customer?.first_name || ''} ${customer?.last_name || ''}`.trim(),
      phone: `${customer?.country_code || ''} ${customer?.phone_number || ''}`.trim(),
      whatsapp: `${customer?.whatsapp_country_code || ''} ${customer?.whatsapp_number || ''}`.trim(),
      customer_id: String(customer._id),
    }));
  }

  async getCouponLoyaltyOptions() {
    const loyalties = await this.loyaltyModel
      .find(
        { loyalty_type: 'Coupon' },
        {
          discount_value: 1,
          max_cap: 1,
          max_discount: 1,
          active: 1,
        },
      )
      .sort({ createdAt: -1 })
      .lean();

    return (loyalties || []).map((l: any) => {
      const discountValue = l?.discount_value ?? 0;
      const maxCap = !!l?.max_cap;
      const maxDiscount = l?.max_discount ?? 0;

      const label = maxCap
        ? `${discountValue}% Cashback - ${maxDiscount} AED Max`
        : `${discountValue}% Cashback`;

      return {
        value: String(l?._id),
        label,
        max_cap: maxCap,
        max_discount: maxDiscount,
        discount_value: discountValue,
        active: !!l?.active,
      };
    });
  }

  async createCoupon(
    createCouponDto: CreateCouponDto,
  ): Promise<CouponResponseDto> {
    try {
      const eligibilityTemp = await this.processEligibility(
        createCouponDto.eligibility,
      );

      const finalPayload: any = {
        coupon_type: createCouponDto.coupon_type,
        description: createCouponDto.description,
        auto_apply: createCouponDto.auto_apply || false,
        eligibility: eligibilityTemp,
      };

      if (createCouponDto.start_date) {
        finalPayload.start_date = new Date(createCouponDto.start_date);
      }

      if (createCouponDto.end_date) {
        finalPayload.end_date = new Date(createCouponDto.end_date);
      }

      if (
        createCouponDto.total_times_uses !== undefined &&
        createCouponDto.total_times_uses !== null &&
        createCouponDto.total_times_uses !== ('' as any) &&
        createCouponDto.total_times_uses !== 0
      ) {
        finalPayload.total_times_uses =
          parseInt(String(createCouponDto.total_times_uses)) || 0;
      }

      if (createCouponDto.start_date) {
        const today = new Date();
        today.setDate(today.getDate() - 1);

        if (
          new Date(
            moment(createCouponDto.start_date)
              .utcOffset(240)
              .format('YYYY-MM-DDTHH:mm:ss.SSS[Z]'),
          ) < moment(today).utcOffset(240).endOf('day').toDate()
        ) {
          return {
            message: 'Start Date Should Be Greater Than Yesterday!',
            status: true,
            data: null,
          };
        }
      }

      const dateValidationError = CouponValidationHelper.validateDates(
        createCouponDto.start_date,
        createCouponDto.end_date,
      );

      if (dateValidationError) return dateValidationError;

      if (createCouponDto.coupon_type === 'single') {
        return await this.createSingleCoupon(createCouponDto, finalPayload);
      }

      if (createCouponDto.coupon_type === 'bulk') {
        return await this.createBulkCoupon(createCouponDto, finalPayload);
      }

      throw new BadRequestException('Invalid coupon type');
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException(error.message || 'Failed to create coupon');
    }
  }

  private async processEligibility(eligibility: any[] = []): Promise<any[]> {
    return eligibility.map((eliItm: any) => {
      const tempEliItm = { ...eliItm };

      delete tempEliItm._id;

      if (tempEliItm?.eligibility_type !== 'discount') {
        delete tempEliItm.loyalty_id;
      }

      const eligibleValueTemp: any[] = [];

      tempEliItm?.customer_eligibility_value?.forEach((custItm: any) => {
        eligibleValueTemp.push(
          new Types.ObjectId(custItm?.customer_id || custItm),
        );
      });

      return {
        ...tempEliItm,
        customer_eligibility_value: eligibleValueTemp,
      };
    });
  }

  private async createSingleCoupon(
    createCouponDto: CreateCouponDto,
    finalPayload: any,
  ): Promise<CouponResponseDto> {
    finalPayload.name = createCouponDto.single_name;
    finalPayload.customer_display = createCouponDto.customer_display || false;
    finalPayload.coupon_code = createCouponDto.coupon_code?.trim();
    finalPayload.coupon_title = createCouponDto.coupon_title;
    finalPayload.button_title = createCouponDto.button_title;
    finalPayload.is_live = createCouponDto.is_live;

    const validationError =
      CouponValidationHelper.validateSingleCouponFields(finalPayload);

    if (validationError) return validationError;

    const checkCouponCode = await this.couponModel.findOne({
      coupon_code: finalPayload?.coupon_code,
    });

    if (checkCouponCode) {
      return {
        status: true,
        message: 'This Coupon Code Already Exist!',
        data: null,
      };
    }

    const createCoupon = await this.couponModel.create(finalPayload);

    return {
      message: 'Single Coupon Created Successfully!',
      status: true,
      data: createCoupon,
    };
  }

  private async createBulkCoupon(
    createCouponDto: CreateCouponDto,
    finalPayload: any,
  ): Promise<CouponResponseDto> {
    finalPayload.name = createCouponDto.bulk_name;
    finalPayload.customer_display = false;
    finalPayload.agency_name = createCouponDto.agency_name;
    finalPayload.company = createCouponDto.company;
    finalPayload.no_of_coupons = createCouponDto.no_of_coupons;
    finalPayload.coupon_pattern = createCouponDto.coupon_pattern;
    finalPayload.need_alphanumeric_code =
      createCouponDto.need_alphanumeric_code;

    if (!finalPayload?.name) {
      return {
        message: 'Campaign Name Should Be Filled!',
        status: true,
        data: null,
      };
    }

    if (!finalPayload?.agency_name) {
      return {
        message: 'Agency Name Should Be Filled!',
        status: true,
        data: null,
      };
    }

    if (!finalPayload?.company) {
      return {
        message: 'Company Should Be Filled!',
        status: true,
        data: null,
      };
    }

    if (!finalPayload?.no_of_coupons) {
      return {
        message: 'Number of Coupons Should Be Filled!',
        status: true,
        data: null,
      };
    }

    if (finalPayload?.no_of_coupons > 1000) {
      return {
        message: 'Number of coupons should be less than 1000',
        status: true,
        data: null,
      };
    }

    if (!finalPayload?.coupon_pattern?.pre_fix) {
      return {
        message: 'Coupon Initials Should Be Filled!',
        status: true,
        data: null,
      };
    }

    if (!finalPayload?.coupon_pattern?.serial_number) {
      return {
        message: 'Coupon Serial Number Should Be Filled!',
        status: true,
        data: null,
      };
    }

    const checkCampaignName = await this.couponModel.findOne({
      name: finalPayload.name,
    });

    if (checkCampaignName) {
      return {
        message: 'Campaign Name Already Exist!',
        status: true,
        data: null,
      };
    }

    const checkCouponInitials = await this.couponModel.findOne({
      'coupon_pattern.pre_fix': finalPayload.coupon_pattern?.pre_fix,
      coupon_type: 'bulk',
    });

    if (checkCouponInitials) {
      return {
        message: 'This Coupon Initial Is Already Been Taken!',
        status: true,
        data: null,
      };
    }

    const couponCodes: string[] = [];

    for (let i = 0; i < finalPayload.no_of_coupons; i++) {
      const serialNumber = finalPayload.coupon_pattern?.serial_number + i;

      if (finalPayload?.need_alphanumeric_code) {
        couponCodes.push(
          finalPayload.coupon_pattern?.pre_fix +
          this.generateRandomString(6) +
          serialNumber,
        );
      } else {
        couponCodes.push(finalPayload.coupon_pattern?.pre_fix + serialNumber);
      }
    }

    const checkAlreadyExisitingCoupon = await this.couponModel.find(
      { coupon_code: { $in: couponCodes } },
      { coupon_code: 1 },
    );

    if (checkAlreadyExisitingCoupon?.length > 0) {
      const sameCoupon = checkAlreadyExisitingCoupon.map(
        (couponItm: any) => couponItm?.coupon_code,
      );

      return {
        message: `Coupon Code ${sameCoupon?.join(', ')} Already Exist Try Different`,
        status: true,
        data: null,
      };
    }

    const chunkSize = 100;

    for (let i = 0; i < couponCodes.length; i += chunkSize) {
      const chunk = couponCodes.slice(i, i + chunkSize);

      const bulkOps = chunk.map((couponCode) => ({
        insertOne: {
          document: {
            ...finalPayload,
            coupon_code: couponCode,
          },
        },
      }));

      if (bulkOps.length > 0) {
        await this.couponModel.bulkWrite(bulkOps);
      }
    }

    return {
      message: 'Bulk Coupon Created Successfully!',
      status: true,
      data: null,
    };
  }

  private generateRandomString(length: number): string {
    return CouponCodeGeneratorHelper.generateRandomString(length);
  }

  async getAllCoupons(
    page: number = 1,
    limit: number = 10,
    couponType?: string,
    sort: string = 'createdAt',
    order: string = '-1',
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const filter: any = {};

    if (couponType) {
      filter.coupon_type = couponType;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');

      filter.$or = [
        { name: searchRegex },
        { coupon_code: searchRegex },
        { coupon_title: searchRegex },
      ];
    }

    const sortOrder: 1 | -1 = order === '-1' ? -1 : 1;
    const sortQuery = { [sort]: sortOrder };

    const [coupons, total] = await Promise.all([
      this.couponModel
        .find(filter)
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.couponModel.countDocuments(filter),
    ]);

    return {
      data: coupons,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCouponById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid coupon id');
    }

    const coupon = await this.couponModel.findById(id).lean();

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return coupon;
  }

  async updateCoupon(
    id: string,
    updateData: any,
    campaignName?: string,
  ): Promise<CouponResponseDto> {
    try {
      let existingCoupon: any = null;
      let originalCampaignName = '';

      if (updateData?.coupon_type === 'bulk') {
        originalCampaignName = campaignName || updateData?.bulk_name;

        existingCoupon = await this.couponModel
          .findOne({ name: originalCampaignName })
          .lean();

        if (!existingCoupon) {
          return {
            message: 'Coupon not found',
            status: true,
            data: null,
          };
        }
      } else {
        if (!Types.ObjectId.isValid(id)) {
          throw new BadRequestException('Invalid coupon id');
        }

        existingCoupon = await this.couponModel.findById(id).lean();

        if (!existingCoupon) {
          return {
            message: 'Coupon not found',
            status: true,
            data: null,
          };
        }
      }

      const eligibilityTemp = await this.processEligibility(
        updateData.eligibility || [],
      );

      const finalPayload: any = {
        coupon_type: updateData?.coupon_type,
        description: updateData?.description,
        auto_apply: updateData?.auto_apply,
        eligibility: eligibilityTemp,
        total_times_uses: updateData?.total_times_uses
          ? updateData?.total_times_uses
          : 0,
      };

      if (updateData?.start_date) {
        finalPayload.start_date = new Date(updateData?.start_date);
      }

      if (updateData?.end_date) {
        finalPayload.end_date = new Date(updateData?.end_date);
      }

      const startDateToCheck =
        finalPayload.start_date || existingCoupon.start_date;

      const endDateToCheck = finalPayload.end_date || existingCoupon.end_date;

      if (startDateToCheck && endDateToCheck) {
        if (new Date(endDateToCheck) <= new Date(startDateToCheck)) {
          return {
            message: 'End Date Should Be Greater Than Start Date!',
            status: true,
            data: null,
          };
        }
      }

      if (updateData?.coupon_type === 'single') {
        finalPayload.name = updateData?.single_name;
        finalPayload.customer_display = updateData?.customer_display || false;
        finalPayload.coupon_code = updateData?.coupon_code?.trim();
        finalPayload.coupon_title = updateData?.coupon_title;
        finalPayload.button_title = updateData?.button_title;
        finalPayload.is_live = updateData?.is_live;

        if (!finalPayload?.name) {
          return {
            message: 'Name / Coupon Label Should Be Filled!',
            status: true,
            data: null,
          };
        }

        if (!finalPayload?.coupon_code) {
          return {
            message: 'Coupon Code Should Be Filled!',
            status: true,
            data: null,
          };
        }

        if (!finalPayload?.coupon_title) {
          return {
            message: 'Coupon Title Should Be Filled!',
            status: true,
            data: null,
          };
        }

        const checkCouponCode = await this.couponModel.findOne({
          coupon_code: finalPayload?.coupon_code,
          _id: { $ne: new Types.ObjectId(id) },
        });

        if (checkCouponCode) {
          return {
            status: true,
            message: 'This Coupon Code Already Exist!',
            data: null,
          };
        }

        const updatedCoupon = await this.couponModel.findByIdAndUpdate(
          new Types.ObjectId(id),
          finalPayload,
          { new: true, upsert: false },
        );

        return {
          message: 'Single Coupon Updated Successfully!',
          data: updatedCoupon,
          status: true,
        };
      }

      if (updateData?.coupon_type === 'bulk') {
        finalPayload.name = updateData?.bulk_name;
        finalPayload.customer_display = false;
        finalPayload.agency_name = updateData?.agency_name;
        finalPayload.company = updateData?.company;
        finalPayload.no_of_coupons = updateData?.no_of_coupons;

        finalPayload.coupon_pattern = {
          pre_fix: existingCoupon.coupon_pattern?.pre_fix,
          serial_number: existingCoupon.coupon_pattern?.serial_number,
        };

        finalPayload.need_alphanumeric_code =
          existingCoupon.need_alphanumeric_code;

        if (!finalPayload?.name) {
          return {
            message: 'Campaign Name Should Be Filled!',
            status: true,
            data: null,
          };
        }

        if (!finalPayload?.agency_name) {
          return {
            message: 'Agency Name Should Be Filled!',
            status: true,
            data: null,
          };
        }

        if (!finalPayload?.no_of_coupons) {
          return {
            message: 'Number of Coupons Should Be Filled!',
            status: true,
            data: null,
          };
        }

        if (finalPayload?.no_of_coupons > 1000) {
          return {
            message: 'Number of coupons should be less than 1000',
            status: true,
            data: null,
          };
        }

        if (finalPayload.name !== originalCampaignName) {
          const checkCampaignName = await this.couponModel.findOne({
            name: finalPayload.name,
          });

          if (checkCampaignName) {
            return {
              message: 'Campaign Name Already Exist!',
              status: true,
              data: null,
            };
          }
        }

        const couponPreviousCouponNumbers =
          await this.couponModel.countDocuments({
            name: originalCampaignName,
          });

        if (
          parseInt(String(finalPayload.no_of_coupons)) <
          couponPreviousCouponNumbers
        ) {
          return {
            message: `Number of coupons can't be decreased. Existing coupons count is ${couponPreviousCouponNumbers}`,
            status: true,
            data: null,
          };
        }

        await this.couponModel.updateMany(
          { name: originalCampaignName },
          finalPayload,
        );

        if (
          parseInt(String(finalPayload.no_of_coupons)) >
          couponPreviousCouponNumbers
        ) {
          const extraCouponCount =
            parseInt(String(finalPayload.no_of_coupons)) -
            couponPreviousCouponNumbers;

          const couponCodes: string[] = [];

          for (let i = 0; i < extraCouponCount; i++) {
            const serialNumber =
              finalPayload.coupon_pattern?.serial_number +
              couponPreviousCouponNumbers +
              i;

            if (finalPayload?.need_alphanumeric_code) {
              couponCodes.push(
                finalPayload.coupon_pattern?.pre_fix +
                this.generateRandomString(6) +
                serialNumber,
              );
            } else {
              couponCodes.push(
                finalPayload.coupon_pattern?.pre_fix + serialNumber,
              );
            }
          }

          const checkAlreadyExisitingCoupon = await this.couponModel.find(
            { coupon_code: { $in: couponCodes } },
            { coupon_code: 1 },
          );

          if (checkAlreadyExisitingCoupon?.length > 0) {
            const sameCoupon = checkAlreadyExisitingCoupon.map(
              (couponItm: any) => couponItm?.coupon_code,
            );

            return {
              message: `Coupon Code ${sameCoupon?.join(', ')} Already Exist Try Different`,
              status: true,
              data: null,
            };
          }

          const chunkSize = 100;

          for (let i = 0; i < couponCodes.length; i += chunkSize) {
            const chunk = couponCodes.slice(i, i + chunkSize);

            const bulkOps = chunk.map((couponCode) => ({
              insertOne: {
                document: {
                  ...finalPayload,
                  coupon_code: couponCode,
                },
              },
            }));

            if (bulkOps.length > 0) {
              await this.couponModel.bulkWrite(bulkOps);
            }
          }
        }

        return {
          message: 'Bulk Coupon Updated Successfully!',
          data: null,
          status: true,
        };
      }

      return {
        message: 'Coupon Updated Successfully!',
        status: true,
        data: null,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new BadRequestException(error.message || 'Failed to update coupon');
    }
  }

  async deleteCoupon(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid coupon id');
    }

    const result = await this.couponModel.findByIdAndDelete(id);

    if (!result) {
      throw new NotFoundException('Coupon not found');
    }

    return {
      message: 'Coupon deleted successfully',
    };
  }

  async createCouponLoyalty(payload: {
    discount_value: number;
    max_cap?: boolean;
    max_discount?: number;
  }) {
    const parsedDiscountValue = Number(payload?.discount_value);
    const parsedMaxDiscount = Number(payload?.max_discount);
    const maxCapBool = !!payload?.max_cap;

    if (isNaN(parsedDiscountValue) || parsedDiscountValue <= 0) {
      return {
        alert: true,
        message: 'Please enter a valid Discount Value (> 0)',
        data: null,
      };
    }

    if (parsedDiscountValue > 100) {
      return {
        alert: true,
        message: 'Discount Value (%) should be <= 100',
        data: null,
      };
    }

    if (maxCapBool && (isNaN(parsedMaxDiscount) || parsedMaxDiscount <= 0)) {
      return {
        alert: true,
        message:
          'Please enter a valid Max Discount (> 0) when Max Cap is enabled',
        data: null,
      };
    }

    const loyalty = await this.loyaltyModel.create({
      level: 'level_1',
      loyalty_name: 'Coupon',
      loyalty_type: 'Coupon',
      description: 'Level 1',
      reward_type: 'reward',
      discount_type: 'percentage',
      discount_value: parsedDiscountValue,
      minimum_purchage: 'no_minimum',
      minimum_purchage_value: 0,
      order_eligibility: 'all',
      plan_eligibility: 'all',
      customer_eligibility: 'all',
      active: true,
      max_cap: maxCapBool,
      max_discount: maxCapBool ? parsedMaxDiscount : 0,
    });

    const label = loyalty.max_cap
      ? `${loyalty.discount_value}% Cashback - ${loyalty.max_discount} AED Max`
      : `${loyalty.discount_value}% Cashback`;

    return {
      alert: true,
      message: 'Additional Discount (Loyalty) created successfully',
      data: {
        _id: loyalty._id,
        value: String(loyalty._id),
        label,
        max_cap: loyalty.max_cap,
        max_discount: loyalty.max_discount,
        discount_value: loyalty.discount_value,
        active: loyalty.active,
      },
    };
  }
}