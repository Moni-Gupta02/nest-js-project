import type { Model } from 'mongoose';
import type { DashboardDateRange } from '../helpers/date-range';

export async function computeTotalConversion(
  customerModel: Model<any>,
  orderModel: Model<any>,
  cartModel: Model<any>,
  range: DashboardDateRange,
) {
  const Customer = customerModel;
  const Order = orderModel;
  const Cart = cartModel;
  const { start, end } = range;
  const dateFilter = { createdAt: { $gte: start, $lte: end } };

  const [
    customerLogin,
    orderPlaced,
    failedOrders,
    abandonedGuestCarts,
    abandonedCustomerCarts,
  ] = await Promise.all([
    Customer.countDocuments(dateFilter),
    Order.countDocuments({
      ...dateFilter,
      financial_status: 'Paid',
      order_status: 'Completed',
    }),
    Order.countDocuments({
      ...dateFilter,
      financial_status: undefined,
      order_status: 'Failed',
    }),
    Cart.countDocuments({ ...dateFilter, customer_type: 'guest' }),
    Cart.countDocuments({ ...dateFilter, customer_type: 'customer' }),
  ]);

  return {
    total_login: customerLogin || 0,
    total_order_placed: orderPlaced || 0,
    failed_orders: failedOrders || 0,
    abd_guest_carts: abandonedGuestCarts || 0,
    abd_customer_carts: abandonedCustomerCarts || 0,
  };
}
