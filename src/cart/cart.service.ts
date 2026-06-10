import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart } from './Schemas/cart.schema';
import * as moment from 'moment';
import * as ExcelJS from 'exceljs';
import { OrderDocument } from 'src/order/schemas/order.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel('Cart') private readonly cartModel: Model<Cart>,
    @InjectModel('Orders') private readonly orderModel: Model<OrderDocument>,
  ) {}

  async getCartDetailById(cartId: string) {
    if (!Types.ObjectId.isValid(cartId)) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    const pipeline: any[] = [
      { $match: { _id: new Types.ObjectId(cartId) } },
      {
        $lookup: {
          from: 'coupons',
          localField: 'coupon_id',
          foreignField: '_id',
          as: 'coupon_id',
        },
      },
      {
        $unwind: {
          path: '$coupon_id',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          customer_id_new: {
            $cond: {
              if: { $eq: [{ $type: '$customer_id' }, 'string'] },
              then: {
                $convert: {
                  input: '$customer_id',
                  to: 'objectId',
                  onError: '$customer_id',
                  onNull: '$customer_id',
                },
              },
              else: '$customer_id',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer_id_new',
          foreignField: '_id',
          as: 'customerDetails',
        },
      },
      {
        $unwind: {
          path: '$customerDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          cart_item: {
            $cond: {
              if: { $eq: [{ $type: '$cart_item' }, 'array'] },
              then: {
                $map: {
                  input: '$cart_item',
                  as: 'item',
                  in: {
                    $mergeObjects: [
                      '$$item',
                      {
                        protein_category: {
                          $cond: {
                            if: {
                              $eq: [
                                { $type: '$$item.protein_category' },
                                'string',
                              ],
                            },
                            then: '$$item.protein_category',
                            else: {
                              $reduce: {
                                input: {
                                  $ifNull: ['$$item.protein_category', []],
                                },
                                initialValue: '',
                                in: {
                                  $cond: [
                                    { $eq: ['$$value', ''] },
                                    '$$this',
                                    {
                                      $concat: ['$$value', ', ', '$$this'],
                                    },
                                  ],
                                },
                              },
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
              else: '$cart_item',
            },
          },
        },
      },
    ];

    const [cart] = await this.cartModel.aggregate(pipeline);

    if (!cart) {
      throw new NotFoundException(`Cart with ID ${cartId} not found`);
    }

    return cart;
  }

  async getAbandonedCartList(
    startDate: string,
    endDate: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    customerType?: string,
    type: string = 'list',
  ) {
    const skip = (page - 1) * limit;
    const remainingLimit = limit;

    const customerTypeArray = customerType
      ? customerType.split(',').map((type) => type.trim())
      : [];

    const responseCart = await this.abandonedCustomerCartsData(
      startDate,
      endDate,
      search,
      customerTypeArray,
      skip,
      limit,
      type,
    );

    if (type == 'list') {
      return {
        status: 'success',
        list: responseCart.carts,
        count: responseCart.count || 0,
        totalFinalSum: responseCart.totalFinalSum || 0,
        currentPage: +page,
        totalPages: Math.ceil(responseCart.count / Number(limit)) || 0,
      };
    } else if (type == 'csv') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Abandoned Cart Report');

      const headers = [
        'Date / Time',
        'Customer Name',
        'Customer Type',
        'Value',
        'Phone',
      ];
      worksheet.addRow(headers);

      console.log('response cart', responseCart);

      responseCart?.carts?.map((itm) => {
        const dataTemp = [
          moment(itm?.createdAt).format('DD/MM/YY HH:MM a'),
          itm?.name,
          itm?.customer_type,
          itm?.final_total,
          itm?.phone,
        ];

        worksheet.addRow(dataTemp);
      });

      // Generate a buffer
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    }

    console.log('response cart', responseCart);
  }

  private abandonedCustomerCartsData = async (
    startDate,
    endDate,
    search,
    customerTypeArray,
    skip,
    limit,
    type,
  ) => {
    const pipeline: any = [
      {
        $match: {
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
          valid_cart: true,
        },
      },
      {
        $addFields: {
          customer_id_new: {
            $cond: {
              if: { $eq: [{ $type: '$customer_id' }, 'string'] },
              then: {
                $convert: {
                  input: '$customer_id',
                  to: 'objectId',
                  onError: '$customer_id',
                  onNull: '$customer_id',
                },
              },
              else: '$customer_id',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer_id_new',
          foreignField: '_id',
          as: 'customerDetails',
        },
      },
      {
        $unwind: {
          path: '$customerDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'orders',
          localField: 'customer_id_new',
          foreignField: 'customer_id',
          as: 'orderDetails',
          pipeline: [
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $group: {
                _id: null,
                data: {
                  $first: {
                    order_status: 1,
                    type_of_order: 1,
                  },
                },
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: '$orderDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: search
          ? {
              $or: [
                {
                  $expr: {
                    $regexMatch: {
                      input: {
                        $concat: [
                          '$customerDetails.first_name',
                          ' ',
                          '$customerDetails.last_name',
                        ],
                      },
                      regex: search.trim(),
                      options: 'i',
                    },
                  },
                },
                {
                  $expr: {
                    $regexMatch: {
                      input: '$customerDetails.email',
                      regex: search.trim(),
                      options: 'i',
                    },
                  },
                },
                {
                  $expr: {
                    $regexMatch: {
                      input: '$customerDetails.phone_number',
                      regex: search.trim(),
                      options: 'i',
                    },
                  },
                },
                {
                  $expr: {
                    $regexMatch: {
                      input: '$customerDetails.whatsapp_number',
                      regex: search.trim(),
                      options: 'i',
                    },
                  },
                },
              ],
            }
          : {},
      },
      {
        $addFields: {
          customer_type: {
            $cond: {
              if: { $eq: [{ $type: '$customer_id_new' }, 'objectId'] },
              then: {
                $cond: {
                  if: { $eq: ['$cart_status', 'profile_not_verified'] },
                  then: {
                    $cond: {
                      if: {
                        $eq: [
                          '$customerDetails.user_register_flag',
                          'profile_not_verified',
                        ],
                      },
                      then: 'Otp verified',
                      else: {
                        $cond: {
                          if: {
                            $eq: [
                              '$customerDetails.user_register_flag',
                              'user_not_verified',
                            ],
                          },
                          then: 'Otp not verified',
                          else: '',
                        },
                      },
                    },
                  },
                  else: {
                    $cond: {
                      if: {
                        $or: [
                          { $eq: ['$cart_status', 'details_not_verified'] },
                          { $eq: ['$cart_status', 'completed'] },
                        ],
                      },
                      then: {
                        $concat: [
                          { $toString: '$customerDetails.total_orders' },
                          ' Orders',
                        ],
                      },
                      else: {
                        $cond: {
                          if: { $eq: ['$cart_status', null] },
                          then: '',
                          else: '',
                        },
                      },
                    },
                  },
                },
              },
              else: 'Guest',
            },
          },
          no_of_orders: {
            $cond: {
              if: {
                $or: [
                  { $eq: ['$cart_status', 'details_not_verified'] },
                  { $eq: ['$cart_status', 'completed'] },
                ],
              },
              then: '$customerDetails.total_orders',
              else: -1,
            },
          },
        },
      },
      {
        $match: customerTypeArray.length
          ? {
              $or: [
                ...customerTypeArray
                  .filter((type) => type !== '>5') // Exclude ">5" from regex conditions
                  .map((type) => ({
                    customer_type: { $regex: type, $options: 'i' }, // Case-insensitive substring match
                  })),

                ...(customerTypeArray.includes('>5')
                  ? [{ no_of_orders: { $gt: 5 } }]
                  : []),
              ],
            }
          : {},
      },
      {
        $facet: {
          carts: [
            {
              $project: {
                _id: 0,
                name: {
                  $concat: [
                    '$customerDetails.first_name',
                    ' ',
                    '$customerDetails.last_name',
                  ],
                },
                phone: {
                  $concat: [
                    '$customerDetails.country_code',
                    ' ',
                    '$customerDetails.phone_number',
                  ],
                },
                // whatsapp: {
                //   $concat: [
                //     '$customerDetails.whatsapp_country_code',
                //     ' ',
                //     '$customerDetails.whatsapp_number',
                //   ],
                // },
                // email: '$customerDetails.email',
                customer_type: 1,
                // no_of_orders: 1,
                final_total: 1,
                cart_type: 1,
                createdAt: 1,
              },
            },
            ...(type === 'list' ? [{ $skip: +skip }, { $limit: +limit }] : []),
          ],
          totalFinalSum: [
            {
              $group: {
                _id: null,
                totalFinal: { $sum: '$final_total' },
              },
            },
          ],
          count: [
            {
              $count: 'totalCount',
            },
          ],
        },
      },
      {
        $project: {
          carts: 1,
          totalFinalSum: { $arrayElemAt: ['$totalFinalSum.totalFinal', 0] },
          count: { $arrayElemAt: ['$count.totalCount', 0] },
        },
      },
    ];

    const abandonedCustomerCarts = await this.cartModel.aggregate(pipeline);

    return abandonedCustomerCarts?.[0];
  };
}
