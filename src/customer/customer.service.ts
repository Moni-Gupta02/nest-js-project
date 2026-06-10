import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { CustomerDocument } from './schemas/customer.schema';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import * as moment from 'moment';
import { FindAllCustomersDto } from './dto/list-customer.dto';
import { HistoryService } from 'src/history/history.service';
@Injectable()
export class CustomerService {
  constructor(
    @InjectModel('Customers') private customerModel: Model<CustomerDocument>,
    private readonly historyService: HistoryService,
  ) { }
  create(createCustomerDto: CreateCustomerDto) {
    console.log('create customer dto', createCustomerDto);
    return 'This action adds a new customer';
  }

  private buildOrderFilters(no_of_items?: string[], category?: string) {
    const orExpressions = [];

    // Convert no_of_items to numbers and handle >50 case
    const itemsArray = no_of_items?.includes('>50')
      ? [50]
      : no_of_items?.map((item) => parseInt(item));

    const buildExpression = {
      add: (field1: string, field2: string) => ({
        $add: [`$${field1}`, `$${field2}`],
      }),
      sum: (fields: string[]) => ({ $sum: fields.map((f) => `$${f}`) }),
    };

    switch (category) {
      case 'subscription': {
        const totalExpr = buildExpression.add(
          'total_subscription_order',
          'shopify_total_orders',
        );

        if (no_of_items?.length) {
          if (no_of_items.includes('>50')) {
            orExpressions.push({
              $expr: { $gt: [totalExpr, 50] },
            });
          } else {
            orExpressions.push({
              $expr: {
                $in: [totalExpr, itemsArray],
              },
            });
          }
        } else {
          orExpressions.push({
            $expr: { $gt: [totalExpr, 0] },
          });
        }
        break;
      }

      case 'ndd': {
        const totalExpr = buildExpression.add(
          'total_ndd_order',
          'shopify_total_orders',
        );

        if (no_of_items?.length) {
          if (no_of_items.includes('>50')) {
            orExpressions.push({
              $expr: { $gt: [totalExpr, 50] },
            });
          } else {
            orExpressions.push({
              $expr: {
                $in: [totalExpr, itemsArray],
              },
            });
          }
        } else {
          orExpressions.push({
            $expr: { $gt: [totalExpr, 0] },
          });
        }
        break;
      }

      case 'all': {
        const totalExpr = buildExpression.sum([
          'total_ndd_order',
          'total_subscription_order',
          'shopify_total_orders',
        ]);

        if (no_of_items?.length) {
          if (no_of_items.includes('>50')) {
            orExpressions.push({
              $expr: {
                $and: [
                  {
                    $gt: [
                      buildExpression.sum([
                        'total_ndd_order',
                        'shopify_total_orders',
                      ]),
                      0,
                    ],
                  },
                  {
                    $gt: [
                      buildExpression.sum([
                        'total_subscription_order',
                        'shopify_total_orders',
                      ]),
                      0,
                    ],
                  },
                  { $gt: [totalExpr, 50] },
                ],
              },
            });
          } else {
            itemsArray.forEach((item) => {
              orExpressions.push({
                $expr: {
                  $and: [
                    {
                      $gt: [
                        buildExpression.sum([
                          'total_ndd_order',
                          'shopify_total_orders',
                        ]),
                        0,
                      ],
                    },
                    {
                      $gt: [
                        buildExpression.sum([
                          'total_subscription_order',
                          'shopify_total_orders',
                        ]),
                        0,
                      ],
                    },
                    { $eq: [totalExpr, item] },
                  ],
                },
              });
            });
          }
        } else {
          orExpressions.push({
            $expr: {
              $and: [
                {
                  $gt: [
                    buildExpression.sum([
                      'total_ndd_order',
                      'shopify_total_orders',
                    ]),
                    0,
                  ],
                },
                {
                  $gt: [
                    buildExpression.sum([
                      'total_subscription_order',
                      'shopify_total_orders',
                    ]),
                    0,
                  ],
                },
              ],
            },
          });
        }
        break;
      }

      case 'no':
      default: {
        const totalExpr = buildExpression.sum([
          'total_ndd_order',
          'total_subscription_order',
          'shopify_total_orders',
        ]);

        if (no_of_items?.length) {
          if (no_of_items.includes('>50')) {
            orExpressions.push({
              $expr: { $gt: [totalExpr, 50] },
            });
          } else {
            itemsArray.forEach((item) => {
              orExpressions.push({
                $expr: { $eq: [totalExpr, item] },
              });
            });
          }
        } else {
          orExpressions.push({
            $expr: { $gte: [totalExpr, 1] },
          });
        }
      }
    }

    return orExpressions;
  }
  // Add these interfaces at the top
  // Add these interfaces at the top

  // Add this utility function to the class
  private parseSortParams(params: FindAllCustomersDto) {
    const sortOptions = [];

    // Handle single sort parameter
    if (params.sort_by && params.sort_order) {
      sortOptions.push({
        field: params.sort_by,
        order: params.sort_order === 'asc' ? 'asc' : 'desc',
      });
    }

    // Add default sort by createdAt if no sort specified
    if (sortOptions.length === 0) {
      sortOptions.push({ field: 'createdAt', order: 'desc' });
    }

    return sortOptions;
  }

  async findAll(queryParams): Promise<any> {
    const {
      page = 1,
      limit = 10,
      global = '',
      category = 'no',
      no_of_items = [],
      meal_category,
    } = queryParams;
    // Get sort options
    const sortOptions = this.parseSortParams(queryParams);

    // Build sort object for mongoose
    const sortObject = sortOptions.reduce(
      (acc, sort) => ({
        ...acc,
        [sort.field]: sort.order === 'asc' ? 1 : -1,
      }),
      {},
    );

    // Ensure no_of_items is always an array
    const normalizedNoOfItems = Array.isArray(no_of_items)
      ? no_of_items
      : [no_of_items];

    // Build the query conditions
    const andConditions: any[] = [];

    // Add global search conditions if present
    if (global) {
      andConditions.push({
        $or: [
          { first_name: { $regex: global, $options: 'i' } },
          { last_name: { $regex: global, $options: 'i' } },
          { phone_number: { $regex: global, $options: 'i' } },
          { whatsapp_number: { $regex: global, $options: 'i' } },
          { email: { $regex: global, $options: 'i' } },
          {
            $and: [
              {
                first_name: {
                  $regex: global.split(' ')[0] || '',
                  $options: 'i',
                },
              },
              {
                last_name: {
                  $regex: global.split(' ')[1] || '',
                  $options: 'i',
                },
              },
            ],
          },
          {
            $and: [
              {
                first_name: {
                  $regex: global.split(' ')[1] || '',
                  $options: 'i',
                },
              },
              {
                last_name: {
                  $regex: global.split(' ')[0] || '',
                  $options: 'i',
                },
              },
            ],
          },
        ],
      });
    }

    // Add order filters
    const orderExpressions = this.buildOrderFilters(
      normalizedNoOfItems,
      category,
    );
    if (orderExpressions.length > 0) {
      andConditions.push({ $or: orderExpressions });
    }

    // Add category-specific base conditions
    if (category === 'subscription') {
      andConditions.push(
        { total_subscription_order: { $gt: 0 } },
        { total_ndd_order: 0 },
      );
    } else if (category === 'ndd') {
      andConditions.push(
        { total_ndd_order: { $gt: 0 } },
        { total_subscription_order: 0 },
      );
    } else if (category === 'all') {
      andConditions.push(
        { total_subscription_order: { $gt: 0 } },
        { total_ndd_order: { $gt: 0 } },
      );
    }

    // Add meal category filter if present
    if (meal_category) {
      andConditions.push({ meal_category: meal_category });
    }

    // Build the final query
    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    // Execute the query with pagination
    const [customers, totalCount] = await Promise.all([
      this.customerModel
        .find(query)
        .select(
          '_id email total_spent total_orders shopify_total_spent ' +
          'shopify_total_orders total_ndd_order total_subscription_order ' +
          'createdAt updatedAt country_code first_name last_name ' +
          'phone_number whatsapp_country_code whatsapp_number meal_category',
        )
        .sort(sortObject) // Apply dynamic sorting
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean()
        .exec(),
      this.customerModel.countDocuments(query),
    ]);

    // Enhance customer data with category
    const enhancedCustomers = customers.map((customer) => {
      let category = '';
      if (
        customer.total_ndd_order > 0 &&
        customer.total_subscription_order > 0
      ) {
        category = 'MP + NDD';
      } else if (
        customer.total_ndd_order === 0 &&
        customer.total_subscription_order > 0
      ) {
        category = 'MP';
      } else if (
        customer.total_ndd_order > 0 &&
        customer.total_subscription_order === 0
      ) {
        category = 'NDD';
      } else {
        category = 'No Orders';
      }
      return { ...customer, category };
    });

    return {
      list: enhancedCustomers,
      count: totalCount,
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit)),
    };
  }

  async findCustomerById(id: string) {
    try {
      const objectId = new mongoose.Types.ObjectId(id);

      const result = await this.customerModel
        .aggregate([
          {
            $match: { _id: objectId },
          },
          {
            $project: {
              first_name: 1,
              last_name: 1,
              total_spent: 1,
              total_orders: 1,
              reward_amount_wallet: 1,
              bag: 1,
              referredBy: 1,
              whatsapp_country_code: 1,
              whatsapp_number: 1,
              email: 1,
              country_code: 1,
              phone_number: 1,
              billing_address1: 1,
              internal_notes: 1,
              createdAt: 1,
            },
          },
          {
            $lookup: {
              from: 'customers',
              let: { referredById: '$referredBy.customer_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$_id', '$$referredById'] },
                  },
                },
                {
                  $project: {
                    first_name: 1,
                    last_name: 1,
                    email: 1,
                  },
                },
              ],
              as: 'referredBy.customer_details',
            },
          },
          {
            $lookup: {
              from: 'subscriptions',
              let: { customerId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$customer_id', '$$customerId'] },
                  },
                },
                {
                  $sort: { createdAt: -1 },
                },
                {
                  $limit: 1,
                },
                {
                  $project: {
                    _id: 1,
                    is_refundable: 1,
                    is_vegetarian: 1,
                    bag_info: 1,
                  },
                },
              ],
              as: 'latestSubscription',
            },
          },
          {
            $addFields: {
              latestSubscription: { $arrayElemAt: ['$latestSubscription', 0] },
            },
          },
          {
            $lookup: {
              from: 'subscriptions',
              let: { subscriptionId: '$latestSubscription._id' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$_id', '$$subscriptionId'] },
                  },
                },
                {
                  $set: { is_refundable: false },
                },
              ],
              as: 'updatedSubscription',
            },
          },
        ])
        .exec();

      if (!result?.length) {
        return null;
      }

      const customerData = result[0];

      // Format the response to match the original structure
      const response = {
        ...customerData,
        latestSubscriptionData: customerData.latestSubscription || null,
      };

      delete response.latestSubscription;
      delete response.updatedSubscription;

      return response;
    } catch (err) {
      console.error('Error in findCustomerById:', err);
      throw new Error('Failed to fetch customer details');
    }
  }
  async updateCustomer(
    customerId: string,
    updateCustomerDto: UpdateCustomerDto,
  ) {
    console.log({ updateCustomerDto });
    // Fetch existing customer data
    const customer = await this.customerModel.findById(customerId);
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Check if email, phone_number, or whatsapp_number already exist for other customers
    if (updateCustomerDto.email && updateCustomerDto.email !== customer.email) {
      const existingEmail = await this.customerModel.findOne({
        email: updateCustomerDto.email,
        _id: { $ne: customerId }, // Exclude current customer
      });
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
    }

    if (
      updateCustomerDto.phone_number &&
      updateCustomerDto.phone_number !== customer.phone_number
    ) {
      const existingPhone = await this.customerModel.findOne({
        phone_number: updateCustomerDto.phone_number,
        _id: { $ne: customerId }, // Exclude current customer
      });
      if (existingPhone) {
        throw new ConflictException('Phone number already exists');
      }
    }

    // if (
    //   updateCustomerDto.whatsapp_number &&
    //   updateCustomerDto.whatsapp_number !== customer.whatsapp_number
    // ) {
    //   const existingWhatsapp = await this.customerModel.findOne({
    //     whatsapp_number: updateCustomerDto.whatsapp_number,
    //     _id: { $ne: customerId }, // Exclude current customer
    //   });
    //   if (existingWhatsapp) {
    //     throw new ConflictException('WhatsApp number already exists');
    //   }
    // }

    // Prepare update payload
    const updatePayload: any = { ...updateCustomerDto };

    // Handle internal notes
    if (updateCustomerDto.internal_notes) {
      const newNote = {
        note: updateCustomerDto.internal_notes,
        createdAt: moment().utc().format(),
      };
      updatePayload.internal_notes = [
        newNote,
        ...(customer.internal_notes || []),
      ];
    }
    console.log({ updatePayload });

    // Update customer record with only the fields provided in the request
    const updatedCustomer = await this.customerModel.findByIdAndUpdate(
      customerId,
      { $set: updatePayload },
      { new: false, runValidators: true },
    );

    // Create copies for history comparison
    if (!updateCustomerDto?.internal_notes) {
      const customerForHistory = updatedCustomer
        ? { ...updatedCustomer.toObject() }
        : {};
      const payloadForHistory = { ...updatePayload };

      // Remove 'internal_notes' key specifically
      delete customerForHistory['internal_notes'];
      delete payloadForHistory['internal_notes'];

      const { before_changes, current_changes } =
        await this.historyService.getChangedFields(
          customerForHistory,
          payloadForHistory,
        );

      return { before_changes, current_changes };
    }
    return;
  }
}
