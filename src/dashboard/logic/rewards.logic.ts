import type { Model } from 'mongoose';
import type { DashboardDateRange } from '../helpers/date-range';

export async function computeTotalRewards(
  orderModel: Model<any>,
  rewardModel: Model<any>,
  range: DashboardDateRange,
) {
  const Order = orderModel;
  const Reward = rewardModel;
  const { start, end } = range;

  await Reward.find({
    redeem_points: { $gt: 100000 },
    is_credit: true,
  });

  const rewardData = await Order.find(
    {
      createdAt: { $gte: start, $lte: end },
      order_status: 'Completed',
      financial_status: 'Paid',
    },
    { reward_id: 1, referral_discount: 1, redeem_id: 1 },
  )
    .populate('reward_id')
    .populate('redeem_id');

  const finalData = {
    points_redeemed: 0,
    amount_redeemed: 0,
    points_earned: 0,
    amount_earned: 0,
    referral_discount: 0,
  };

  rewardData?.forEach((itm: any) => {
    if (itm?.referral_discount != null && itm?.referral_discount > 0) {
      finalData.referral_discount += parseFloat(itm.referral_discount);
    }
    if (itm?.reward_id != null && itm?.reward_id?.status === 'completed') {
      if (Boolean(itm?.reward_id?.is_credit) === true) {
        finalData.points_earned += parseFloat(itm.reward_id.points_earned);
        finalData.amount_earned += parseFloat(itm.reward_id.earned_amount_wallet);
      }
    }
    if (itm?.redeem_id != null && itm?.redeem_id?.status === 'completed') {
      if (Boolean(itm?.redeem_id?.is_credit) === false) {
        finalData.points_redeemed += parseFloat(itm.redeem_id.redeem_points);
        finalData.amount_redeemed += parseFloat(itm.redeem_id.redeem_amount_wallet);
      }
    }
  });

  return finalData;
}
