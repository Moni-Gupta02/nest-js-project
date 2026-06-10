import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { parseDashboardQuery } from './helpers/date-range';
import { computeAutoSelectionCount } from './logic/auto-selection.logic';
import { computeCancellationDetails } from './logic/cancellations.logic';
import { computeTotalConversion } from './logic/conversion.logic';
import { computeFlexiPlanSales } from './logic/flexi-plan-sales.logic';
import { computeNewOrderSales } from './logic/new-orders-sales.logic';
import {
  computeDailySalesBarGraph,
  computeOrderDetailsForChart,
  resolveOrderChartParams,
} from './logic/order-charts.logic';
import { computeOverallSales } from './logic/overall-sales.logic';
import { computeReferralSales } from './logic/referral-sales.logic';
import { computeTotalRewards } from './logic/rewards.logic';
import { computeSmartPlanSales } from './logic/smart-plan-sales.logic';
import { computeOrderDeviceAnalytics } from './logic/order-device-analytics.logic';
import { computeUpsellingAnalysis } from './logic/upselling.logic';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel('Order') private readonly orderModel: Model<any>,
    @InjectModel('Delivery') private readonly deliveryModel: Model<any>,
    @InjectModel('Cart') private readonly cartModel: Model<any>,
    @InjectModel('Customer') private readonly customerModel: Model<any>,
    @InjectModel('Rewards') private readonly rewardModel: Model<any>,
    @InjectModel('subscription_prices')
    private readonly subscriptionPricesModel: Model<any>,
    @InjectModel('subscription_fix_prices')
    private readonly subscriptionFixPricesModel: Model<any>,
  ) { }

  async getOverall(startDate: string, endDate: string) {
    const range = parseDashboardQuery(startDate, endDate);

    const [
      overallResult,
      referral,
      newOrders,
      flexiSales,
      smartSales,
      upselling,
      totalConversion,
      totalRewardData,
    ] = await Promise.all([
      computeOverallSales(this.orderModel, range),
      computeReferralSales(this.orderModel, range),
      computeNewOrderSales(this.orderModel, range),
      computeFlexiPlanSales(this.orderModel, range),
      computeSmartPlanSales(this.orderModel, range),
      computeUpsellingAnalysis(
        this.orderModel,
        this.subscriptionPricesModel,
        this.subscriptionFixPricesModel,
        range,
      ),
      computeTotalConversion(
        this.customerModel,
        this.orderModel,
        this.cartModel,
        range,
      ),
      computeTotalRewards(this.orderModel, this.rewardModel, range),
    ]);

    return {
      status: true,
      message: 'success',
      data: overallResult.data,
      couponData: overallResult.couponData,
      goalData: overallResult.goalData,
      referralSales: {
        referral: referral.referralSales,
        referral_count: referral.referralCount,
      },
      newOrderSales: {
        new_order_sales: newOrders.totalNewSales,
        new_order_count: newOrders.newOrderCount,
      },
      flexiSales,
      smartSales,
      upselling,
      totalConversion,
      totalRewardData,
    };
  }

  async getAutoSelection(startDate: string, endDate: string) {
    const range = parseDashboardQuery(startDate, endDate);
    const result = await computeAutoSelectionCount(this.deliveryModel, range);
    return {
      status: true,
      message: 'success',
      ...result,
    };
  }

  async getCancellations(startDate: string, endDate: string) {
    const range = parseDashboardQuery(startDate, endDate);
    const cancellationDetail = await computeCancellationDetails(
      this.orderModel,
      range,
    );
    return {
      status: true,
      message: 'success',
      cancellationDetail,
    };
  }

  async getOrderCharts(
    startDate: string,
    endDate: string,
    type?: string,
    diff?: string,
  ) {
    const range = parseDashboardQuery(startDate, endDate);
    const chartParams = resolveOrderChartParams(startDate, endDate, type, diff);

    const [dailySales, lineChart] = await Promise.all([
      computeDailySalesBarGraph(this.orderModel, range),
      computeOrderDetailsForChart(
        this.orderModel,
        chartParams.type,
        startDate,
        endDate,
        chartParams.diff,
      ),
    ]);

    return {
      status: true,
      message: 'success',
      dailySales: { data: dailySales },
      lineChart,
    };
  }

  async getOrderDeviceAnalytics(startDate: string, endDate: string) {
    const range = parseDashboardQuery(startDate, endDate);
    const analytics = await computeOrderDeviceAnalytics(this.orderModel, range);

    return {
      status: true,
      message: 'success',
      ...analytics,
    };
  }
}
