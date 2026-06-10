import type { Model } from 'mongoose';
import type { DashboardDateRange } from '../helpers/date-range';

function subtractDeposit(finalTotal: number, refundableDeposite?: number | string | null): number {
  let total = finalTotal;
  if (refundableDeposite) {
    total -= parseFloat(String(refundableDeposite));
  }
  return total;
}

export async function computeOverallSales(
  orderModel: Model<any>,
  range: DashboardDateRange,
) {
  const Order = orderModel;
  const { start, end } = range;
  const paidCompleted = {
    createdAt: { $gte: start, $lte: end },
    order_status: 'Completed',
    financial_status: 'Paid',
  };

  const [
    overallSales,
    dietTypeSales,
    renewalSales,
    mpSales,
    salesByDays,
    nddSales,
    nddRenewalSales,
    refundableDeposite,
    couponSubsData,
    couponNDDData,
  ] = await Promise.all([
    Order.find(paidCompleted, {
      final_order_total: 1,
      _id: 0,
      refundable_deposite: 1,
      type_of_order: 1,
      customer_goal: 1,
    }),
    Order.find(
      { ...paidCompleted, plan: 'normal' },
      {
        final_order_total: 1,
        _id: 0,
        refundable_deposite: 1,
        'order_item.selected_meal_type.protein_category': 1,
        type_of_order: 1,
      },
    ),
    Order.find(
      { ...paidCompleted, type_of_order: 're-new' },
      { final_order_total: 1, _id: 0, refundable_deposite: 1 },
    ),
    Order.find(
      {
        ...paidCompleted,
        order_type: 'subscription',
        plan: 'normal',
      },
      { final_order_total: 1, _id: 0, refundable_deposite: 1, type_of_order: 1 },
    ),
    Order.find(
      {
        ...paidCompleted,
        order_type: 'subscription',
        plan: 'normal',
      },
      {
        final_order_total: 1,
        _id: 0,
        refundable_deposite: 1,
        'order_item.plan_duration_in_days': 1,
      },
    ),
    Order.find(
      { ...paidCompleted, order_type: 'NDD' },
      { final_order_total: 1, _id: 0, refundable_deposite: 1 },
    ),
    Order.find(
      {
        ...paidCompleted,
        order_type: 'NDD',
        type_of_order: 're-new',
      },
      { final_order_total: 1, _id: 0, refundable_deposite: 1 },
    ),
    Order.find(
      {
        ...paidCompleted,
        order_type: 'subscription',
        plan: 'normal',
        refundable_deposite: { $exists: true },
      },
      { _id: 0, refundable_deposite: 1 },
    ),
    Order.find(
      {
        createdAt: { $gte: start, $lte: end },
        coupon_id: { $ne: null },
        order_type: 'subscription',
        order_status: 'Completed',
        financial_status: 'Paid',
      },
      {
        _id: 1,
        order_total: 1,
        discount: 1,
        order_item: 1,
        type_of_order: 1,
        final_order_total: 1,
        is_flex_plan: 1,
      },
    )
      .sort({ final_order_total: -1 })
      .populate('coupon_id'),
    Order.find(
      {
        createdAt: { $gte: start, $lte: end },
        coupon_id: { $ne: null },
        order_type: 'NDD',
        order_status: 'Completed',
        financial_status: 'Paid',
      },
      { _id: 1, order_total: 1, discount: 1 },
    ).populate('coupon_id'),
  ]);

  const couponData: { mp: any[]; ndd: any[] } = { mp: [], ndd: [] };
  const goalData: Record<string, number> = {};
  const Sales: Record<string, any> = {
    overall: 0,
    overall_count: 0,
    overall_renewal: 0,
    overall_renewal_count: 0,
    mp: 0,
    mp_count: 0,
    mp_new: 0,
    mp_new_count: 0,
    mp_trial: 0,
    mp_trial_count: 0,
    mp_monthly: 0,
    mp_monthly_Count: 0,
    mp_renewal: 0,
    mp_renewal_count: 0,
    ndd: 0,
    ndd_count: 0,
    ndd_renewal: 0,
    ndd_renewal_count: 0,
    mp_refundable_deposite: 0,
    referral: 0,
    referral_count: 0,
    balance_sales: 0,
    balance_sales_new: 0,
    balance_sales_re_new: 0,
    low_sales: 0,
    low_sales_new: 0,
    low_sales_re_new: 0,
    high_sales: 0,
    high_sales_new: 0,
    high_sales_re_new: 0,
    pcos_sales: 0,
    pcos_sales_new: 0,
    pcos_sales_re_new: 0,
    diabetes_sales: 0,
    diabetes_sales_new: 0,
    diabetes_sales_re_new: 0,
    balance_count: 0,
    balance_count_new: 0,
    balance_count_re_new: 0,
    low_count: 0,
    low_count_new: 0,
    low_count_re_new: 0,
    high_count: 0,
    high_count_new: 0,
    high_count_re_new: 0,
    pcos_count: 0,
    pcos_count_new: 0,
    pcos_count_re_new: 0,
    diabetes_count: 0,
    diabetes_count_new: 0,
    diabetes_count_re_new: 0,
    sales_value: [] as { days: number; value: number; count: number }[],
  };

  couponSubsData?.forEach((itm: any) => {
    const index = couponData.mp.findIndex(
      (val: any) => val?.name === itm?.coupon_id?.coupon_code,
    );
    const isFlexiPlan = itm?.is_flex_plan === true;
    let dietTypes: string[] = [];

    if (isFlexiPlan) {
      itm?.order_item?.forEach((orderItem: any) => {
        orderItem?.selected_meal_type?.forEach((mealType: any) => {
          const proteinCategory = mealType?.protein_category || 'balance';
          if (!dietTypes.includes(proteinCategory)) {
            dietTypes.push(proteinCategory);
          }
        });
      });
      if (dietTypes.length === 0) {
        dietTypes = ['balance'];
      }
    } else {
      const dietType =
        itm?.order_item?.[0]?.selected_meal_type?.[0]?.protein_category || 'balance';
      dietTypes = [dietType];
    }

    const planDays = Number(itm?.order_item?.[0]?.plan_duration_in_days);
    const typeOfOrder = itm?.type_of_order;

    const findEligibility = itm?.coupon_id?.eligibility?.filter((eliItm: any) => {
      const typeMatches =
        eliItm?.type_of_order === 'all' || eliItm?.type_of_order === typeOfOrder;
      const orderTypeMatches =
        eliItm?.order_type?.filter(
          (orderTypeItm: any) => Number(orderTypeItm) === planDays,
        )?.length > 0;
      const dietTypeMatches = isFlexiPlan
        ? dietTypes.some((dietType) => eliItm?.diet_type?.includes(dietType))
        : eliItm?.diet_type?.filter((dietItm: any) => dietItm === dietTypes[0])?.length > 0;
      const discountTypeMatches = eliItm?.discount_type === 'free_days';
      return typeMatches && orderTypeMatches && dietTypeMatches && discountTypeMatches;
    });

    let discountValue = Number(itm?.discount) || 0;
    let finalOrderTotal = Number(itm?.final_order_total) || 0;
    if (findEligibility?.[0]?.discount_type === 'free_days') {
      const perDayPrice =
        (itm?.order_total || 1) / (itm?.order_item?.[0]?.plan_duration_in_days || 1);
      discountValue = Number(perDayPrice * findEligibility?.[0]?.discount_value || 0);
    }

    if (index === -1) {
      couponData.mp.push({
        name: itm?.coupon_id?.coupon_code,
        count: 1,
        discount_value: discountValue,
        final_order_total: finalOrderTotal,
      });
    } else {
      couponData.mp[index].count += 1;
      couponData.mp[index].discount_value += discountValue;
      couponData.mp[index].final_order_total += finalOrderTotal;
    }
  });

  couponNDDData?.forEach((itm: any) => {
    const index = couponData.ndd.findIndex(
      (val: any) => val?.name === itm?.coupon_id?.coupon_code,
    );
    if (index === -1) {
      couponData.ndd.push({
        name: itm?.coupon_id?.coupon_code,
        count: 1,
        discount_value: Number(itm?.discount || 0),
      });
    } else {
      couponData.ndd[index].count += 1;
      couponData.ndd[index].discount_value += Number(itm?.discount || 0);
    }
  });

  overallSales?.forEach((itm: any) => {
    const finalTotal = subtractDeposit(
      parseFloat(itm?.final_order_total),
      itm?.refundable_deposite,
    );
    const goalKey = itm?.customer_goal || 'No Goal';
    goalData[goalKey] = (goalData[goalKey] || 0) + 1;
    Sales.overall += finalTotal;
    Sales.overall_count += 1;
  });

  dietTypeSales?.forEach((itm: any) => {
    const finalTotal = subtractDeposit(
      parseFloat(itm?.final_order_total),
      itm?.refundable_deposite,
    );
    const category =
      itm?.order_item?.[0]?.selected_meal_type?.[0]?.protein_category || 'balance';

    if (itm?.type_of_order === 'new') {
      Sales[`${category}_sales_new`] += finalTotal;
      Sales[`${category}_sales`] += finalTotal;
      Sales[`${category}_count_new`] += 1;
      Sales[`${category}_count`] += 1;
    } else if (itm?.type_of_order === 're-new') {
      Sales[`${category}_sales_re_new`] += finalTotal;
      Sales[`${category}_sales`] += finalTotal;
      Sales[`${category}_count_re_new`] += 1;
      Sales[`${category}_count`] += 1;
    }
  });

  mpSales?.forEach((itm: any) => {
    const finalTotal = subtractDeposit(
      parseFloat(itm?.final_order_total),
      itm?.refundable_deposite,
    );
    Sales.mp += finalTotal;
    Sales.mp_count += 1;
    if (itm?.type_of_order === 'new') {
      Sales.mp_new += finalTotal;
      Sales.mp_new_count += 1;
    } else if (itm?.type_of_order === 're-new') {
      Sales.mp_renewal += finalTotal;
      Sales.mp_renewal_count += 1;
    }
  });

  salesByDays?.forEach((itm: any) => {
    const finalTotal = subtractDeposit(
      parseFloat(itm?.final_order_total),
      itm?.refundable_deposite,
    );
    const days = Number(itm?.order_item?.[0]?.plan_duration_in_days);
    const salesIndex = Sales.sales_value.findIndex(
      (salesData: any) => salesData?.days === days,
    );
    if (salesIndex === -1) {
      Sales.sales_value.push({ days, value: finalTotal, count: 1 });
    } else {
      Sales.sales_value[salesIndex].value += finalTotal;
      Sales.sales_value[salesIndex].count += 1;
    }
  });

  Sales.sales_value.sort((a: any, b: any) => (a?.days ?? 0) - (b?.days ?? 0));

  nddSales?.forEach((itm: any) => {
    const finalTotal = subtractDeposit(
      parseFloat(itm?.final_order_total),
      itm?.refundable_deposite,
    );
    Sales.ndd += finalTotal;
    Sales.ndd_count += 1;
  });

  renewalSales?.forEach((itm: any) => {
    const finalTotal = subtractDeposit(
      parseFloat(itm?.final_order_total),
      itm?.refundable_deposite,
    );
    Sales.overall_renewal += finalTotal;
    Sales.overall_renewal_count += 1;
  });

  nddRenewalSales?.forEach((itm: any) => {
    const finalTotal = subtractDeposit(
      parseFloat(itm?.final_order_total),
      itm?.refundable_deposite,
    );
    Sales.ndd_renewal += finalTotal;
    Sales.ndd_renewal_count += 1;
  });

  refundableDeposite?.forEach((itm: any) => {
    Sales.mp_refundable_deposite += parseFloat(itm?.refundable_deposite);
  });

  couponData.mp = couponData.mp.sort(
    (a: any, b: any) => (b.final_order_total || 0) - (a.final_order_total || 0),
  );

  const goalDataArray = Object.keys(goalData).map((key) => ({
    goal: key,
    count: goalData[key],
  }));

  return {
    data: Sales,
    couponData,
    goalData: goalDataArray,
  };
}
