import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { uploadExceelFile } from '../common/utils/awsServices';
import { NotificationMasterService } from '../notification_master/notification_master.service';
// import moment from 'moment'; // ✅ FIXED
import { InjectModel } from '@nestjs/mongoose';
import { Cron } from '@nestjs/schedule';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as moment from 'moment';
import { Model, Types } from 'mongoose';
import * as path from 'path';
import { Cart } from '../cart/Schemas/cart.schema';
import { Master, MasterDocument } from '../common/schema/masterData.schema';
import {
  Customer,
  CustomerDocument,
} from '../customer/schemas/customer.schema';
import { UpdateLeadStageDto } from './dto/update-lead-stage.dto';
import {
  LEAD_FUNNEL_STAGES,
  LEAD_STAGE,
  MQL_SUB_STAGES,
  MQL_SUB_STAGE_CODES,
  resolveLeadHistorySource,
} from './constants/lead-funnel.constants';
import { Order, OrderDocument } from '../order/schemas/order.schema';
import {
  LeadStageHistory,
  LeadStageHistoryDocument,
} from './schemas/lead-stage-history.schema';
@Injectable()
export class DeliverFinanceReportsService {
  constructor(
    private readonly httpService: HttpService, // ✅ FIXED: Inject HttpService
    @InjectModel(Order.name) private readonly OrderModel: Model<OrderDocument>,
    @InjectModel(Master.name)
    private readonly MasterModel: Model<MasterDocument>,
    @InjectModel(Customer.name)
    private readonly CustomerModel: Model<CustomerDocument>,
    @InjectModel(Cart.name)
    private readonly CartModel: Model<Cart>,
    @InjectModel(LeadStageHistory.name)
    private readonly LeadStageHistoryModel: Model<LeadStageHistoryDocument>,
    private readonly notificationMasterService: NotificationMasterService, // ✅ FIXED: inject here
  ) {}

  private formatDateString(startDate: string, endDate: string): string {
    const start = moment(startDate).format('DD MMM YYYY');
    const end = moment(endDate).format('DD MMM YYYY');

    if (startDate === endDate) {
      return start;
    } else {
      return `${start} - ${end}`;
    }
  }

  private transformFinanceData(
    data: Record<string, any>[],
  ): Record<string, any>[] {
    return data.map((itm, index) => ({
      zero: index + 1,
      minusone: itm[`Customer Id`] || '--',
      minustwo: itm[`Order Id`] || '--',
      one: itm[`Order date`] || '--',
      two: itm?.order_number || '--',
      // three: itm?.fullName,
      four: itm?.product,
      four2: itm?.plan,
      four1: itm?.protein_category,
      five: itm?.delivery_start_date,
      six: itm?.end_date,
      // seven: itm?.fullAddress == null ? "--" : itm?.fullAddress,
      eight: itm?.[`gross amount`],
      nine: itm?.discount == null ? '--' : itm?.discount,
      nine1:
        itm?.total_addon_discount == null ? '--' : itm?.total_addon_discount,
      nine2: itm?.offer_applicable
        ? itm?.offer_type
        : itm?.addon_discount_type == null
          ? '--'
          : itm?.addon_discount_type,
      nine3: itm?.couponData?.[0]?.name || '--',
      ten: itm?.couponData?.[0]?.coupon_code || '--',
      eleven: itm?.[`referral discount`],
      twentyeight: itm?.refundable_deposite || 0,
      twelve: itm?.VAT?.toFixed(2) || 0,
      thirteen: itm?.is_used_reward_wallet ? itm?.[`reward discount`] : 0,
      fourteen: itm?.is_used_reward_wallet ? itm?.[`reward points`] : 0,
      fifteen: itm?.[`net amount`],
      sixteen: itm?.[`earn aed`],
      sixteen2: itm?.[`earn points`],
      seventeen: itm?.[`plan type`],
      eighteen: [...new Set(itm?.[`plan size`])][0],
      nineteen: Number(itm?.[`no_of_meals`]),
      twenty: Number(itm?.[`no_of_breakfast`]),
      twentyone: Number(itm?.[`no_of_snacks`]),
      twentytwo:
        Number(itm?.[`shopify_total_orders`]) + Number(itm?.[`total_orders`]),
      twentythree: itm?.[`transaction id`],
      twentyfour: itm?.order_status || '--',
      twentyfive: itm?.meal_plan_days_before || 0,
      twentysix: itm?.refund_amount || 0,
      twentyseven: itm?.reason || '--',
      twentynine:
        itm?.client_info?.isMobileApp == true ? 'Mobile app' : 'Website',
      thirty: itm?.['referred by'] ? 'Y' : '',
      thirtyone: itm?.payment_method || '--',
      thirtytwo:
        Array.isArray(itm?.addon_discount) &&
        itm?.addon_discount?.some(
          (item: any) => item?.discount_type?.toLowerCase() === 'fazaa',
        )
          ? 'Y'
          : '',
    }));
  }

  private transformCancelledFinanceData(
    data: Record<string, any>[],
  ): Record<string, any>[] {
    return data.map((itm, index) => ({
      zero: index + 1,
      minusone: itm[`Customer Id`] || '--',
      minustwo: itm[`Order Id`] || '--',
      one: itm[`Order date`] || '--',
      two: itm?.order_number || '--',
      // three: itm?.fullName,
      four: itm?.product,
      four2: itm?.plan,
      four1: itm?.protein_category,
      five: itm?.delivery_start_date,
      six: itm?.end_date,
      // seven: itm?.fullAddress == null ? "--" : itm?.fullAddress,
      eight: itm?.[`gross amount`],
      nine: itm?.discount == null ? '--' : itm?.discount,
      nine1:
        itm?.total_addon_discount == null ? '--' : itm?.total_addon_discount,
      nine2: itm?.offer_applicable
        ? itm?.offer_type
        : itm?.addon_discount_type == null
          ? '--'
          : itm?.addon_discount_type,
      nine3: itm?.couponData?.[0]?.name || '--',
      ten: itm?.couponData?.[0]?.coupon_code || '--',
      eleven: itm?.[`referral discount`],
      twelve: itm?.VAT?.toFixed(2) || 0,
      thirteen: itm?.is_used_reward_wallet ? itm?.[`reward discount`] : 0,
      fourteen: itm?.is_used_reward_wallet ? itm?.[`reward points`] : 0,
      fifteen: itm?.[`net amount`],
      sixteen: itm?.[`earn aed`],
      sixteen2: itm?.[`earn points`],
      seventeen: itm?.[`plan type`],
      eighteen: [...new Set(itm?.[`plan size`])][0],
      nineteen: Number(itm?.[`no_of_meals`]),
      twenty: Number(itm?.[`no_of_breakfast`]),
      twentyone: Number(itm?.[`no_of_snacks`]),
      twentytwo:
        Number(itm?.[`shopify_total_orders`]) + Number(itm?.[`total_orders`]),
      twentythree: itm?.[`transaction id`],
      twentyfour:
        itm?.order_status == 'Partially_Cancelled'
          ? 'Partial Cancelled'
          : 'Cancelled',
      twentyfive:
        Number(itm?.meal_plan_days_before) - Number(itm?.meal_plan_days_now),
      twentysix: itm?.refund_amount,
      twentyseven: itm?.reason,
      twentyeight: itm?.refundable_deposite || 0,
      twentynine:
        itm?.client_info?.isMobileApp == true ? 'Mobile app' : 'Website',
      thirty: itm?.['referred by'] ? 'Y' : '',
      thirtyone: itm?.payment_method || '--',
      thirtytwo:
        Array.isArray(itm?.addon_discount) &&
        itm?.addon_discount?.some(
          (item: any) => item?.discount_type?.toLowerCase() === 'fazaa',
        )
          ? 'Y'
          : '',
    }));
  }

  private getAbandonedCartAdditionalFields() {
    return {
      Email: { $ifNull: ['$customerData.email', ''] },
      'Last Plan': {
        $let: {
          vars: {
            planValue: {
              $ifNull: [
                '$orderData.plan',
                {
                  $ifNull: [
                    '$plan',
                    {
                      $cond: {
                        if: { $eq: ['$is_flex_plan', true] },
                        then: 'flexi',
                        else: 'normal',
                      },
                    },
                  ],
                },
              ],
            },
          },
          in: {
            $switch: {
              branches: [
                { case: { $eq: ['$$planValue', 'normal'] }, then: 'MP' },
                { case: { $eq: ['$$planValue', 'flexi'] }, then: 'BYO' },
                {
                  case: { $eq: ['$$planValue', 'smart_saver'] },
                  then: 'Essential',
                },
              ],
              default: { $ifNull: ['$$planValue', ''] },
            },
          },
        },
      },
      'Last Activity': {
        $dateToString: {
          format: '%d/%m/%Y %H:%M',
          date: {
            $max: [
              '$updatedAt',
              { $ifNull: ['$customerData.updatedAt', '$updatedAt'] },
              { $ifNull: ['$orderData.updatedAt', '$updatedAt'] },
            ],
          },
          timezone: 'Asia/Dubai',
        },
      },
      'Cart Value': {
        $ifNull: ['$final_total', { $ifNull: ['$cart_total', 0] }],
      },
      'Assigned To': {
        $ifNull: [{ $arrayElemAt: ['$leadData.created_by', 0] }, ''],
      },
    };
  }

  private getAbandonedCartLeadStageFieldsFromCart() {
    return {
      'Lead Stage Code': {
        $cond: {
          if: {
            $and: [
              { $ifNull: ['$lead_stage_code', false] },
              { $ne: ['$lead_stage_code', 'RNR'] },
            ],
          },
          then: '$lead_stage_code',
          else: '$$REMOVE',
        },
      },
      'Lead Stage Label': {
        $cond: {
          if: {
            $and: [
              { $ifNull: ['$lead_stage_label', false] },
              { $ne: ['$lead_stage_label', 'Raw / Not Responded'] },
            ],
          },
          then: '$lead_stage_label',
          else: '$$REMOVE',
        },
      },
      'Lead Stage Updated At': {
        $cond: {
          if: {
            $and: [
              { $ifNull: ['$lead_stage_code', false] },
              { $ne: ['$lead_stage_code', 'RNR'] },
              { $ifNull: ['$lead_stage_updated_at', false] },
            ],
          },
          then: {
            $dateToString: {
              format: '%d/%m/%Y %H:%M',
              date: '$lead_stage_updated_at',
              timezone: 'Asia/Dubai',
            },
          },
          else: '$$REMOVE',
        },
      },
      'Lead Sub Stage Code': {
        $cond: {
          if: {
            $and: [
              { $eq: ['$lead_stage_code', LEAD_STAGE.MQL] },
              { $ifNull: ['$sub_stage', false] },
            ],
          },
          then: '$sub_stage',
          else: '$$REMOVE',
        },
      },
      'Lead Sub Stage Label': {
        $cond: {
          if: {
            $and: [
              { $eq: ['$lead_stage_code', LEAD_STAGE.MQL] },
              { $ifNull: ['$sub_stage_label', false] },
            ],
          },
          then: '$sub_stage_label',
          else: '$$REMOVE',
        },
      },
    };
  }

  private getAbandonedCartLatestLeadStageHistoryLookupStages() {
    return [
      {
        $lookup: {
          from: 'leadstagehistories',
          let: { cartId: '$_id', cartIdStr: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$cart_id', '$$cartId'] },
                    { $eq: [{ $toString: '$cart_id' }, '$$cartIdStr'] },
                  ],
                },
              },
            },
            { $sort: { changed_at: -1 as const, createdAt: -1 as const } },
            { $limit: 1 },
          ],
          as: 'latestLeadStageHistory',
        },
      },
    ];
  }

  private getLeadStageLabelAggregation(
    stageCodeField: Record<string, unknown>,
  ) {
    return {
      $switch: {
        branches: [
          {
            case: { $eq: [stageCodeField, 'RNR'] },
            then: 'Raw / Not Responded',
          },
          {
            case: { $eq: [stageCodeField, 'DQL'] },
            then: 'Disqualified Lead',
          },
          {
            case: { $eq: [stageCodeField, 'MQL'] },
            then: 'Marketing Qualified Lead',
          },
          {
            case: { $eq: [stageCodeField, 'SQL'] },
            then: 'Sales Qualified Lead',
          },
          {
            case: { $eq: [stageCodeField, 'CONVERTED'] },
            then: 'Payment Completed',
          },
        ],
        default: '',
      },
    };
  }

  /** Latest stage from leadstagehistories (list API). */
  private getAbandonedCartLeadStageFieldsFromHistory() {
    const latestStageCode = {
      $arrayElemAt: ['$latestLeadStageHistory.to_stage', 0],
    };
    const latestSubStage = {
      $arrayElemAt: ['$latestLeadStageHistory.sub_stage', 0],
    };

    return {
      'Lead Stage Code': {
        $cond: {
          if: { $gt: [{ $size: '$latestLeadStageHistory' }, 0] },
          then: latestStageCode,
          else: '$$REMOVE',
        },
      },
      'Lead Stage Label': {
        $cond: {
          if: { $gt: [{ $size: '$latestLeadStageHistory' }, 0] },
          then: this.getLeadStageLabelAggregation(latestStageCode),
          else: '$$REMOVE',
        },
      },
      'Lead Sub Stage Code': {
        $cond: {
          if: {
            $and: [
              { $gt: [{ $size: '$latestLeadStageHistory' }, 0] },
              { $eq: [latestStageCode, 'MQL'] },
              { $ifNull: [latestSubStage, false] },
            ],
          },
          then: latestSubStage,
          else: '$$REMOVE',
        },
      },
      'Lead Sub Stage Label': {
        $cond: {
          if: {
            $and: [
              { $gt: [{ $size: '$latestLeadStageHistory' }, 0] },
              { $eq: [latestStageCode, 'MQL'] },
              { $ifNull: [latestSubStage, false] },
            ],
          },
          then: this.getMqlSubStageLabelAggregation(latestSubStage),
          else: '$$REMOVE',
        },
      },
      'Lead Stage Updated At': {
        $cond: {
          if: { $gt: [{ $size: '$latestLeadStageHistory' }, 0] },
          then: {
            $dateToString: {
              format: '%d/%m/%Y %H:%M',
              date: { $arrayElemAt: ['$latestLeadStageHistory.changed_at', 0] },
              timezone: 'Asia/Dubai',
            },
          },
          else: '$$REMOVE',
        },
      },
    };
  }

  private getMqlSubStageLabelAggregation(
    subStageField: Record<string, unknown>,
  ) {
    return {
      $switch: {
        branches: MQL_SUB_STAGES.map((subStage) => ({
          case: { $eq: [subStageField, subStage.code] },
          then: subStage.label,
        })),
        default: '',
      },
    };
  }

  private getAbandonedCartLeadLookupStages() {
    return [
      {
        $lookup: {
          from: 'leads',
          localField: 'customerData.phone_number',
          foreignField: 'mobile_number',
          as: 'leadData',
        },
      },
    ];
  }

  private toSnakeCaseKey(key: string): string {
    return key
      .trim()
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase();
  }

  private normalizeListKeysToSnakeCase(rows: Record<string, any>[]) {
    return rows.map((row) => {
      const normalized: Record<string, any> = {};
      Object.entries(row).forEach(([key, value]) => {
        normalized[this.toSnakeCaseKey(key)] = value;
      });
      return normalized;
    });
  }

  private getLeadStageLabel(stageCode: string): string {
    return (
      LEAD_FUNNEL_STAGES.find((stage) => stage.code === stageCode)?.label ||
      'Raw / Not Responded'
    );
  }

  private getMqlSubStageLabel(subStageCode?: string | null): string | null {
    if (!subStageCode) {
      return null;
    }

    return (
      MQL_SUB_STAGES.find((subStage) => subStage.code === subStageCode)
        ?.label || null
    );
  }

  private parseAbandonedCartReportDate(date: string) {
    const normalized = date.trim().replace(/\//g, '-');
    const parsed = moment(normalized, ['YYYY-MM-DD', 'YYYY-M-D'], true);
    if (!parsed.isValid()) {
      throw new BadRequestException(
        `Invalid date "${date}". Use YYYY-MM-DD or YYYY/MM/DD.`,
      );
    }

    return parsed;
  }

  private getAbandonedWindow(startDate: string, endDate: string) {
    const abandonedCartStartDubai = this.parseAbandonedCartReportDate(startDate)
      .subtract(8, 'days')
      .startOf('day')
      .utcOffset(240);
    const abandonedCartEndDubai = this.parseAbandonedCartReportDate(endDate)
      .subtract(2, 'days')
      .endOf('day')
      .utcOffset(240);

    return {
      abandonedCartStartDubai,
      abandonedCartEndDubai,
      abandonedCartStartUTC: abandonedCartStartDubai.clone().utc().toDate(),
      abandonedCartEndUTC: abandonedCartEndDubai.clone().utc().toDate(),
    };
  }

  private getAbandonedCartOrderLookupStage() {
    return {
      $lookup: {
        from: 'orders',
        let: {
          customerId: '$customer_new_id',
          cartId: '$_id',
          cartIdStr: { $toString: '$_id' },
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$customer_id', '$$customerId'] },
                  {
                    $in: [
                      '$order_status',
                      ['Completed', 'Partially_Cancelled'],
                    ],
                  },
                ],
              },
            },
          },
          {
            $addFields: {
              isCartOrder: {
                $or: [
                  { $eq: ['$cart_id', '$$cartId'] },
                  { $eq: [{ $toString: '$cart_id' }, '$$cartIdStr'] },
                ],
              },
            },
          },
          { $sort: { isCartOrder: -1 as const, createdAt: -1 as const } },
          { $limit: 1 },
        ],
        as: 'orderData',
      },
    };
  }

  private getAbandonedCartLeadStatusProjection() {
    return {
      'Lead Status': {
        $cond: {
          if: this.getAbandonedCartIsConvertedFromHistoryExpression(),
          then: 'Closed',
          else: 'Open',
        },
      },
    };
  }

  /** CONVERTED = paid order after SQL (latest leadstagehistories row). */
  private getAbandonedCartIsConvertedFromHistoryExpression() {
    return {
      $and: [
        { $gt: [{ $size: '$latestLeadStageHistory' }, 0] },
        {
          $eq: [
            { $arrayElemAt: ['$latestLeadStageHistory.to_stage', 0] },
            'CONVERTED',
          ],
        },
      ],
    };
  }

  /** Shared filters + lookups for abandoned-cart list and dashboard. */
  private getAbandonedCartBasePipelineStages(
    abandonedCartStartUTC: Date,
    abandonedCartEndUTC: Date,
  ) {
    return [
      {
        $match: {
          createdAt: {
            $gte: abandonedCartStartUTC,
            $lt: abandonedCartEndUTC,
          },
        },
      },
      {
        $addFields: {
          isCustomerIdObjectId: {
            $regexMatch: {
              input: '$customer_id',
              regex: /^[a-fA-F0-9]{24}$/,
            },
          },
        },
      },
      {
        $match: {
          isCustomerIdObjectId: true,
        },
      },
      {
        $addFields: {
          customer_new_id: {
            $toObjectId: '$customer_id',
          },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer_new_id',
          foreignField: '_id',
          as: 'customerData',
        },
      },
      {
        $unwind: {
          path: '$customerData',
        },
      },
      {
        $match: {
          $and: [
            { 'customerData.phone_number': { $ne: '' } },
            { 'customerData.phone_number': { $ne: null } },
            { 'customerData.phone_number': { $exists: true } },
          ],
        },
      },
      this.getAbandonedCartOrderLookupStage(),
      {
        $unwind: {
          path: '$orderData',
          preserveNullAndEmptyArrays: true,
        },
      },
      ...this.getAbandonedCartLeadLookupStages(),
      ...(this.getAbandonedCartLatestLeadStageHistoryLookupStages() as any[]),
    ];
  }

  private getCartIdHistoryFilter(cartId: unknown) {
    const cartIdString = String(cartId);
    if (!Types.ObjectId.isValid(cartIdString)) {
      return { cart_id: cartId };
    }

    const objectId = new Types.ObjectId(cartIdString);
    return { cart_id: { $in: [objectId, cartIdString] } };
  }

  private async getLatestLeadStageHistoryForCart(cartId: unknown) {
    return this.LeadStageHistoryModel.findOne(
      this.getCartIdHistoryFilter(cartId),
    )
      .sort({ changed_at: -1, createdAt: -1 })
      .lean();
  }

  private async resolveTargetCartForLeadStageUpdate(
    cartId?: string,
    customerId?: string,
  ) {
    if (!cartId && !customerId) {
      throw new BadRequestException(
        'Either cart_id or customer_id is required.',
      );
    }

    if (cartId) {
      const cart = await this.CartModel.findById(cartId).lean();
      if (!cart) {
        throw new NotFoundException('Cart not found for provided cart_id.');
      }
      return cart;
    }

    const cart = await this.CartModel.findOne({ customer_id: customerId })
      .sort({ createdAt: -1 })
      .lean();
    if (!cart) {
      throw new NotFoundException('No cart found for provided customer_id.');
    }
    return cart;
  }

  private async ensureLeadIsOpenForCart(cart: any): Promise<void> {
    const customerObjectId =
      typeof cart.customer_id === 'string' &&
      /^[a-fA-F0-9]{24}$/.test(cart.customer_id)
        ? cart.customer_id
        : null;

    if (!customerObjectId) {
      throw new BadRequestException(
        'Cart customer_id is invalid for abandoned lead stage update.',
      );
    }

    const cartObjectId = Types.ObjectId.isValid(String(cart._id))
      ? new Types.ObjectId(String(cart._id))
      : cart._id;

    const latestHistory = await this.getLatestLeadStageHistoryForCart(cart._id);
    if (latestHistory?.to_stage === LEAD_STAGE.CONVERTED) {
      throw new BadRequestException(
        'Lead stage cannot be updated after payment is completed (CONVERTED).',
      );
    }

    const existingOrder = await this.OrderModel.findOne({
      customer_id: customerObjectId,
      order_status: { $in: ['Completed', 'Partially_Cancelled'] },
      $or: [
        { cart_id: { $in: [cartObjectId, String(cart._id)] } },
        { createdAt: { $gte: cart.createdAt } },
      ],
    })
      .sort({ createdAt: -1 })
      .lean();

    if (existingOrder) {
      throw new BadRequestException(
        'Lead stage can be updated only for open abandoned leads.',
      );
    }
  }

  getLeadFunnelStages() {
    return {
      statusCode: 200,
      status: true,
      data: {
        stages: LEAD_FUNNEL_STAGES,
        mql_sub_stages: MQL_SUB_STAGES,
        mql_sub_stage_codes: MQL_SUB_STAGE_CODES,
        tracking: {
          source_collection: 'leadstagehistories',
          manual_stages: ['RNR', 'DQL', 'MQL'],
          sql_trigger: 'payment_link_generated',
          converted_trigger: 'payment_captured_after_sql',
        },
      },
    };
  }

  async updateOpenLeadStage(payload: UpdateLeadStageDto, user: any) {
    const { cart_id, customer_id, stage_code, note, sub_stage } = payload;
    const normalizedSubStage = sub_stage?.trim() || null;
    if (
      normalizedSubStage &&
      !MQL_SUB_STAGE_CODES.includes(
        normalizedSubStage as (typeof MQL_SUB_STAGE_CODES)[number],
      )
    ) {
      throw new BadRequestException(
        `Invalid sub_stage "${normalizedSubStage}". Allowed values: ${MQL_SUB_STAGE_CODES.join(', ')}`,
      );
    }

    const cart = await this.resolveTargetCartForLeadStageUpdate(
      cart_id,
      customer_id,
    );

    await this.ensureLeadIsOpenForCart(cart);

    if (stage_code === LEAD_STAGE.SQL || stage_code === LEAD_STAGE.CONVERTED) {
      throw new BadRequestException(
        'SQL is recorded automatically when a payment link is generated. CONVERTED is recorded when payment is completed.',
      );
    }

    if (stage_code !== 'MQL' && normalizedSubStage) {
      throw new BadRequestException(
        'sub_stage is applicable only when stage_code is MQL.',
      );
    }

    const nextSubStage = stage_code === 'MQL' ? normalizedSubStage : null;
    const nextSubStageLabel = this.getMqlSubStageLabel(nextSubStage);
    const latestHistory = await this.getLatestLeadStageHistoryForCart(cart._id);
    const previousStage = latestHistory?.to_stage ?? null;
    const previousSubStage = latestHistory?.sub_stage ?? null;
    const hasNote = Boolean(note?.trim());
    const stageUnchanged =
      previousStage === stage_code &&
      (previousSubStage ?? null) === (nextSubStage ?? null);

    if (stageUnchanged && !hasNote) {
      return {
        statusCode: 200,
        status: true,
        message: 'Lead stage is unchanged.',
        data: {
          cart_id: String(cart._id),
          customer_id: cart.customer_id,
          lead_stage_code: stage_code,
          lead_stage_label: this.getLeadStageLabel(stage_code),
          sub_stage: nextSubStage,
          sub_stage_label: nextSubStageLabel,
          lead_stage_updated_at: cart.lead_stage_updated_at || null,
        },
      };
    }

    const leadStageLabel = this.getLeadStageLabel(stage_code);
    const updatedAt = new Date();
    const cartUpdate: Record<string, unknown> = {
      lead_stage_code: stage_code,
      lead_stage_label: leadStageLabel,
      lead_stage_updated_at: updatedAt,
    };
    if (stage_code === LEAD_STAGE.MQL && nextSubStage) {
      cartUpdate.sub_stage = nextSubStage;
      cartUpdate.sub_stage_label = nextSubStageLabel;
    } else {
      cartUpdate.sub_stage = null;
      cartUpdate.sub_stage_label = null;
    }
    await this.CartModel.updateOne({ _id: cart._id }, { $set: cartUpdate });

    const historyPayload: Record<string, unknown> = {
      cart_id: cart._id,
      customer_id: cart.customer_id,
      to_stage: stage_code,
      changed_at: updatedAt,
      changed_by: {
        _id: user?._id || null,
        name: user?.name || '',
        email: user?.email || '',
      },
      source: resolveLeadHistorySource(nextSubStage, previousSubStage),
    };
    if (previousStage) {
      historyPayload.from_stage = previousStage;
    }
    if (nextSubStage) {
      historyPayload.sub_stage = nextSubStage;
    }
    if (note?.trim()) {
      historyPayload.note = note.trim();
    }
    await this.LeadStageHistoryModel.create(historyPayload);

    return {
      statusCode: 200,
      status: true,
      message: 'Lead stage updated successfully.',
      data: {
        cart_id: String(cart._id),
        customer_id: cart.customer_id,
        lead_stage_code: stage_code,
        lead_stage_label: leadStageLabel,
        sub_stage: nextSubStage,
        sub_stage_label: nextSubStageLabel,
        lead_stage_updated_at: updatedAt,
      },
    };
  }

  private createWorksheet(
    workbook: ExcelJS.Workbook,
    sheetBaseName: string,
    data: Record<string, any>[],
    startDate: string,
    endDate: string,
  ) {
    const start = moment(startDate).format('D MMM YY');
    const end = moment(endDate).format('D MMM YY');
    const sheetRange = `${start} - ${end}`;
    let sheetName = `${sheetBaseName}(${sheetRange})`;

    // Truncate sheet name if > 31 chars (Excel limit)
    if (sheetName.length > 31) {
      sheetName = sheetName.substring(0, 31);
    }

    // Remove existing worksheet if already present
    const existingSheet = workbook.getWorksheet(sheetName);
    if (existingSheet) {
      workbook.removeWorksheet(existingSheet.id);
    }

    // Add new worksheet
    const sheet = workbook.addWorksheet(sheetName);

    if (!data || data.length === 0) {
      sheet.addRow([`No data available for ${sheetBaseName}`]);
      return;

      // throw new Error(`No data found for ${sheetBaseName}`);
    }

    // ---------- Get headers ----------
    let headers: string[];
    let headerRow: any;

    if (sheetBaseName === 'Customer_Report') {
      // Custom headers for Customer_Report sheet
      headers = [
        'Customer Id',
        'First Name',
        'Last Name',
        'Email',
        'Country Code',
        'Phone Number',
        'WhatsApp Country Code',
        'WhatsApp Number',
        'Cart Created',
        'Order Session Created',
      ];
      headerRow = sheet.addRow(headers);
    } else if (sheetBaseName === 'Abandoned Cart') {
      // Custom headers for Abandoned Cart sheet
      headers = [
        'Created At',
        'First Name',
        'Last Name',
        'Email',
        'Primary Phone',
        'Alternate Phone Country Code',
        'Alternate Phone',
        'Last Plan',
        'Last Activity',
        'Cart Value',
        'Assigned To',
        'Lead Stage Code',
        'Lead Stage Label',
        'Lead Stage Updated At',
        'Area',
        'City',
        'Last Order Date',
        'Type of Order',
        'Days of Plan',
        'Deliverable Days',
        'Diet Type',
        'Total Meals',
        'Lead Status',
      ];
      headerRow = sheet.addRow(headers);
    } else if (
      sheetBaseName === 'Finance_Report' ||
      sheetBaseName === 'CANOR_PARTCAN_Finance_Report'
    ) {
      // Custom headers for Finance_Report and CANOR_PARTCAN_Finance_Report sheets
      headers = [
        '#',
        'Customer Id',
        'Order Id',
        'Order Date',
        'Order Number',
        'Product',
        'Plan',
        'Diet Type',
        'Delivery Start Date',
        'Delivery End Date',
        'Gross Amount',
        'Coupon Discount',
        'Addition discount',
        'Addition discount type',
        'Coupon Label',
        'Coupon Code',
        'Referral Discount',
        'VAT',
        'Redeem Amount',
        'Redeem Points',
        'Net Amount',
        'Earn Amount',
        'Earned Points',
        'Plan Type',
        'Plan Size',
        'No of meals',
        'No of breakfast',
        'No of snacks',
        'No of Times',
        'Transaction Id',
        'Type',
        'No of Days Cancelled',
        'Refund Amount',
        'Cancellation Reason',
        'Client Info',
        'Referred By',
        'Payment Method',
        'Fazaa',
      ];
      headerRow = sheet.addRow(headers);
    } else {
      // Default headers for other sheets
      headers = Object.keys(data[0]);
      headerRow = sheet.addRow(headers);
    }

    // Style headers
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, size: 14 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFEFEF' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // ---------- Add rows ----------
    // data.forEach((item) => {
    //   const row = headers.map((key) => {
    //     const value = item[key];
    //     if (Array.isArray(value)) {
    //       return value.join(', ');
    //     } else if (value instanceof Date) {
    //       return moment(value).format('YYYY-MM-DD');
    //     } else {
    //       return value ?? '';
    //     }
    //   });
    //   sheet.addRow(row);
    // });
    if (sheetBaseName === 'Customer_Report') {
      // For Customer_Report, use the customer data mapping
      data.forEach((item) => {
        const row = [
          item._id || '',
          item.first_name || '',
          item.last_name || '',
          item.email || '',
          item.country_code || '',
          item.phone_number || '',
          item.whatsapp_country_code || '',
          item.whatsapp_number || '',
          item.cartCreated || '',
          item.OrderSessionCreated || '',
        ];
        sheet.addRow(row);
      });
    } else if (sheetBaseName === 'Abandoned Cart') {
      // For Abandoned Cart, use the projected field names
      data.forEach((item) => {
        const row = [
          item['Created At'] || '',
          item['First Name'] || '',
          item['Last Name'] || '',
          item.Email || '',
          item['Primary Phone'] || '',
          item['Alternate Phone Country Code'] || '',
          item['Alternate Phone'] || '',
          item['Last Plan'] || '',
          item['Last Activity'] || '',
          item['Cart Value'] ?? '',
          item['Assigned To'] || '',
          item['Lead Stage Code'] || 'RNR',
          item['Lead Stage Label'] || 'Raw / Not Responded',
          item['Lead Stage Updated At'] || '',
          item['Area'] || '',
          item['City'] || '',
          item['Last Order Date'] || '',
          item['Type of Order'] || '',
          item['Days of Plan'] || '',
          item['Deliverable Days'] || '',
          item['Diet Type'] || '',
          item['Total Meals'] || '',
          item['Lead Status'] || 'Open',
        ];
        sheet.addRow(row);
      });
    } else if (sheetBaseName === 'Finance_Report') {
      // For Finance_Report, use the custom field mapping
      const transformedData = this.transformFinanceData(data);
      transformedData.forEach((item) => {
        const row = headers.map((header) => {
          // Map header names to field names
          const fieldMap: Record<string, string> = {
            '#': 'zero',
            'Customer Id': 'minusone',
            'Order Id': 'minustwo',
            'Order Date': 'one',
            'Order Number': 'two',
            Product: 'four',
            Plan: 'four2',
            'Diet Type': 'four1',
            'Delivery Start Date': 'five',
            'Delivery End Date': 'six',
            'Gross Amount': 'eight',
            'Coupon Discount': 'nine',
            'Addition discount': 'nine1',
            'Addition discount type': 'nine2',
            'Coupon Label': 'nine3',
            'Coupon Code': 'ten',
            'Referral Discount': 'eleven',
            VAT: 'twelve',
            'Redeem Amount': 'thirteen',
            'Redeem Points': 'fourteen',
            'Net Amount': 'fifteen',
            'Earn Amount': 'sixteen',
            'Earned Points': 'sixteen2',
            'Plan Type': 'seventeen',
            'Plan Size': 'eighteen',
            'No of meals': 'nineteen',
            'No of breakfast': 'twenty',
            'No of snacks': 'twentyone',
            'No of Times': 'twentytwo',
            'Transaction Id': 'twentythree',
            Type: 'twentyfour',
            'No of Days Cancelled': 'twentyfive',
            'Refund Amount': 'twentysix',
            'Cancellation Reason': 'twentyseven',
            'Client Info': 'twentynine',
            'Referred By': 'thirty',
            'Payment Method': 'thirtyone',
            Fazaa: 'thirtytwo',
          };

          const fieldName = fieldMap[header];
          const value = item[fieldName];

          if (Array.isArray(value)) {
            return value.join(', ');
          } else if (value instanceof Date) {
            return moment(value).format('YYYY-MM-DD');
          } else {
            return value ?? '';
          }
        });
        sheet.addRow(row);
      });
    } else if (sheetBaseName === 'CANOR_PARTCAN_Finance_Report') {
      // For CANOR_PARTCAN_Finance_Report, use the cancelled-specific field mapping
      const transformedData = this.transformCancelledFinanceData(data);
      transformedData.forEach((item) => {
        const row = headers.map((header) => {
          // Map header names to field names
          const fieldMap: Record<string, string> = {
            '#': 'zero',
            'Customer Id': 'minusone',
            'Order Id': 'minustwo',
            'Order Date': 'one',
            'Order Number': 'two',
            Product: 'four',
            Plan: 'four2',
            'Diet Type': 'four1',
            'Delivery Start Date': 'five',
            'Delivery End Date': 'six',
            'Gross Amount': 'eight',
            'Coupon Discount': 'nine',
            'Addition discount': 'nine1',
            'Addition discount type': 'nine2',
            'Coupon Label': 'nine3',
            'Coupon Code': 'ten',
            'Referral Discount': 'eleven',
            VAT: 'twelve',
            'Redeem Amount': 'thirteen',
            'Redeem Points': 'fourteen',
            'Net Amount': 'fifteen',
            'Earn Amount': 'sixteen',
            'Earned Points': 'sixteen2',
            'Plan Type': 'seventeen',
            'Plan Size': 'eighteen',
            'No of meals': 'nineteen',
            'No of breakfast': 'twenty',
            'No of snacks': 'twentyone',
            'No of Times': 'twentytwo',
            'Transaction Id': 'twentythree',
            Type: 'twentyfour',
            'No of Days Cancelled': 'twentyfive',
            'Refund Amount': 'twentysix',
            'Cancellation Reason': 'twentyseven',
            'Client Info': 'twentynine',
            'Referred By': 'thirty',
            'Payment Method': 'thirtyone',
            Fazaa: 'thirtytwo',
          };

          const fieldName = fieldMap[header];
          const value = item[fieldName];

          if (Array.isArray(value)) {
            return value.join(', ');
          } else if (value instanceof Date) {
            return moment(value).format('YYYY-MM-DD');
          } else {
            return value ?? '';
          }
        });
        sheet.addRow(row);
      });
    } else {
      // For other sheets, use default processing
      data.forEach((item) => {
        const row = headers.map((key) => {
          const value = item[key];

          if (Array.isArray(value)) {
            // Special handling for couponData
            if (key === 'couponData') {
              return value
                .map((c: any) => `${c.name || ''} (${c.coupon_code || ''})`)
                .join('; ');
            }
            return value.join(', ');
          } else if (value instanceof Date) {
            return moment(value).format('YYYY-MM-DD');
          } else {
            return value ?? '';
          }
        });

        sheet.addRow(row);
      });
    }

    // ---------- Auto-fit columns ----------
    sheet.columns.forEach((col) => {
      let maxLength = 0;
      col.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      col.width = maxLength < 15 ? 15 : maxLength + 2; // min width 15
    });
  }
  @Cron('30 3 * * *')
  // according to the UTC 30 3 * * * it will run every day according to the 7:30 AM GST
  async handleCron() {
    console.log(
      `Cron job started at ${moment().format('YYYY-MM-DD HH:mm:ss')}`,
    );

    const getMasterdata = async (data: Record<string, any>) => {
      const MasterdataDetails = await this.MasterModel.findOne(
        { name: 'master_data' },
        data,
      );
      return MasterdataDetails;
    };

    const rewardData = await getMasterdata({ reward_point: 1, _id: 0 });

    // const startDate = moment().subtract(1, "days").format("YYYY-MM-DD");
    // const endDate = moment().format("YYYY-MM-DD");

    const startDate = moment().subtract(1, 'days').format('YYYY-MM-DD'); // previous day

    const endDate = moment().subtract(1, 'days').format('YYYY-MM-DD'); // previous day
    const query = [
      {
        $lookup: {
          from: 'customers',
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customerData',
        },
      },
      {
        $lookup: {
          from: 'addresses',
          localField: 'address_id',
          foreignField: '_id',
          as: 'addressData',
        },
      },
      {
        $lookup: {
          from: 'subscriptions',
          localField: 'subscription_id',
          foreignField: '_id',
          as: 'subscriptionData',
        },
      },
      {
        $lookup: {
          from: 'coupons',
          localField: 'coupon_id',
          foreignField: '_id',
          as: 'couponData',
        },
      },
      {
        $lookup: {
          from: 'rewards',
          localField: 'referral_id',
          foreignField: '_id',
          as: 'rewardData',
        },
      },
      {
        $addFields: {
          'Order Id': '$_id',
          'Customer Id': { $arrayElemAt: ['$customerData._id', 0] },
          'Order date': {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$order_generation_time',
            },
          },
          fullName: {
            $concat: [
              {
                $arrayElemAt: ['$customerData.first_name', 0],
              },
              ' ',
              {
                $arrayElemAt: ['$customerData.last_name', 0],
              },
            ],
          },
          fullAddress: {
            $concat: [
              {
                $arrayElemAt: ['$addressData.address', 0],
              },
              ',',
              {
                $arrayElemAt: ['$addressData.address1', 0],
              },
              ',',
              {
                $arrayElemAt: ['$addressData.province', 0],
              },
              ',',
              {
                $arrayElemAt: ['$addressData.city', 0],
              },
            ],
          },
          product: '$order_type',
          protein_category: {
            $let: {
              vars: {
                // 1. Flatten all nested arrays and get unique values
                uniqueList: {
                  $setUnion: {
                    $reduce: {
                      input:
                        '$subscriptionData.selected_meal_type.protein_category',
                      initialValue: [],
                      in: {
                        $concatArrays: ['$$value', { $ifNull: ['$$this', []] }],
                      },
                    },
                  },
                },
              },
              in: {
                $cond: {
                  if: { $gt: [{ $size: '$$uniqueList' }, 0] },
                  then: {
                    // 2. Join the unique values with a comma
                    $reduce: {
                      input: '$$uniqueList',
                      initialValue: '',
                      in: {
                        $cond: [
                          { $eq: ['$$value', ''] },
                          '$$this',
                          { $concat: ['$$value', ', ', '$$this'] },
                        ],
                      },
                    },
                  },
                  else: 'balance', // Fallback if list is empty
                },
              },
            },
          },
          // delivery_start_date: {
          //   $dateToString: {
          //     format: "%Y-%m-%d",
          //     date: {
          //       $arrayElemAt: [
          //         "$subscriptionData.delivery_start_date",
          //         0,
          //       ],
          //     },
          //   },
          // },
          delivery_start_date: {
            $cond: {
              if: { $eq: ['$order_type', 'subscription'] },
              then: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: {
                    $arrayElemAt: ['$subscriptionData.delivery_start_date', 0],
                  },
                },
              },
              else: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$delivery_start_date',
                },
              },
            },
          },
          end_date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $arrayElemAt: ['$subscriptionData.end_date', 0],
              },
            },
          },
          'gross amount': '$order_total',
          discount: '$discount',
          total_addon_discount: {
            $sum: {
              $map: {
                input: '$addon_discount', // the array you want to map over
                as: 'discountItem', // alias for each item in the array
                in: '$$discountItem.discount', // extracting the discount field
              },
            },
          },
          addon_discount_type: {
            $arrayElemAt: ['$addon_discount.offer_type', 0],
          },
          VAT: '$order_vat_value',
          'referral discount': '$referral_discount',
          'reward discount': '$redeem_amount_wallet',
          'earn aed': '$reward_aed',
          'earn points': '$reward_value',
          'net amount': '$final_order_total',
          'transaction id': '$order_ref',
          'ndd order date': '$delivery_start_date',
          'plan type': { $arrayElemAt: ['$subscriptionData.plan_type', 0] },
          plan: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'normal',
                    ],
                  },
                  then: 'MP',
                },
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'smart_saver',
                    ],
                  },
                  then: 'Essential',
                },
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'flexi',
                    ],
                  },
                  then: 'BYO',
                },
              ],
              default: 'MP', // Fallback
            },
          },
          'plan size': {
            $let: {
              vars: {
                // 1. Flatten nested arrays and extract unique calorie ranges
                uniqueKcal: {
                  $setUnion: {
                    $reduce: {
                      input: '$subscriptionData.selected_meal_type.kcal_range',
                      initialValue: [],
                      in: { $concatArrays: ['$$value', '$$this'] },
                    },
                  },
                },
              },
              in: {
                // 2. Reduce the unique array into a single comma-separated string
                $reduce: {
                  input: '$$uniqueKcal',
                  initialValue: '',
                  in: {
                    $cond: [
                      { $eq: ['$$value', ''] },
                      { $toString: '$$this' },
                      { $concat: ['$$value', ', ', { $toString: '$$this' }] },
                    ],
                  },
                },
              },
            },
          },
          // 'reward points': {
          //   $let: {
          //     vars: {
          //       rewardValueInAED: '$redeem_amount_wallet',
          //       masterdata: {
          //         $ifNull: [rewardData?.reward_point, 1]
          //       }
          //       // masterdata: rewardData?.reward_point
          //     },
          //     in: {
          //       $floor: {
          //         $divide: [
          //           { $multiply: ['$rewardValueInAED', 100] },
          //           '$$masterdata'
          //         ]
          //       }
          //     }
          //   }
          // },
          'reward points': {
            $floor: {
              $divide: [
                { $multiply: ['$redeem_amount_wallet', 100] },
                {
                  $ifNull: [rewardData?.reward_point, 1],
                },
              ],
            },
          },
          'referred by': { $arrayElemAt: ['$rewardData.customer_id', 0] },
        },
      },
    ];

    const financeData = await this.OrderModel.aggregate([
      {
        $match: {
          order_status: 'Completed',
          financial_status: 'Paid',
          createdAt: {
            $gte: moment(new Date(startDate))
              .utcOffset(240)
              .startOf('day')
              .toDate(),
            $lte: moment(new Date(endDate))
              .utcOffset(240)
              .endOf('day')
              .toDate(),
          },
        },
      },
      ...query,
      {
        $project: {
          _id: 0,
          addon_discount: 1,
          payment_method: 1,
          'Order Id': 1,
          'Customer Id': 1,
          order_number: 1,
          'Order date': 1,
          product: 1,
          fullName: 1,
          fullAddress: 1,
          delivery_start_date: 1,
          end_date: 1,
          'gross amount': 1,
          discount: 1,
          total_addon_discount: 1,
          addon_discount_type: 1,
          'referral discount': 1,
          'reward discount': 1,
          is_used_reward_wallet: 1,
          offer_applicable: 1,
          offer_type: 1,
          'earn aed': 1,
          'earn points': 1,
          'reward points': 1,
          VAT: 1,
          'net amount': 1,
          'transaction id': 1,
          'ndd order date': 1,
          'couponData.coupon_code': 1,
          'couponData.name': 1,
          refundable_deposite: 1,
          'plan type': 1,
          plan: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'normal',
                    ],
                  },
                  then: 'MP',
                },
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'smart_saver',
                    ],
                  },
                  then: 'Essential',
                },
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'flexi',
                    ],
                  },
                  then: 'BYO',
                },
              ],
              default: 'MP', // Fallback
            },
          },
          'plan size': 1,
          protein_category: 1,
          // no_of_breakfast: "$subscriptionData.no_of_breakfast",
          // no_of_snacks: "$subscriptionData.no_of_snacks",
          // no_of_meals: "$subscriptionData.no_of_meals",
          no_of_breakfast: {
            $cond: {
              if: { $eq: ['$order_type', 'subscription'] },
              then: { $arrayElemAt: ['$subscriptionData.no_of_breakfast', 0] },
              else: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$order_item',
                        as: 'item',
                        cond: {
                          $eq: ['$$item.meal_category', 'Breakfast'],
                        },
                      },
                    },
                    as: 'breakfast_item',
                    in: '$$breakfast_item.qty',
                  },
                },
              },
            },
          },
          no_of_snacks: {
            $cond: {
              if: { $eq: ['$order_type', 'subscription'] },
              then: { $arrayElemAt: ['$subscriptionData.no_of_snacks', 0] },
              else: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$order_item',
                        as: 'item',
                        cond: { $eq: ['$$item.meal_category', 'Snack'] },
                      },
                    },
                    as: 'snack_item',
                    in: '$$snack_item.qty',
                  },
                },
              },
            },
          },
          no_of_meals: {
            $cond: {
              if: { $eq: ['$order_type', 'subscription'] },
              then: { $arrayElemAt: ['$subscriptionData.no_of_meals', 0] },
              else: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$order_item',
                        as: 'item',
                        cond: { $eq: ['$$item.meal_category', 'Meal'] },
                      },
                    },
                    as: 'meal_item',
                    in: '$$meal_item.qty',
                  },
                },
              },
            },
          },
          shopify_total_orders: {
            $arrayElemAt: ['$customerData.shopify_total_orders', 0],
          },
          total_orders: { $arrayElemAt: ['$customerData.total_orders', 0] },
          client_info: 1,
          'referred by': 1,
        },
      },
    ]);

    const financeDataCancelled = await this.OrderModel.aggregate([
      {
        $match: {
          $or: [
            { order_status: 'Cancelled' },
            { order_status: 'Partially_Cancelled' },
          ],
          financial_status: 'Paid',
          createdAt: {
            $gte: moment(new Date(startDate))
              .utcOffset(240)
              .startOf('day')
              .toDate(),
            $lte: moment(new Date(endDate))
              .utcOffset(240)
              .endOf('day')
              .toDate(),
          },
        },
      },
      ...query,
      {
        $project: {
          _id: 0,
          addon_discount: 1,
          payment_method: 1,
          'Order Id': 1,
          'Customer Id': 1,
          order_number: 1,
          'Order date': 1,
          product: 1,
          fullName: 1,
          fullAddress: 1,
          delivery_start_date: 1,
          end_date: 1,
          'gross amount': 1,
          discount: 1,
          total_addon_discount: 1,
          addon_discount_type: 1,
          'referral discount': 1,
          'reward discount': 1,
          is_used_reward_wallet: 1,
          'earn aed': 1,
          'earn points': 1,
          'reward points': 1,
          offer_applicable: 1,
          offer_type: 1,
          VAT: 1,
          'net amount': 1,
          'transaction id': 1,
          'ndd order date': 1,
          'couponData.coupon_code': 1,
          'couponData.name': 1,
          'plan type': 1,
          plan: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'normal',
                    ],
                  },
                  then: 'MP',
                },
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'smart_saver',
                    ],
                  },
                  then: 'Essential',
                },
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'flexi',
                    ],
                  },
                  then: 'BYO',
                },
              ],
              default: 'MP', // Fallback
            },
          },
          refundable_deposite: 1,
          protein_category: 1,
          'plan size': 1,
          // no_of_breakfast: "$subscriptionData.no_of_breakfast",
          // no_of_snacks: "$subscriptionData.no_of_snacks",
          // no_of_meals: "$subscriptionData.no_of_meals",
          no_of_breakfast: {
            $cond: {
              if: { $eq: ['$order_type', 'subscription'] },
              then: { $arrayElemAt: ['$subscriptionData.no_of_breakfast', 0] },
              else: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$order_item',
                        as: 'item',
                        cond: {
                          $eq: ['$$item.meal_category', 'Breakfast'],
                        },
                      },
                    },
                    as: 'breakfast_item',
                    in: '$$breakfast_item.qty',
                  },
                },
              },
            },
          },
          no_of_snacks: {
            $cond: {
              if: { $eq: ['$order_type', 'subscription'] },
              then: { $arrayElemAt: ['$subscriptionData.no_of_snacks', 0] },
              else: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$order_item',
                        as: 'item',
                        cond: { $eq: ['$$item.meal_category', 'Snack'] },
                      },
                    },
                    as: 'snack_item',
                    in: '$$snack_item.qty',
                  },
                },
              },
            },
          },
          no_of_meals: {
            $cond: {
              if: { $eq: ['$order_type', 'subscription'] },
              then: { $arrayElemAt: ['$subscriptionData.no_of_meals', 0] },
              else: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$order_item',
                        as: 'item',
                        cond: { $eq: ['$$item.meal_category', 'Meal'] },
                      },
                    },
                    as: 'meal_item',
                    in: '$$meal_item.qty',
                  },
                },
              },
            },
          },
          shopify_total_orders: {
            $arrayElemAt: ['$customerData.shopify_total_orders', 0],
          },
          total_orders: { $arrayElemAt: ['$customerData.total_orders', 0] },
          refund_amount: '$refund',
          reason: 1,
          order_status: 1,
          meal_plan_days_now: {
            $arrayElemAt: ['$cancellation_details.meal_plan_days_now', 0],
          },
          meal_plan_days_before: {
            $arrayElemAt: ['$cancellation_details.meal_plan_days_before', 0],
          },
          client_info: 1,
          'referred by': 1,
        },
      },
    ]);

    let financeCompleted: any = { data: { data: [] } };
    let financeCancelledPartiallyCancelled: any = { data: { data: [] } };

    // 1️⃣ Fetch Finance Completed with error handling
    try {
      financeCompleted = await firstValueFrom(
        this.httpService.get(
          `${process.env.ANALYTICS_URL}/api/v1/finance/report/completed?startDate=${startDate}&endDate=${endDate}`,
          //  `http://localhost:4000/api/v1/finance/report/completed?startDate=${startDate}&endDate=${endDate}`
        ),
      );
    } catch (error) {
      const err = error as AxiosError;
      console.error('❌ Finance Completed API failed:', err?.message || err);
      financeCompleted = { data: { data: [] } }; // empty sheet fallback
    }

    // 2️⃣ Fetch Finance Cancelled/Partially Cancelled with error handling
    try {
      financeCancelledPartiallyCancelled = await firstValueFrom(
        this.httpService.get(
          `${process.env.ANALYTICS_URL}/api/v1/finance/report/cancelled?startDate=${startDate}&endDate=${endDate}`,
          //  `http://localhost:4000/api/v1/finance/report/cancelled?startDate=${startDate}&endDate=${endDate}`
        ),
      );
    } catch (error) {
      const err = error as AxiosError;
      console.error('❌ Finance Cancelled API failed:', err?.message || err);
      financeCancelledPartiallyCancelled = { data: { data: [] } }; // empty sheet fallback
    }

    // ---------- Fetch Customer Data ----------
    // Calculate yesterday's date range in IST - same logic as handleCustomerReportCron
    const yesterdayStartIST = moment()
      .subtract(1, 'days')
      .startOf('day')
      .utcOffset(240); // IST is UTC+5:30
    const yesterdayEndIST = moment()
      .subtract(1, 'days')
      .endOf('day')
      .utcOffset(240);

    // Convert IST to UTC for database queries
    const customerStartUTC = yesterdayStartIST.clone().utc().toDate();
    const customerEndUTC = yesterdayEndIST.clone().utc().toDate();

    // Query customers with filters using aggregation to include cart and order lookups
    const customerData = await this.CustomerModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: customerStartUTC,
            $lt: customerEndUTC, // ✅ FIXED: Use $lt instead of $lte
          },
          source: { $nin: ['shopify', 'newsletter', 'leads'] },
          total_subscription_order: 0,
          first_name: { $ne: 'Deleted' },
        },
      },
      {
        $lookup: {
          from: 'carts',
          let: { customerId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$unique_id', '$$customerId'] },
                    { $gte: ['$createdAt', customerStartUTC] },
                    { $lt: ['$createdAt', customerEndUTC] },
                  ],
                },
              },
            },
          ],
          as: 'carts',
        },
      },
      {
        $lookup: {
          from: 'orders',
          let: { customerId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$customer_id', '$$customerId'] },
                    { $gte: ['$createdAt', customerStartUTC] },
                    { $lt: ['$createdAt', customerEndUTC] },
                  ],
                },
              },
            },
          ],
          as: 'orders',
        },
      },
      {
        $project: {
          _id: 1,
          first_name: 1,
          last_name: 1,
          email: 1,
          country_code: 1,
          phone_number: 1,
          whatsapp_country_code: 1,
          whatsapp_number: 1,
          cartCreated: {
            $cond: {
              if: { $gt: [{ $size: '$carts' }, 0] },
              then: 'Y',
              else: '',
            },
          },
          OrderSessionCreated: {
            $cond: {
              if: { $gt: [{ $size: '$orders' }, 0] },
              then: 'Y',
              else: '',
            },
          },
        },
      },
    ]);

    // ---------- Fetch Abandoned Cart Data ----------
    // Calculate date range: startDate = today - 9 days, endDate = today - 2 days
    // Example: If triggered on 30 Dec, startDate -> 23 Dec, endDate -> 28 Dec
    const abandonedCartStartDubai = moment()
      .subtract(8, 'days')
      .startOf('day')
      .utcOffset(240); // Dubai timezone UTC+4
    const abandonedCartEndDubai = moment()
      .subtract(2, 'days')
      .endOf('day')
      .utcOffset(240);
    // Convert Dubai time to UTC for database queries
    const abandonedCartStartUTC = abandonedCartStartDubai
      .clone()
      .utc()
      .toDate();
    const abandonedCartEndUTC = abandonedCartEndDubai.clone().utc().toDate();
    // Format dates as strings for filename
    const abandonedCartStartDateStr =
      abandonedCartStartDubai.format('YYYY-MM-DD');
    const abandonedCartEndDateStr = abandonedCartEndDubai.format('YYYY-MM-DD');
    const abandonedCartData = await this.CartModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: abandonedCartStartUTC,
            $lt: abandonedCartEndUTC,
          },
        },
      },
      {
        $addFields: {
          isCustomerIdObjectId: {
            $regexMatch: {
              input: '$customer_id',
              regex: /^[a-fA-F0-9]{24}$/,
            },
          },
        },
      },
      {
        $match: {
          isCustomerIdObjectId: true,
        },
      },
      {
        $addFields: {
          customer_new_id: {
            $toObjectId: '$customer_id',
          },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer_new_id',
          foreignField: '_id',
          as: 'customerData',
        },
      },
      {
        $unwind: {
          path: '$customerData',
        },
      },
      {
        $match: {
          $and: [
            {
              'customerData.phone_number': {
                $ne: '',
              },
            },
            {
              'customerData.phone_number': {
                $ne: null,
              },
            },
            {
              'customerData.phone_number': {
                $exists: true,
              },
            },
          ],
        },
      },
      this.getAbandonedCartOrderLookupStage(),
      {
        $unwind: {
          path: '$orderData',
          preserveNullAndEmptyArrays: true,
        },
      },
      ...this.getAbandonedCartLeadLookupStages(),
      {
        $project: {
          'Customer Id': { $toString: '$customerData._id' },
          'Created At': {
            $dateToString: {
              format: '%d/%m/%Y',
              date: '$createdAt',
            },
          },
          'First Name': '$customerData.first_name',
          'Last Name': '$customerData.last_name',
          'Primary Phone': '$customerData.phone_number',
          'Alternate Phone Country Code': '$customerData.whatsapp_country_code',
          'Alternate Phone': '$customerData.whatsapp_number',
          ...this.getAbandonedCartAdditionalFields(),
          ...this.getAbandonedCartLeadStageFieldsFromCart(),
          Area: {
            $cond: {
              if: {
                $and: [
                  { $ifNull: ['$address_data.province', false] },
                  { $ne: ['$address_data.province', []] },
                ],
              },
              then: '$address_data.province',
              else: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $ifNull: ['$cart_item.0.address_data.province', false],
                      },
                      { $ne: ['$cart_item.0.address_data.province', []] },
                    ],
                  },
                  then: '$cart_item.0.address_data.province',
                  else: '',
                },
              },
            },
          },
          City: {
            $cond: {
              if: {
                $and: [
                  { $ifNull: ['$address_data.city', false] },
                  { $ne: ['$address_data.city', []] },
                ],
              },
              then: '$address_data.city',
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $ifNull: ['$cart_item.0.address_data.city', false] },
                      { $ne: ['$cart_item.0.address_data.city', []] },
                    ],
                  },
                  then: '$cart_item.0.address_data.city',
                  else: '',
                },
              },
            },
          },
          'Last Order Date': {
            $cond: {
              if: {
                $and: [
                  { $ne: ['$orderData', null] },
                  { $ifNull: ['$orderData.createdAt', false] },
                ],
              },
              then: {
                $dateToString: {
                  format: '%d/%m/%Y',
                  date: '$orderData.createdAt',
                  timezone: 'Asia/Dubai',
                },
              },
              else: '',
            },
          },
          'Type of Order': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: { $ifNull: ['$orderData.type_of_order', ''] },
              else: '',
            },
          },
          'Days of Plan': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: {
                $let: {
                  vars: {
                    orderItem: { $ifNull: ['$orderData.order_item', []] },
                  },
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $isArray: '$$orderItem' },
                          { $gt: [{ $size: '$$orderItem' }, 0] },
                        ],
                      },
                      then: {
                        $let: {
                          vars: {
                            firstOrderItem: {
                              $arrayElemAt: ['$$orderItem', 0],
                            },
                          },
                          in: {
                            $ifNull: [
                              '$$firstOrderItem.plan_duration_in_days',
                              '',
                            ],
                          },
                        },
                      },
                      else: '',
                    },
                  },
                },
              },
              else: '',
            },
          },
          'Deliverable Days': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: {
                $let: {
                  vars: {
                    orderItem: { $ifNull: ['$orderData.order_item', []] },
                  },
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $isArray: '$$orderItem' },
                          { $gt: [{ $size: '$$orderItem' }, 0] },
                        ],
                      },
                      then: {
                        $let: {
                          vars: {
                            firstOrderItem: {
                              $arrayElemAt: ['$$orderItem', 0],
                            },
                          },
                          in: {
                            $ifNull: ['$$firstOrderItem.delivery_days', ''],
                          },
                        },
                      },
                      else: '',
                    },
                  },
                },
              },
              else: '',
            },
          },
          'Diet Type': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: {
                $let: {
                  vars: {
                    orderItem: { $ifNull: ['$orderData.order_item', []] },
                  },
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $isArray: '$$orderItem' },
                          { $gt: [{ $size: '$$orderItem' }, 0] },
                        ],
                      },
                      then: {
                        $let: {
                          vars: {
                            firstOrderItem: {
                              $arrayElemAt: ['$$orderItem', 0],
                            },
                          },
                          in: {
                            $ifNull: ['$$firstOrderItem.protein_category', ''],
                          },
                        },
                      },
                      else: '',
                    },
                  },
                },
              },
              else: '',
            },
          },
          'Total Meals': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: {
                $let: {
                  vars: {
                    orderItem: { $ifNull: ['$orderData.order_item', []] },
                  },
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $isArray: '$$orderItem' },
                          { $gt: [{ $size: '$$orderItem' }, 0] },
                        ],
                      },
                      then: {
                        $let: {
                          vars: {
                            firstOrderItem: {
                              $arrayElemAt: ['$$orderItem', 0],
                            },
                          },
                          in: {
                            $let: {
                              vars: {
                                selectedMeal: {
                                  $ifNull: [
                                    '$$firstOrderItem.selected_meal',
                                    [],
                                  ],
                                },
                              },
                              in: {
                                $cond: {
                                  if: { $isArray: '$$selectedMeal' },
                                  then: {
                                    $reduce: {
                                      input: '$$selectedMeal',
                                      initialValue: '',
                                      in: {
                                        $cond: {
                                          if: { $eq: ['$$value', ''] },
                                          then: '$$this',
                                          else: {
                                            $concat: ['$$value', ',', '$$this'],
                                          },
                                        },
                                      },
                                    },
                                  },
                                  else: '',
                                },
                              },
                            },
                          },
                        },
                      },
                      else: '',
                    },
                  },
                },
              },
              else: '',
            },
          },
          ...this.getAbandonedCartLeadStatusProjection(),
        },
      },
    ]);

    const workbook = new ExcelJS.Workbook();

    // 1️⃣ Finance Report
    this.createWorksheet(
      workbook,
      'Finance_Report',
      financeData,
      startDate,
      endDate,
    );

    // 2️⃣ UTM Source
    this.createWorksheet(
      workbook,
      'UTM Source',
      financeCompleted.data.data,
      startDate,
      endDate,
    ); //completed

    // 3️⃣ CANOR_PARTCAN Finance Report
    this.createWorksheet(
      workbook,
      'CANOR_PARTCAN_Finance_Report',
      financeDataCancelled,
      startDate,
      endDate,
    );

    // 4️⃣ CANOR_PARTCAN UTM Source
    this.createWorksheet(
      workbook,
      'CANOR_PARTCAN_UTM Source',
      financeCancelledPartiallyCancelled.data.data,
      startDate,
      endDate,
    ); //cancelled and partiallCancelled

    // 5️⃣ Customer Report
    this.createWorksheet(
      workbook,
      'Customer_Report',
      customerData,
      startDate,
      endDate,
    );

    // ---------- Save First Workbook (5 sheets) ----------
    const projectRoot = path.resolve(__dirname, '..', '..');
    const reportsDir = path.join(projectRoot, 'src', 'uploads');

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const fileName = `delivery_report_${Date.now()}.xlsx`;
    const filePath = path.join(reportsDir, fileName);
    await workbook.xlsx.writeFile(filePath);

    // ---------- Upload First Workbook to S3 ----------
    const buffer = fs.readFileSync(filePath);
    const fileObj = {
      buffer: buffer,
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const uploadData = { model_name: 'finance' };
    const result = await uploadExceelFile(uploadData, fileObj);
    const finalResultURL = `${process.env.BUCKET_FOLDER_NAME}/finance/${result.url}`;

    // ---------- Send First Email (5 sheets) ----------
    const payload = {
      customer_id: '68acbe2d4dfac0f67b6c20c1',
      email: process.env.FINANCE_EMAIL_ID,
      report_type: 'finance_report',
      attachment_filename: `order_finance_report(${this.formatDateString(startDate, endDate) || ''}).xlsx`,
      file_extension: 'xlsx',
      mime_type: 'application/xlsx',
      cc_emails:
        process.env.FINANCE_CC_EMAILS?.split(',').map((email) =>
          email.trim(),
        ) || [],
      email_path: finalResultURL,
      dateString: this.formatDateString(startDate, endDate),
    };
    await this.notificationMasterService.sendNotificationMessage({
      channel: 'report_email',
      notificationPayload: payload,
    });

    // ---------- Delete first local file after upload ----------
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`❌ Error deleting file: ${filePath}`, err);
    }

    // ---------- Create Second Workbook (Abandoned Cart only) ----------
    const abandonedCartWorkbook = new ExcelJS.Workbook();
    this.createWorksheet(
      abandonedCartWorkbook,
      'Abandoned Cart',
      abandonedCartData,
      startDate,
      endDate,
    );

    // ---------- Save Second Workbook ----------
    const abandonedCartFileName = `abandoned_cart_report_${Date.now()}.xlsx`;
    const abandonedCartFilePath = path.join(reportsDir, abandonedCartFileName);
    await abandonedCartWorkbook.xlsx.writeFile(abandonedCartFilePath);

    // ---------- Upload Second Workbook to S3 ----------
    const abandonedCartBuffer = fs.readFileSync(abandonedCartFilePath);
    const abandonedCartFileObj = {
      buffer: abandonedCartBuffer,
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const abandonedCartUploadData = { model_name: 'finance' };
    const abandonedCartResult = await uploadExceelFile(
      abandonedCartUploadData,
      abandonedCartFileObj,
    );
    const abandonedCartFinalResultURL = `${process.env.BUCKET_FOLDER_NAME}/finance/${abandonedCartResult.url}`;

    // ---------- Send Second Email (Abandoned Cart) ----------
    const abandonedCartPayload = {
      customer_id: '68acbe2d4dfac0f67b6c20c1',
      email: process.env.FINANCE_EMAIL_ID,
      report_type: 'abandoned_cart_report',
      attachment_filename: `abandoned_cart_report(${this.formatDateString(abandonedCartStartDateStr, abandonedCartEndDateStr) || ''}).xlsx`,
      file_extension: 'xlsx',
      mime_type: 'application/xlsx',
      cc_emails:
        process.env.ABANDONED_CART_CC_EMAILS?.split(',').map((email) =>
          email.trim(),
        ) || [],
      email_path: abandonedCartFinalResultURL,
      dateString: this.formatDateString(startDate, endDate),
    };
    await this.notificationMasterService.sendNotificationMessage({
      channel: 'report_email',
      notificationPayload: abandonedCartPayload,
    });

    // ---------- Delete second local file after upload ----------
    try {
      fs.unlinkSync(abandonedCartFilePath);
    } catch (err) {
      console.error(`❌ Error deleting file: ${abandonedCartFilePath}`, err);
    }
    // console.log("✅ live url", `${process.env.BUCKET_FILE_URL}/rms-staging/finance/${result.url}`);

    return {
      statusCode: 200,
      status: true,
      financeData: financeData,
      financeCompleted: financeCompleted.data.data,
      cancelledData: financeDataCancelled,
      financeCancelledPartiallyCancelled:
        financeCancelledPartiallyCancelled.data.data,
    };
  }

  // manual delivery finance report
  async getAbandonedCartList(
    startDate: string,
    endDate: string,
    page?: string,
    limit?: string,
    subStage?: string,
    leadStageCode?: string,
  ) {
    const {
      abandonedCartStartDubai,
      abandonedCartEndDubai,
      abandonedCartStartUTC,
      abandonedCartEndUTC,
    } = this.getAbandonedWindow(startDate, endDate);
    const abandonedCartStartDateStr =
      abandonedCartStartDubai.format('YYYY-MM-DD');
    const abandonedCartEndDateStr = abandonedCartEndDubai.format('YYYY-MM-DD');

    const normalizedSubStage = subStage?.trim();
    const normalizedLeadStageCode = leadStageCode?.trim().toUpperCase();
    const validLeadStageCodes = LEAD_FUNNEL_STAGES.map((stage) => stage.code);
    const isValidLeadStageCode = (
      value: string,
    ): value is (typeof LEAD_FUNNEL_STAGES)[number]['code'] =>
      validLeadStageCodes.includes(
        value as (typeof LEAD_FUNNEL_STAGES)[number]['code'],
      );
    const isValidMqlSubStage = (
      value: string,
    ): value is (typeof MQL_SUB_STAGE_CODES)[number] =>
      MQL_SUB_STAGE_CODES.includes(
        value as (typeof MQL_SUB_STAGE_CODES)[number],
      );
    if (normalizedSubStage && !isValidMqlSubStage(normalizedSubStage)) {
      throw new BadRequestException(
        `Invalid sub_stage "${normalizedSubStage}". Allowed values: ${MQL_SUB_STAGE_CODES.join(', ')}`,
      );
    }
    if (
      normalizedLeadStageCode &&
      !isValidLeadStageCode(normalizedLeadStageCode)
    ) {
      throw new BadRequestException(
        `Invalid stage_code "${normalizedLeadStageCode}". Allowed values: ${validLeadStageCodes.join(', ')}`,
      );
    }
    if (
      normalizedSubStage &&
      normalizedLeadStageCode &&
      normalizedLeadStageCode !== LEAD_STAGE.MQL
    ) {
      throw new BadRequestException(
        'sub_stage filter is supported only when stage_code is MQL.',
      );
    }

    const stageFilterStage = normalizedLeadStageCode
      ? [
          {
            $match: {
              $expr: {
                $and: [
                  { $gt: [{ $size: '$latestLeadStageHistory' }, 0] },
                  {
                    $eq: [
                      { $arrayElemAt: ['$latestLeadStageHistory.to_stage', 0] },
                      normalizedLeadStageCode,
                    ],
                  },
                ],
              },
            },
          },
        ]
      : [];

    const subStageFilterStage = normalizedSubStage
      ? [
          {
            $match: {
              $expr: {
                $and: [
                  { $gt: [{ $size: '$latestLeadStageHistory' }, 0] },
                  {
                    $eq: [
                      { $arrayElemAt: ['$latestLeadStageHistory.to_stage', 0] },
                      LEAD_STAGE.MQL,
                    ],
                  },
                  {
                    $eq: [
                      {
                        $arrayElemAt: ['$latestLeadStageHistory.sub_stage', 0],
                      },
                      normalizedSubStage,
                    ],
                  },
                ],
              },
            },
          },
        ]
      : [];

    const abandonedCartData = await this.CartModel.aggregate([
      ...this.getAbandonedCartBasePipelineStages(
        abandonedCartStartUTC,
        abandonedCartEndUTC,
      ),
      ...stageFilterStage,
      ...subStageFilterStage,
      {
        $project: {
          'Customer Id': { $toString: '$customerData._id' },
          'Created At': {
            $dateToString: {
              format: '%d/%m/%Y',
              date: '$createdAt',
            },
          },
          'First Name': '$customerData.first_name',
          'Last Name': '$customerData.last_name',
          'Primary Phone': '$customerData.phone_number',
          'Alternate Phone Country Code': '$customerData.whatsapp_country_code',
          'Alternate Phone': '$customerData.whatsapp_number',
          ...this.getAbandonedCartAdditionalFields(),
          ...this.getAbandonedCartLeadStageFieldsFromHistory(),
          Area: {
            $cond: {
              if: {
                $and: [
                  { $ifNull: ['$address_data.province', false] },
                  { $ne: ['$address_data.province', []] },
                ],
              },
              then: '$address_data.province',
              else: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $ifNull: ['$cart_item.0.address_data.province', false],
                      },
                      { $ne: ['$cart_item.0.address_data.province', []] },
                    ],
                  },
                  then: '$cart_item.0.address_data.province',
                  else: '',
                },
              },
            },
          },
          City: {
            $cond: {
              if: {
                $and: [
                  { $ifNull: ['$address_data.city', false] },
                  { $ne: ['$address_data.city', []] },
                ],
              },
              then: '$address_data.city',
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $ifNull: ['$cart_item.0.address_data.city', false] },
                      { $ne: ['$cart_item.0.address_data.city', []] },
                    ],
                  },
                  then: '$cart_item.0.address_data.city',
                  else: '',
                },
              },
            },
          },
          'Last Order Date': {
            $cond: {
              if: {
                $and: [
                  { $ne: ['$orderData', null] },
                  { $ifNull: ['$orderData.createdAt', false] },
                ],
              },
              then: {
                $dateToString: {
                  format: '%d/%m/%Y',
                  date: '$orderData.createdAt',
                  timezone: 'Asia/Dubai',
                },
              },
              else: '',
            },
          },
          'Type of Order': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: { $ifNull: ['$orderData.type_of_order', ''] },
              else: '',
            },
          },
          'Days of Plan': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: {
                $ifNull: [
                  {
                    $arrayElemAt: [
                      '$orderData.order_item.plan_duration_in_days',
                      0,
                    ],
                  },
                  '',
                ],
              },
              else: '',
            },
          },
          'Deliverable Days': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: {
                $ifNull: [
                  { $arrayElemAt: ['$orderData.order_item.delivery_days', 0] },
                  '',
                ],
              },
              else: '',
            },
          },
          'Diet Type': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: {
                $ifNull: [
                  {
                    $arrayElemAt: ['$orderData.order_item.protein_category', 0],
                  },
                  '',
                ],
              },
              else: '',
            },
          },
          'Total Meals': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: {
                $let: {
                  vars: {
                    selectedMeal: {
                      $ifNull: [
                        {
                          $arrayElemAt: [
                            '$orderData.order_item.selected_meal',
                            0,
                          ],
                        },
                        [],
                      ],
                    },
                  },
                  in: {
                    $cond: {
                      if: { $isArray: '$$selectedMeal' },
                      then: {
                        $reduce: {
                          input: '$$selectedMeal',
                          initialValue: '',
                          in: {
                            $cond: {
                              if: { $eq: ['$$value', ''] },
                              then: '$$this',
                              else: { $concat: ['$$value', ',', '$$this'] },
                            },
                          },
                        },
                      },
                      else: '',
                    },
                  },
                },
              },
              else: '',
            },
          },
          ...this.getAbandonedCartLeadStatusProjection(),
        },
      },
    ]);

    const normalizedData = this.normalizeListKeysToSnakeCase(abandonedCartData);
    const count = normalizedData.length;

    const parsedPage = Number.parseInt(page || '1', 10);
    const parsedLimit = Number.parseInt(limit || '10', 10);

    const currentPage =
      Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const perPage =
      Number.isNaN(parsedLimit) || parsedLimit < 1 ? 10 : parsedLimit;
    const totalPages = Math.max(1, Math.ceil(count / perPage));
    const paginatedList = normalizedData.slice(
      (currentPage - 1) * perPage,
      currentPage * perPage,
    );
    const totalFinalSum = normalizedData.reduce((sum, row) => {
      const cartValue =
        typeof row?.cart_value === 'number'
          ? row.cart_value
          : Number.parseFloat(String(row?.cart_value ?? 0));

      return Number.isNaN(cartValue) ? sum : sum + cartValue;
    }, 0);

    return {
      statusCode: 200,
      status: 'success',
      message: 'Abandoned cart list fetched successfully',
      dateRange: {
        startDate,
        endDate,
        abandonedCartWindowStart: abandonedCartStartDateStr,
        abandonedCartWindowEnd: abandonedCartEndDateStr,
        abandonedCartWindowLabel: this.formatDateString(
          abandonedCartStartDateStr,
          abandonedCartEndDateStr,
        ),
      },
      filters: {
        lead_stage_code: normalizedLeadStageCode || null,
        sub_stage: normalizedSubStage || null,
      },
      count,
      totalFinalSum: Number(totalFinalSum.toFixed(2)),
      currentPage,
      totalPages,
      list: paginatedList,
    };
  }

  async getAbandonedCartMqlList(
    startDate: string,
    endDate: string,
    page?: string,
    limit?: string,
    subStage?: string,
  ) {
    return this.getAbandonedCartList(
      startDate,
      endDate,
      page,
      limit,
      subStage,
      LEAD_STAGE.MQL,
    );
  }

  async getAbandonedCartDashboard(startDate: string, endDate: string) {
    const stageCountsFromHistory = await this.LeadStageHistoryModel.aggregate([
      {
        $group: {
          _id: '$to_stage',
          count: { $sum: 1 },
        },
      },
    ]);

    const [mqlSubStageCounts] = await this.LeadStageHistoryModel.aggregate([
      {
        $facet: {
          mql_sub_stage_counts: [
            { $match: { to_stage: LEAD_STAGE.MQL } },
            {
              $group: {
                _id: { $ifNull: ['$sub_stage', 'NO_SUB_STAGE'] },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const [convertedAmountFromHistory] =
      await this.LeadStageHistoryModel.aggregate([
        {
          $match: {
            to_stage: LEAD_STAGE.CONVERTED,
          },
        },
        {
          $addFields: {
            cart_id_str: { $toString: '$cart_id' },
          },
        },
        { $sort: { changed_at: -1 as const, createdAt: -1 as const } },
        {
          $group: {
            _id: '$cart_id_str',
          },
        },
        {
          $lookup: {
            from: 'orders',
            let: { cartIdStr: '$_id' },
            pipeline: [
              {
                $addFields: {
                  order_cart_id_str: { $toString: '$cart_id' },
                },
              },
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$order_cart_id_str', '$$cartIdStr'] },
                      {
                        $in: [
                          '$order_status',
                          ['Completed', 'Partially_Cancelled'],
                        ],
                      },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 as const } },
              { $limit: 1 },
            ],
            as: 'orderData',
          },
        },
        {
          $unwind: {
            path: '$orderData',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: null,
            converted_leads: { $sum: 1 },
            converted_amount: {
              $sum: { $ifNull: ['$orderData.final_order_total', 0] },
            },
          },
        },
      ]);
    const totalLeadStageEvents = (stageCountsFromHistory ?? []).reduce(
      (sum, row) => sum + (row.count ?? 0),
      0,
    );
    const convertedLeads = convertedAmountFromHistory?.converted_leads ?? 0;
    const convertedAmount = convertedAmountFromHistory?.converted_amount ?? 0;
    const stageCountMap: Record<string, number> = {};
    for (const row of stageCountsFromHistory ?? []) {
      stageCountMap[row._id] = row.count;
    }

    const stage_counts = [
      ...LEAD_FUNNEL_STAGES.map((stage) => ({
        code: stage.code,
        label: stage.label,
        description: stage.description,
        set_by: stage.set_by,
        count: stageCountMap[stage.code] ?? 0,
      })),
      {
        code: 'NO_STAGE',
        label: 'No stage',
        description: 'No leadstagehistories row yet',
        set_by: 'none',
        count: 0,
      },
    ];

    const mqlSubStageCountMap: Record<string, number> = {};
    for (const row of mqlSubStageCounts?.mql_sub_stage_counts ?? []) {
      mqlSubStageCountMap[row._id] = row.count;
    }

    const mql_sub_stage_counts = [
      ...MQL_SUB_STAGES.map((subStage) => ({
        code: subStage.code,
        label: subStage.label,
        type: subStage.type,
        count: mqlSubStageCountMap[subStage.code] ?? 0,
      })),
      {
        code: 'NO_SUB_STAGE',
        label: 'MQL without sub-stage',
        type: 'none',
        count: mqlSubStageCountMap.NO_SUB_STAGE ?? 0,
      },
    ];

    const conversionRate =
      totalLeadStageEvents > 0
        ? Number(((convertedLeads / totalLeadStageEvents) * 100).toFixed(2))
        : 0;

    return {
      statusCode: 200,
      status: 'success',
      message: 'Abandoned cart dashboard fetched successfully',
      dateRange: {
        startDate,
        endDate,
        scope: 'all_lead_stage_history',
      },
      summary: {
        total_leads: totalLeadStageEvents,
        converted_leads: convertedLeads,
        sql_leads: stageCountMap.SQL ?? 0,
        open_leads: Math.max(totalLeadStageEvents - convertedLeads, 0),
        conversion_rate_percent: conversionRate,
        total_cart_value: 0,
        converted_amount: Number((convertedAmount ?? 0).toFixed(2)),
        open_cart_value: 0,
      },
      lead_status: {
        closed: convertedLeads,
        open: Math.max(totalLeadStageEvents - convertedLeads, 0),
      },
      stage_counts,
      mql_sub_stage_counts,
      funnel_tracking: {
        collection: 'leadstagehistories',
        latest_stage_field: 'to_stage',
        mql_sub_stage_field: 'sub_stage',
        sql_meaning: 'Payment link generated',
        converted_meaning: 'Order paid after SQL (checkout webhook)',
      },
    };
  }

  async getConvertedLeadsWithCustomerDetails(
    startDate: string,
    endDate: string,
    page?: string,
    limit?: string,
  ) {
    const convertedStartDubai = this.parseAbandonedCartReportDate(startDate)
      .startOf('day')
      .utcOffset(240);
    const convertedEndDubai = this.parseAbandonedCartReportDate(endDate)
      .endOf('day')
      .utcOffset(240);
    const convertedStartUTC = convertedStartDubai.clone().utc().toDate();
    const convertedEndUTC = convertedEndDubai.clone().utc().toDate();

    const convertedLeads = await this.LeadStageHistoryModel.aggregate([
      {
        $match: {
          to_stage: LEAD_STAGE.CONVERTED,
          changed_at: {
            $gte: convertedStartUTC,
            $lte: convertedEndUTC,
          },
        },
      },
      {
        $addFields: {
          cart_id_str: { $toString: '$cart_id' },
        },
      },
      {
        $lookup: {
          from: 'carts',
          let: { cartId: '$cart_id', cartIdStr: '$cart_id_str' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $or: [
                    { $eq: ['$_id', '$$cartId'] },
                    { $eq: [{ $toString: '$_id' }, '$$cartIdStr'] },
                  ],
                },
              },
            },
            { $limit: 1 },
          ],
          as: 'cartData',
        },
      },
      {
        $unwind: {
          path: '$cartData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          resolved_customer_id: {
            $ifNull: ['$cartData.customer_id', '$customer_id'],
          },
          resolved_customer_id_str: {
            $toString: { $ifNull: ['$cartData.customer_id', '$customer_id'] },
          },
        },
      },
      {
        $addFields: {
          customer_object_id: {
            $cond: {
              if: {
                $regexMatch: {
                  input: '$resolved_customer_id_str',
                  regex: /^[a-fA-F0-9]{24}$/,
                },
              },
              then: { $toObjectId: '$resolved_customer_id_str' },
              else: '$$REMOVE',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer_object_id',
          foreignField: '_id',
          as: 'customerData',
        },
      },
      {
        $unwind: {
          path: '$customerData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'orders',
          let: {
            customerId: '$customer_object_id',
            cartId: '$cart_id',
            cartIdStr: '$cart_id_str',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$customer_id', '$$customerId'] },
                    {
                      $in: [
                        '$order_status',
                        ['Completed', 'Partially_Cancelled'],
                      ],
                    },
                  ],
                },
              },
            },
            {
              $addFields: {
                isCartOrder: {
                  $or: [
                    { $eq: ['$cart_id', '$$cartId'] },
                    { $eq: [{ $toString: '$cart_id' }, '$$cartIdStr'] },
                  ],
                },
              },
            },
            { $sort: { isCartOrder: -1 as const, createdAt: -1 as const } },
            { $limit: 1 },
          ],
          as: 'orderData',
        },
      },
      {
        $unwind: {
          path: '$orderData',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          converted_at_raw: '$changed_at',
          'Cart Id': '$cart_id_str',
          'Customer Id': '$resolved_customer_id_str',
          'Created At': {
            $cond: {
              if: { $ifNull: ['$cartData.createdAt', false] },
              then: {
                $dateToString: {
                  format: '%d/%m/%Y %H:%M',
                  date: '$cartData.createdAt',
                  timezone: 'Asia/Dubai',
                },
              },
              else: '',
            },
          },
          'Converted At': {
            $dateToString: {
              format: '%d/%m/%Y %H:%M',
              date: '$changed_at',
              timezone: 'Asia/Dubai',
            },
          },
          'First Name': { $ifNull: ['$customerData.first_name', ''] },
          'Last Name': { $ifNull: ['$customerData.last_name', ''] },
          Email: { $ifNull: ['$customerData.email', ''] },
          'Primary Phone Country Code': {
            $ifNull: ['$customerData.country_code', ''],
          },
          'Primary Phone': { $ifNull: ['$customerData.phone_number', ''] },
          'Whatsapp Country Code': {
            $ifNull: ['$customerData.whatsapp_country_code', ''],
          },
          'Whatsapp Number': { $ifNull: ['$customerData.whatsapp_number', ''] },
          'Customer Verified': {
            $ifNull: ['$customerData.is_verified', false],
          },
          'Lead Stage Code': '$to_stage',
          'Lead Stage Label': this.getLeadStageLabelAggregation({
            $ifNull: ['$to_stage', ''],
          }),
          'Conversion Source': { $ifNull: ['$source', ''] },
          'Converted Order Id': {
            $cond: {
              if: { $ifNull: ['$orderData._id', false] },
              then: { $toString: '$orderData._id' },
              else: '',
            },
          },
          'Converted Order Number': {
            $ifNull: ['$orderData.order_number', ''],
          },
          'Converted Order Date': {
            $cond: {
              if: { $ifNull: ['$orderData.createdAt', false] },
              then: {
                $dateToString: {
                  format: '%d/%m/%Y %H:%M',
                  date: '$orderData.createdAt',
                  timezone: 'Asia/Dubai',
                },
              },
              else: '',
            },
          },
          'Converted Amount': {
            $ifNull: [
              '$orderData.final_order_total',
              {
                $ifNull: [
                  '$cartData.final_total',
                  { $ifNull: ['$cartData.cart_total', 0] },
                ],
              },
            ],
          },
          City: {
            $ifNull: [
              '$cartData.address_data.city',
              { $ifNull: ['$cartData.cart_item.0.address_data.city', ''] },
            ],
          },
          Area: {
            $ifNull: [
              '$cartData.address_data.province',
              { $ifNull: ['$cartData.cart_item.0.address_data.province', ''] },
            ],
          },
        },
      },
      { $sort: { converted_at_raw: -1 as const } },
      { $project: { converted_at_raw: 0 } },
    ]);

    const normalizedData = this.normalizeListKeysToSnakeCase(convertedLeads);
    const count = normalizedData.length;
    const parsedPage = Number.parseInt(page || '1', 10);
    const parsedLimit = Number.parseInt(limit || '10', 10);
    const currentPage =
      Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const perPage =
      Number.isNaN(parsedLimit) || parsedLimit < 1 ? 10 : parsedLimit;
    const totalPages = Math.max(1, Math.ceil(count / perPage));
    const list = normalizedData.slice(
      (currentPage - 1) * perPage,
      currentPage * perPage,
    );

    return {
      statusCode: 200,
      status: 'success',
      message: 'Converted leads fetched from lead stage history successfully',
      dateRange: {
        startDate,
        endDate,
        conversion_window_start: convertedStartDubai.format('YYYY-MM-DD'),
        conversion_window_end: convertedEndDubai.format('YYYY-MM-DD'),
      },
      count,
      currentPage,
      totalPages,
      list,
    };
  }

  async getDeliveryFinanceReportManual(startDate: string, endDate: string) {
    const getMasterdata = async (data: Record<string, any>) => {
      const MasterdataDetails = await this.MasterModel.findOne(
        { name: 'master_data' },
        data,
      );
      return MasterdataDetails;
    };

    const rewardData = await getMasterdata({ reward_point: 1, _id: 0 });

    const query = [
      {
        $lookup: {
          from: 'customers',
          localField: 'customer_id',
          foreignField: '_id',
          as: 'customerData',
        },
      },
      {
        $lookup: {
          from: 'addresses',
          localField: 'address_id',
          foreignField: '_id',
          as: 'addressData',
        },
      },
      {
        $lookup: {
          from: 'subscriptions',
          localField: 'subscription_id',
          foreignField: '_id',
          as: 'subscriptionData',
        },
      },
      {
        $lookup: {
          from: 'coupons',
          localField: 'coupon_id',
          foreignField: '_id',
          as: 'couponData',
        },
      },
      {
        $lookup: {
          from: 'rewards',
          localField: 'referral_id',
          foreignField: '_id',
          as: 'rewardData',
        },
      },
      {
        $addFields: {
          'Order Id': '$_id',
          'Customer Id': { $arrayElemAt: ['$customerData._id', 0] },
          'Order date': {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$order_generation_time',
            },
          },
          fullName: {
            $concat: [
              {
                $arrayElemAt: ['$customerData.first_name', 0],
              },
              ' ',
              {
                $arrayElemAt: ['$customerData.last_name', 0],
              },
            ],
          },
          fullAddress: {
            $concat: [
              {
                $arrayElemAt: ['$addressData.address', 0],
              },
              ',',
              {
                $arrayElemAt: ['$addressData.address1', 0],
              },
              ',',
              {
                $arrayElemAt: ['$addressData.province', 0],
              },
              ',',
              {
                $arrayElemAt: ['$addressData.city', 0],
              },
            ],
          },
          product: '$order_type',
          protein_category: {
            $let: {
              vars: {
                // 1. Flatten all nested arrays and get unique values
                uniqueList: {
                  $setUnion: {
                    $reduce: {
                      input:
                        '$subscriptionData.selected_meal_type.protein_category',
                      initialValue: [],
                      in: {
                        $concatArrays: ['$$value', { $ifNull: ['$$this', []] }],
                      },
                    },
                  },
                },
              },
              in: {
                $cond: {
                  if: { $gt: [{ $size: '$$uniqueList' }, 0] },
                  then: {
                    // 2. Join the unique values with a comma
                    $reduce: {
                      input: '$$uniqueList',
                      initialValue: '',
                      in: {
                        $cond: [
                          { $eq: ['$$value', ''] },
                          '$$this',
                          { $concat: ['$$value', ', ', '$$this'] },
                        ],
                      },
                    },
                  },
                  else: 'balance', // Fallback if list is empty
                },
              },
            },
          },
          // delivery_start_date: {
          //   $dateToString: {
          //     format: "%Y-%m-%d",
          //     date: {
          //       $arrayElemAt: [
          //         "$subscriptionData.delivery_start_date",
          //         0,
          //       ],
          //     },
          //   },
          // },
          delivery_start_date: {
            $cond: {
              if: { $eq: ['$order_type', 'subscription'] },
              then: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: {
                    $arrayElemAt: ['$subscriptionData.delivery_start_date', 0],
                  },
                },
              },
              else: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$delivery_start_date',
                },
              },
            },
          },
          end_date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $arrayElemAt: ['$subscriptionData.end_date', 0],
              },
            },
          },
          'gross amount': '$order_total',
          discount: '$discount',
          total_addon_discount: {
            $sum: {
              $map: {
                input: '$addon_discount', // the array you want to map over
                as: 'discountItem', // alias for each item in the array
                in: '$$discountItem.discount', // extracting the discount field
              },
            },
          },
          addon_discount_type: {
            $arrayElemAt: ['$addon_discount.offer_type', 0],
          },
          VAT: '$order_vat_value',
          'referral discount': '$referral_discount',
          'reward discount': '$redeem_amount_wallet',
          'earn aed': '$reward_aed',
          'earn points': '$reward_value',
          'net amount': '$final_order_total',
          'transaction id': '$order_ref',
          'ndd order date': '$delivery_start_date',
          'plan type': { $arrayElemAt: ['$subscriptionData.plan_type', 0] },
          plan: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'normal',
                    ],
                  },
                  then: 'MP',
                },
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'smart_saver',
                    ],
                  },
                  then: 'Essential',
                },
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'flexi',
                    ],
                  },
                  then: 'BYO',
                },
              ],
              default: 'MP', // Fallback
            },
          },
          'plan size': {
            $let: {
              vars: {
                // 1. Flatten nested arrays and extract unique calorie ranges
                uniqueKcal: {
                  $setUnion: {
                    $reduce: {
                      input: '$subscriptionData.selected_meal_type.kcal_range',
                      initialValue: [],
                      in: { $concatArrays: ['$$value', '$$this'] },
                    },
                  },
                },
              },
              in: {
                // 2. Reduce the unique array into a single comma-separated string
                $reduce: {
                  input: '$$uniqueKcal',
                  initialValue: '',
                  in: {
                    $cond: [
                      { $eq: ['$$value', ''] },
                      { $toString: '$$this' },
                      { $concat: ['$$value', ', ', { $toString: '$$this' }] },
                    ],
                  },
                },
              },
            },
          },
          // 'reward points': {
          //   $let: {
          //     vars: {
          //       rewardValueInAED: '$redeem_amount_wallet',
          //       masterdata: {
          //         $ifNull: [rewardData?.reward_point, 1]
          //       }
          //       // masterdata: rewardData?.reward_point
          //     },
          //     in: {
          //       $floor: {
          //         $divide: [
          //           { $multiply: ['$rewardValueInAED', 100] },
          //           '$$masterdata'
          //         ]
          //       }
          //     }
          //   }
          // },
          'reward points': {
            $floor: {
              $divide: [
                { $multiply: ['$redeem_amount_wallet', 100] },
                {
                  $ifNull: [rewardData?.reward_point, 1],
                },
              ],
            },
          },
          'referred by': { $arrayElemAt: ['$rewardData.customer_id', 0] },
        },
      },
    ];

    const financeData = await this.OrderModel.aggregate([
      {
        $match: {
          order_status: 'Completed',
          financial_status: 'Paid',
          createdAt: {
            $gte: moment(new Date(startDate))
              .utcOffset(240)
              .startOf('day')
              .toDate(),
            $lte: moment(new Date(endDate))
              .utcOffset(240)
              .endOf('day')
              .toDate(),
          },
        },
      },
      ...query,
      {
        $project: {
          _id: 0,
          addon_discount: 1,
          payment_method: 1,
          'Order Id': 1,
          'Customer Id': 1,
          order_number: 1,
          'Order date': 1,
          product: 1,
          fullName: 1,
          fullAddress: 1,
          delivery_start_date: 1,
          end_date: 1,
          'gross amount': 1,
          discount: 1,
          total_addon_discount: 1,
          addon_discount_type: 1,
          'referral discount': 1,
          'reward discount': 1,
          is_used_reward_wallet: 1,
          offer_applicable: 1,
          offer_type: 1,
          'earn aed': 1,
          'earn points': 1,
          'reward points': 1,
          VAT: 1,
          'net amount': 1,
          'transaction id': 1,
          'ndd order date': 1,
          'couponData.coupon_code': 1,
          'couponData.name': 1,
          refundable_deposite: 1,
          'plan type': 1,
          plan: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'normal',
                    ],
                  },
                  then: 'MP',
                },
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'smart_saver',
                    ],
                  },
                  then: 'Essential',
                },
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'flexi',
                    ],
                  },
                  then: 'BYO',
                },
              ],
              default: 'MP', // Fallback
            },
          },
          'plan size': 1,
          protein_category: 1,
          // no_of_breakfast: "$subscriptionData.no_of_breakfast",
          // no_of_snacks: "$subscriptionData.no_of_snacks",
          // no_of_meals: "$subscriptionData.no_of_meals",
          no_of_breakfast: {
            $cond: {
              if: { $eq: ['$order_type', 'subscription'] },
              then: { $arrayElemAt: ['$subscriptionData.no_of_breakfast', 0] },
              else: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$order_item',
                        as: 'item',
                        cond: {
                          $eq: ['$$item.meal_category', 'Breakfast'],
                        },
                      },
                    },
                    as: 'breakfast_item',
                    in: '$$breakfast_item.qty',
                  },
                },
              },
            },
          },
          no_of_snacks: {
            $cond: {
              if: { $eq: ['$order_type', 'subscription'] },
              then: { $arrayElemAt: ['$subscriptionData.no_of_snacks', 0] },
              else: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$order_item',
                        as: 'item',
                        cond: { $eq: ['$$item.meal_category', 'Snack'] },
                      },
                    },
                    as: 'snack_item',
                    in: '$$snack_item.qty',
                  },
                },
              },
            },
          },
          no_of_meals: {
            $cond: {
              if: { $eq: ['$order_type', 'subscription'] },
              then: { $arrayElemAt: ['$subscriptionData.no_of_meals', 0] },
              else: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$order_item',
                        as: 'item',
                        cond: { $eq: ['$$item.meal_category', 'Meal'] },
                      },
                    },
                    as: 'meal_item',
                    in: '$$meal_item.qty',
                  },
                },
              },
            },
          },
          shopify_total_orders: {
            $arrayElemAt: ['$customerData.shopify_total_orders', 0],
          },
          total_orders: { $arrayElemAt: ['$customerData.total_orders', 0] },
          client_info: 1,
          'referred by': 1,
        },
      },
    ]);

    const financeDataCancelled = await this.OrderModel.aggregate([
      {
        $match: {
          $or: [
            { order_status: 'Cancelled' },
            { order_status: 'Partially_Cancelled' },
          ],
          financial_status: 'Paid',
          createdAt: {
            $gte: moment(new Date(startDate))
              .utcOffset(240)
              .startOf('day')
              .toDate(),
            $lte: moment(new Date(endDate))
              .utcOffset(240)
              .endOf('day')
              .toDate(),
          },
        },
      },
      ...query,
      {
        $project: {
          _id: 0,
          addon_discount: 1,
          payment_method: 1,
          'Order Id': 1,
          'Customer Id': 1,
          order_number: 1,
          'Order date': 1,
          product: 1,
          fullName: 1,
          fullAddress: 1,
          delivery_start_date: 1,
          end_date: 1,
          'gross amount': 1,
          discount: 1,
          total_addon_discount: 1,
          addon_discount_type: 1,
          'referral discount': 1,
          'reward discount': 1,
          is_used_reward_wallet: 1,
          'earn aed': 1,
          'earn points': 1,
          'reward points': 1,
          offer_applicable: 1,
          offer_type: 1,
          VAT: 1,
          'net amount': 1,
          'transaction id': 1,
          'ndd order date': 1,
          'couponData.coupon_code': 1,
          'couponData.name': 1,
          'plan type': 1,
          plan: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'normal',
                    ],
                  },
                  then: 'MP',
                },
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'smart_saver',
                    ],
                  },
                  then: 'Essential',
                },
                {
                  case: {
                    $eq: [
                      { $arrayElemAt: ['$subscriptionData.plan', 0] },
                      'flexi',
                    ],
                  },
                  then: 'BYO',
                },
              ],
              default: 'MP', // Fallback
            },
          },
          refundable_deposite: 1,
          protein_category: 1,
          'plan size': 1,
          // no_of_breakfast: "$subscriptionData.no_of_breakfast",
          // no_of_snacks: "$subscriptionData.no_of_snacks",
          // no_of_meals: "$subscriptionData.no_of_meals",
          no_of_breakfast: {
            $cond: {
              if: { $eq: ['$order_type', 'subscription'] },
              then: { $arrayElemAt: ['$subscriptionData.no_of_breakfast', 0] },
              else: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$order_item',
                        as: 'item',
                        cond: {
                          $eq: ['$$item.meal_category', 'Breakfast'],
                        },
                      },
                    },
                    as: 'breakfast_item',
                    in: '$$breakfast_item.qty',
                  },
                },
              },
            },
          },
          no_of_snacks: {
            $cond: {
              if: { $eq: ['$order_type', 'subscription'] },
              then: { $arrayElemAt: ['$subscriptionData.no_of_snacks', 0] },
              else: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$order_item',
                        as: 'item',
                        cond: { $eq: ['$$item.meal_category', 'Snack'] },
                      },
                    },
                    as: 'snack_item',
                    in: '$$snack_item.qty',
                  },
                },
              },
            },
          },
          no_of_meals: {
            $cond: {
              if: { $eq: ['$order_type', 'subscription'] },
              then: { $arrayElemAt: ['$subscriptionData.no_of_meals', 0] },
              else: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: '$order_item',
                        as: 'item',
                        cond: { $eq: ['$$item.meal_category', 'Meal'] },
                      },
                    },
                    as: 'meal_item',
                    in: '$$meal_item.qty',
                  },
                },
              },
            },
          },
          shopify_total_orders: {
            $arrayElemAt: ['$customerData.shopify_total_orders', 0],
          },
          total_orders: { $arrayElemAt: ['$customerData.total_orders', 0] },
          refund_amount: '$refund',
          reason: 1,
          order_status: 1,
          meal_plan_days_now: {
            $arrayElemAt: ['$cancellation_details.meal_plan_days_now', 0],
          },
          meal_plan_days_before: {
            $arrayElemAt: ['$cancellation_details.meal_plan_days_before', 0],
          },
          client_info: 1,
          'referred by': 1,
        },
      },
    ]);

    let financeCompleted: any = { data: { data: [] } };
    let financeCancelledPartiallyCancelled: any = { data: { data: [] } };

    // format before calling API
    // 1️⃣ Fetch Finance Completed with error handling
    try {
      financeCompleted = await firstValueFrom(
        this.httpService.get(
          `${process.env.ANALYTICS_URL}/api/v1/finance/report/completed?startDate=${startDate}&endDate=${endDate}`,
          //`http://localhost:4000/api/v1/finance/report/completed?startDate=${startDate}&endDate=${endDate}`
        ),
      );
    } catch (error) {
      // const err = error as AxiosError;
      // console.error("❌ Finance Completed API failed:", err?.message || err);
      financeCompleted = { data: { data: [] } }; // empty sheet fallback
    }

    // 2️⃣ Fetch Finance Cancelled/Partially Cancelled with error handling
    try {
      financeCancelledPartiallyCancelled = await firstValueFrom(
        this.httpService.get(
          `${process.env.ANALYTICS_URL}/api/v1/finance/report/cancelled?startDate=${startDate}&endDate=${endDate}`,
          //  `http://localhost:4000/api/v1/finance/report/cancelled?startDate=${startDate}&endDate=${endDate}`
        ),
      );
    } catch (error) {
      // const err = error as AxiosError;
      //  console.error("❌ Finance Cancelled API failed:", err?.message || err);
      financeCancelledPartiallyCancelled = { data: { data: [] } }; // empty sheet fallback
    }

    // ---------- Fetch Customer Data ----------
    // Parse the provided date range in IST timezone - same logic as handleCustomerReportCron
    const customerStartIST = moment(startDate, 'YYYY-MM-DD')
      .startOf('day')
      .utcOffset(240); // ✅ FIXED: Removed 'true' flag

    const customerEndIST = moment(endDate, 'YYYY-MM-DD')
      .endOf('day')
      .utcOffset(240); // ✅ FIXED: Removed 'true' flag

    // Convert IST to UTC for database queries
    const customerStartUTC = customerStartIST.clone().utc().toDate();
    const customerEndUTC = customerEndIST.clone().utc().toDate();

    // Query customers with filters using aggregation to include cart and order lookups
    const customerData = await this.CustomerModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: customerStartUTC,
            $lt: customerEndUTC, // ✅ FIXED: Use $lt instead of $lte
          },
          source: { $nin: ['shopify', 'newsletter', 'leads'] },
          total_subscription_order: 0,
          first_name: { $ne: 'Deleted' },
        },
      },
      {
        $lookup: {
          from: 'carts',
          let: { customerId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$unique_id', '$$customerId'] },
                    { $gte: ['$createdAt', customerStartUTC] },
                    { $lt: ['$createdAt', customerEndUTC] },
                  ],
                },
              },
            },
          ],
          as: 'carts',
        },
      },
      {
        $lookup: {
          from: 'orders',
          let: { customerId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$customer_id', '$$customerId'] },
                    { $gte: ['$createdAt', customerStartUTC] },
                    { $lt: ['$createdAt', customerEndUTC] },
                  ],
                },
              },
            },
          ],
          as: 'orders',
        },
      },
      {
        $project: {
          _id: 1,
          first_name: 1,
          last_name: 1,
          email: 1,
          country_code: 1,
          phone_number: 1,
          whatsapp_country_code: 1,
          whatsapp_number: 1,
          cartCreated: {
            $cond: {
              if: { $gt: [{ $size: '$carts' }, 0] },
              then: 'Y',
              else: '',
            },
          },
          OrderSessionCreated: {
            $cond: {
              if: { $gt: [{ $size: '$orders' }, 0] },
              then: 'Y',
              else: '',
            },
          },
        },
      },
    ]);

    // ---------- Fetch Abandoned Cart Data ----------
    const abandonedCartStartDubai = moment(startDate, 'YYYY-MM-DD')
      .subtract(8, 'days')
      .startOf('day')
      .utcOffset(240); // Dubai timezone UTC+4
    const abandonedCartEndDubai = moment(endDate, 'YYYY-MM-DD')
      .subtract(2, 'days')
      .endOf('day')
      .utcOffset(240);
    // Convert Dubai time to UTC for database queries
    const abandonedCartStartUTC = abandonedCartStartDubai
      .clone()
      .utc()
      .toDate();
    const abandonedCartEndUTC = abandonedCartEndDubai.clone().utc().toDate();
    // Format dates as strings for filename
    const abandonedCartStartDateStr =
      abandonedCartStartDubai.format('YYYY-MM-DD');
    const abandonedCartEndDateStr = abandonedCartEndDubai.format('YYYY-MM-DD');
    const abandonedCartData = await this.CartModel.aggregate([
      {
        $match: {
          createdAt: {
            $gte: abandonedCartStartUTC,
            $lt: abandonedCartEndUTC,
          },
        },
      },
      {
        $addFields: {
          isCustomerIdObjectId: {
            $regexMatch: {
              input: '$customer_id',
              regex: /^[a-fA-F0-9]{24}$/,
            },
          },
        },
      },
      {
        $match: {
          isCustomerIdObjectId: true,
        },
      },
      {
        $addFields: {
          customer_new_id: {
            $toObjectId: '$customer_id',
          },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer_new_id',
          foreignField: '_id',
          as: 'customerData',
        },
      },
      {
        $unwind: {
          path: '$customerData',
        },
      },
      {
        $match: {
          $and: [
            {
              'customerData.phone_number': {
                $ne: '',
              },
            },
            {
              'customerData.phone_number': {
                $ne: null,
              },
            },
            {
              'customerData.phone_number': {
                $exists: true,
              },
            },
          ],
        },
      },
      this.getAbandonedCartOrderLookupStage(),
      {
        $unwind: {
          path: '$orderData',
          preserveNullAndEmptyArrays: true,
        },
      },
      ...this.getAbandonedCartLeadLookupStages(),
      {
        $project: {
          'Created At': {
            $dateToString: {
              format: '%d/%m/%Y',
              date: '$createdAt',
            },
          },
          'First Name': '$customerData.first_name',
          'Last Name': '$customerData.last_name',
          'Primary Phone': '$customerData.phone_number',
          'Alternate Phone Country Code': '$customerData.whatsapp_country_code',
          'Alternate Phone': '$customerData.whatsapp_number',
          ...this.getAbandonedCartAdditionalFields(),
          ...this.getAbandonedCartLeadStageFieldsFromCart(),
          Area: {
            $cond: {
              if: {
                $and: [
                  { $ifNull: ['$address_data.province', false] },
                  { $ne: ['$address_data.province', []] },
                ],
              },
              then: '$address_data.province',
              else: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $ifNull: ['$cart_item.0.address_data.province', false],
                      },
                      { $ne: ['$cart_item.0.address_data.province', []] },
                    ],
                  },
                  then: '$cart_item.0.address_data.province',
                  else: '',
                },
              },
            },
          },
          City: {
            $cond: {
              if: {
                $and: [
                  { $ifNull: ['$address_data.city', false] },
                  { $ne: ['$address_data.city', []] },
                ],
              },
              then: '$address_data.city',
              else: {
                $cond: {
                  if: {
                    $and: [
                      { $ifNull: ['$cart_item.0.address_data.city', false] },
                      { $ne: ['$cart_item.0.address_data.city', []] },
                    ],
                  },
                  then: '$cart_item.0.address_data.city',
                  else: '',
                },
              },
            },
          },
          'Last Order Date': {
            $cond: {
              if: {
                $and: [
                  { $ne: ['$orderData', null] },
                  { $ifNull: ['$orderData.createdAt', false] },
                ],
              },
              then: {
                $dateToString: {
                  format: '%d/%m/%Y',
                  date: '$orderData.createdAt',
                  timezone: 'Asia/Dubai',
                },
              },
              else: '',
            },
          },
          'Type of Order': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: { $ifNull: ['$orderData.type_of_order', ''] },
              else: '',
            },
          },
          'Days of Plan': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: {
                $let: {
                  vars: {
                    orderItem: { $ifNull: ['$orderData.order_item', []] },
                  },
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $isArray: '$$orderItem' },
                          { $gt: [{ $size: '$$orderItem' }, 0] },
                        ],
                      },
                      then: {
                        $let: {
                          vars: {
                            firstOrderItem: {
                              $arrayElemAt: ['$$orderItem', 0],
                            },
                          },
                          in: {
                            $ifNull: [
                              '$$firstOrderItem.plan_duration_in_days',
                              '',
                            ],
                          },
                        },
                      },
                      else: '',
                    },
                  },
                },
              },
              else: '',
            },
          },
          'Deliverable Days': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: {
                $let: {
                  vars: {
                    orderItem: { $ifNull: ['$orderData.order_item', []] },
                  },
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $isArray: '$$orderItem' },
                          { $gt: [{ $size: '$$orderItem' }, 0] },
                        ],
                      },
                      then: {
                        $let: {
                          vars: {
                            firstOrderItem: {
                              $arrayElemAt: ['$$orderItem', 0],
                            },
                          },
                          in: {
                            $ifNull: ['$$firstOrderItem.delivery_days', ''],
                          },
                        },
                      },
                      else: '',
                    },
                  },
                },
              },
              else: '',
            },
          },
          'Diet Type': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: {
                $let: {
                  vars: {
                    orderItem: { $ifNull: ['$orderData.order_item', []] },
                  },
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $isArray: '$$orderItem' },
                          { $gt: [{ $size: '$$orderItem' }, 0] },
                        ],
                      },
                      then: {
                        $let: {
                          vars: {
                            firstOrderItem: {
                              $arrayElemAt: ['$$orderItem', 0],
                            },
                          },
                          in: {
                            $ifNull: ['$$firstOrderItem.protein_category', ''],
                          },
                        },
                      },
                      else: '',
                    },
                  },
                },
              },
              else: '',
            },
          },
          'Total Meals': {
            $cond: {
              if: { $ne: ['$orderData', null] },
              then: {
                $let: {
                  vars: {
                    orderItem: { $ifNull: ['$orderData.order_item', []] },
                  },
                  in: {
                    $cond: {
                      if: {
                        $and: [
                          { $isArray: '$$orderItem' },
                          { $gt: [{ $size: '$$orderItem' }, 0] },
                        ],
                      },
                      then: {
                        $let: {
                          vars: {
                            firstOrderItem: {
                              $arrayElemAt: ['$$orderItem', 0],
                            },
                          },
                          in: {
                            $let: {
                              vars: {
                                selectedMeal: {
                                  $ifNull: [
                                    '$$firstOrderItem.selected_meal',
                                    [],
                                  ],
                                },
                              },
                              in: {
                                $cond: {
                                  if: { $isArray: '$$selectedMeal' },
                                  then: {
                                    $reduce: {
                                      input: '$$selectedMeal',
                                      initialValue: '',
                                      in: {
                                        $cond: {
                                          if: { $eq: ['$$value', ''] },
                                          then: '$$this',
                                          else: {
                                            $concat: ['$$value', ',', '$$this'],
                                          },
                                        },
                                      },
                                    },
                                  },
                                  else: '',
                                },
                              },
                            },
                          },
                        },
                      },
                      else: '',
                    },
                  },
                },
              },
              else: '',
            },
          },
          ...this.getAbandonedCartLeadStatusProjection(),
        },
      },
    ]);

    const workbook = new ExcelJS.Workbook();

    // 1️⃣ Finance Report
    this.createWorksheet(
      workbook,
      'Finance_Report',
      financeData,
      startDate,
      endDate,
    );

    // 2️⃣ UTM Source
    this.createWorksheet(
      workbook,
      'UTM Source',
      financeCompleted.data.data,
      startDate,
      endDate,
    ); //completed

    // 3️⃣ CANOR_PARTCAN Finance Report
    this.createWorksheet(
      workbook,
      'CANOR_PARTCAN_Finance_Report',
      financeDataCancelled,
      startDate,
      endDate,
    );

    // 4️⃣ CANOR_PARTCAN UTM Source
    this.createWorksheet(
      workbook,
      'CANOR_PARTCAN_UTM Source',
      financeCancelledPartiallyCancelled.data.data,
      startDate,
      endDate,
    ); //cancelled and partiallCancelled

    // 5️⃣ Customer Report
    this.createWorksheet(
      workbook,
      'Customer_Report',
      customerData,
      startDate,
      endDate,
    );
    // ---------- Save First Workbook (5 sheets) ----------
    const projectRoot = path.resolve(__dirname, '..', '..');
    const reportsDir = path.join(projectRoot, 'src', 'uploads');

    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
    console.log('total completed document ', financeCompleted.data.data.length);
    const fileName = `delivery_report_${Date.now()}.xlsx`;
    const filePath = path.join(reportsDir, fileName);
    await workbook.xlsx.writeFile(filePath);

    // ---------- Upload First Workbook to S3 ----------
    const buffer = fs.readFileSync(filePath);
    const fileObj = {
      buffer: buffer,
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const uploadData = { model_name: 'finance' };
    const result = await uploadExceelFile(uploadData, fileObj);
    const finalResultURL = `${process.env.BUCKET_FOLDER_NAME}/finance/${result.url}`;

    // ---------- Send First Email (5 sheets) ----------
    const payload = {
      customer_id: '6862378dfcde66936ce86e66',
      email: process.env.FINANCE_EMAIL_ID,
      report_type: 'finance_report',
      attachment_filename: `order_finance_report(${this.formatDateString(startDate, endDate) || ''}).xlsx`,
      file_extension: 'xlsx',
      mime_type: 'application/xlsx',
      cc_emails:
        process.env.FINANCE_CC_EMAILS?.split(',').map((email) =>
          email.trim(),
        ) || [],
      email_path: finalResultURL,
      dateString: this.formatDateString(startDate, endDate),
    };
    await this.notificationMasterService.sendNotificationMessage({
      channel: 'report_email',
      notificationPayload: payload,
    });

    // ---------- Delete first local file after upload ----------
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`❌ Error deleting file: ${filePath}`, err);
    }

    // ---------- Create Second Workbook (Abandoned Cart only) ----------
    const abandonedCartWorkbook = new ExcelJS.Workbook();
    this.createWorksheet(
      abandonedCartWorkbook,
      'Abandoned Cart',
      abandonedCartData,
      startDate,
      endDate,
    );
    // ---------- Save Second Workbook ----------
    const abandonedCartFileName = `abandoned_cart_report_${Date.now()}.xlsx`;
    const abandonedCartFilePath = path.join(reportsDir, abandonedCartFileName);
    await abandonedCartWorkbook.xlsx.writeFile(abandonedCartFilePath);

    // ---------- Upload Second Workbook to S3 ----------
    const abandonedCartBuffer = fs.readFileSync(abandonedCartFilePath);
    const abandonedCartFileObj = {
      buffer: abandonedCartBuffer,
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    const abandonedCartUploadData = { model_name: 'finance' };
    const abandonedCartResult = await uploadExceelFile(
      abandonedCartUploadData,
      abandonedCartFileObj,
    );
    const abandonedCartFinalResultURL = `${process.env.BUCKET_FOLDER_NAME}/finance/${abandonedCartResult.url}`;

    // ---------- Send Second Email (Abandoned Cart) ----------
    const abandonedCartPayload = {
      customer_id: '6862378dfcde66936ce86e66',
      email: process.env.FINANCE_EMAIL_ID,
      report_type: 'abandoned_cart_report',
      attachment_filename: `abandoned_cart_report(${this.formatDateString(abandonedCartStartDateStr, abandonedCartEndDateStr) || ''}).xlsx`,
      file_extension: 'xlsx',
      mime_type: 'application/xlsx',
      cc_emails:
        process.env.ABANDONED_CART_CC_EMAILS?.split(',').map((email) =>
          email.trim(),
        ) || [],
      email_path: abandonedCartFinalResultURL,
      dateString: this.formatDateString(startDate, endDate),
    };
    await this.notificationMasterService.sendNotificationMessage({
      channel: 'report_email',
      notificationPayload: abandonedCartPayload,
    });

    // ---------- Delete second local file after upload ----------
    try {
      fs.unlinkSync(abandonedCartFilePath);
    } catch (err) {
      console.error(`❌ Error deleting file: ${abandonedCartFilePath}`, err);
    }

    return {
      statusCode: 200,
      status: true,
      financeData: financeData,
      financeCompleted: financeCompleted.data.data,
      cancelledData: financeDataCancelled,
      financeCancelledPartiallyCancelled:
        financeCancelledPartiallyCancelled.data.data,
    };
  }
}
