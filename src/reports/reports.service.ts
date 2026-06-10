import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as moment from 'moment-timezone';
import mongoose, { Model } from 'mongoose';
import * as path from 'path';
import { DumpRecipesDocument } from 'src/common/schema/dump_recipes';
import { SurveyDocument } from 'src/common/schema/survey';
import { SurveyResponseDataDocument } from 'src/common/schema/survey_response';
import { uploadExceelFile } from 'src/common/utils/awsServices';
import { handleUnexpectedError, setRounded } from 'src/common/utils/utils';
import { ComponentDocument } from 'src/component/Schemas/component.schema';
import { CouponDocument } from 'src/coupon-engine/schemas/coupon-engine.schema';
import { CustomerDocument } from 'src/customer/schemas/customer.schema';
import { DeliveryDocument } from 'src/delivery/schemas/delivery.schema';
import { IngredientDocument } from 'src/ingredient/schemas/ingredient.schema';
import { KitchenAppService } from 'src/kitchen-app/kitchen-app.service';
import { NotificationMasterService } from 'src/notification_master/notification_master.service';
import { OrderDocument } from 'src/order/schemas/order.schema';
import { RecipeRatingDocument } from 'src/recipe-rating/schemas/recipe-rating.schema';
import { SupplierDocument } from 'src/supplier/schemas/supplier.schemas';
import {
  ArabyAdsCSVDto,
  ArabyAdsDto,
  DishRatingDto,
  DishReportDto,
  IngredientWeeklyReportDto
} from './dto/reports.dto';

/** Coerce `selected_meal.price` to an array for `$filter` (some documents store a single object). */
const SELECTED_MEAL_PRICE_AS_ARRAY = {
  $cond: {
    if: { $isArray: '$delivery_item.selected_meal.price' },
    then: '$delivery_item.selected_meal.price',
    else: {
      $cond: {
        if: { $eq: [{ $type: '$delivery_item.selected_meal.price' }, 'object'] },
        then: ['$delivery_item.selected_meal.price'],
        else: [],
      },
    },
  },
};

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel('Rating')
    private readonly recipeRatingModel: Model<RecipeRatingDocument>,
    @InjectModel('Deliveries')
    private readonly deliveryModel: Model<DeliveryDocument>,
    @InjectModel('Component')
    private readonly componentModel: Model<ComponentDocument>,
    @InjectModel('Ingredient')
    private readonly ingredientModel: Model<IngredientDocument>,
    @InjectModel('Dump_Recipes')
    private readonly dumpRecipesModel: Model<DumpRecipesDocument>,
    @InjectModel('Supplier')
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel('Survey_responses')
    private readonly SurveyResponsesModel: Model<SurveyResponseDataDocument>,
    @InjectModel('Survey')
    private readonly SurveysModel: Model<SurveyDocument>,
    @InjectModel('Customers')
    private readonly CustomersModel: Model<CustomerDocument>,
    @InjectModel('Coupons')
    private readonly CouponModel: Model<CouponDocument>,
    @InjectModel('Orders')
    private readonly OrderModel: Model<OrderDocument>,

    private readonly kitchenAppService: KitchenAppService,
    private readonly notificationMasterService: NotificationMasterService,
  ) {}
  async dishRating(dishRatingDto: DishRatingDto): Promise<any> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Rating Report');
    worksheet.getColumn(1).width = 50;
    worksheet.getColumn(2).width = 25;
    worksheet.getColumn(3).width = 25;
    worksheet.addRow(['Delivery Date']);
    worksheet.addRow([
      dishRatingDto?.start_date + ' to ' + dishRatingDto?.end_date,
    ]);

    const startDate = moment(dishRatingDto?.start_date).startOf('day').toDate();
    const endDate = moment(dishRatingDto?.end_date).endOf('day').toDate();
    worksheet.addRow('');
    const headerRow = worksheet.addRow([
      'Labels',
      'Avg Rating',
      '# of Customers',
    ]);

    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFAEE0E5' }, // Yellow background color
      };
      cell.font = {
        bold: true, // Make text bold
      };
    });
    const ratingData = await this.recipeRatingModel.aggregate([
      {
        $match: {
          delivery_date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $lookup: {
          from: 'recipes_details',
          localField: 'recipe_id',
          foreignField: '_id',
          as: 'recipeData',
        },
      },
      {
        $unwind: {
          path: '$recipeData',
        },
      },
      {
        $group: {
          _id: '$recipeData._id',
          recipe_name: {
            $first: '$recipeData.dish_name',
          },
          meal_category: {
            $first: '$recipeData.meal_category',
          },
          avg_rating: {
            $avg: '$rating',
          },
          no_of_customers: {
            $push: '$customer_id',
          },
        },
      },
      {
        $group: {
          _id: '$meal_category',
          data: {
            $push: {
              recipe_name: '$recipe_name',
              meal_category: '$meal_category',
              avg_rating: {
                $round: ['$avg_rating', 2],
              },
              no_of_customer: {
                $size: '$no_of_customers',
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          meal_category: '$_id',
          total_customer: {
            $sum: {
              $map: {
                input: '$data',
                as: 'item',
                in: '$$item.no_of_customer',
              },
            },
          },
          avg_rating: {
            $round: [
              {
                $avg: {
                  $map: {
                    input: '$data',
                    as: 'item',
                    in: '$$item.avg_rating',
                  },
                },
              },
              2,
            ],
          },
          data: 1,
        },
      },
    ]);
    ratingData?.map((mealItm) => {
      worksheet.addRow('');
      const mealHeader = worksheet.addRow([
        mealItm?.meal_category,
        mealItm?.avg_rating,
        mealItm?.total_customer,
      ]);
      mealHeader.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFAEE0E5' }, // Yellow background color
        };
        cell.font = {
          bold: true, // Make text bold
        };
      });
      mealItm?.data?.map((dataItm) => {
        worksheet.addRow([
          dataItm?.recipe_name,
          dataItm?.avg_rating,
          dataItm?.no_of_customer,
        ]);
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async overallRatingReport(
  start_date: string,
  end_date: string,
  ): Promise<any> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Overall Rating Report');


    // Title rows
    worksheet.addRow(['Delivery Date']);
    worksheet.addRow([
      start_date + ' to ' + end_date,
    ]);

    const startDate = moment(start_date)
      .startOf('day')
      .toDate();
    const endDate = moment(end_date).endOf('day').toDate();

    worksheet.addRow('');

    // ────────────────────────────────────────────────
    // Section 1: Overall summary row
    // ────────────────────────────────────────────────
    const overallData = await this.deliveryModel.aggregate([
  {
    $match: {
      delivery_date: {
        $gte: startDate,
        $lte: endDate
      },
      delivery_type: "subscription",
      not_deliverable: false,
      is_delivery_freezed: false,
      // "delivery_item.selected_meal.rating_id": {
      //   $exists: true
      // }
    }
  },
  {
    // 2. Expand delivery items to access specific meals
    $unwind: "$delivery_item"
  },
  {
    // 3. Join with the ratings collection
    $lookup: {
      from: "ratings",
      localField:
        "delivery_item.selected_meal.rating_id",
      foreignField: "_id",
      as: "ratingData"
    }
  },
  {
    // 4. Flatten rating data but keep orders without ratings for "Total Customer" count
    $unwind: {
      path: "$ratingData",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $project: {
      recipe_id:
        "$delivery_item.selected_meal.recipe_id",
      dishName:
        "$delivery_item.selected_meal.dish_name",
      dietType:
        "$delivery_item.selected_meal.variants.protein_category",
      cuisine:
        "$delivery_item.selected_meal.cuisine",
      mealType:
        "$delivery_item.selected_meal.meal_category",
      // rating: "$delivery_item.selected_meal.rating",
      // review: "$delivery_item.selected_meal.review",

      // Logic: If ratingData.rating exists, use it. Otherwise, use the original rating.
      rating: {
        $ifNull: [
          "$ratingData.rating",
          "$delivery_item.selected_meal.rating"
        ]
      },
      // Do the same for review if needed
      review: {
        $ifNull: [
          "$ratingData.review",
          "$delivery_item.selected_meal.review"
        ]
      },
      delivery_date: 1
    }
  },
  {
    // 5. FIRST GROUP: By Month and Dish Details
    $group: {
      _id: {
        // month: {
        //   $month: "$delivery_date"
        // },
        recipe_id: "$recipe_id",
        dishName: "$dishName",
        dietType: "$dietType",
        cuisine: "$cuisine",
        mealType: "$mealType"
      },
      dishName: {
        $first: "$dishName"
      },
      totalCustomer: {
        $sum: 1
      },
      totalRatedCustomer: {
        $sum: {
          $cond: [
            {
              $gt: ["$rating", 0]
            },
            1,
            0
          ]
        }
      },
      sumRating: {
        $sum: "$rating"
      },
      s1: {
        $sum: {
          $cond: [
            {
              $eq: ["$rating", 1]
            },
            1,
            0
          ]
        }
      },
      s2: {
        $sum: {
          $cond: [
            {
              $eq: ["$rating", 2]
            },
            1,
            0
          ]
        }
      },
      s3: {
        $sum: {
          $cond: [
            {
              $eq: ["$rating", 3]
            },
            1,
            0
          ]
        }
      },
      s4: {
        $sum: {
          $cond: [
            {
              $eq: ["$rating", 4]
            },
            1,
            0
          ]
        }
      },
      s5: {
        $sum: {
          $cond: [
            {
              $eq: ["$rating", 5]
            },
            1,
            0
          ]
        }
      },
      // Store individual reviews and order IDs to handle unique counting next
      orderReviews: {
        $push: {
          id: "$_id",
          labels: "$review"
        }
      }
    }
  },
  {
    $unwind: {
      path: "$orderReviews",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    $unwind: {
      path: "$orderReviews.labels",
      preserveNullAndEmptyArrays: true
    }
  },
  {
    // 6. SECOND GROUP: Normalize Review Names and group by Label
    $group: {
      _id: {
        groupKey: "$_id",
        reviewName: {
          $trim: {
            input: {
              $replaceAll: {
                input: "$orderReviews.labels",
                find: "’",
                replacement: "'"
              }
            }
          }
        }
      },
      dishName: {
        $first: "$dishName"
      },
      totalCustomer: {
        $first: "$totalCustomer"
      },
      totalRatedCustomer: {
        $first: "$totalRatedCustomer"
      },
      sumRating: {
        $first: "$sumRating"
      },
      s1: {
        $first: "$s1"
      },
      s2: {
        $first: "$s2"
      },
      s3: {
        $first: "$s3"
      },
      s4: {
        $first: "$s4"
      },
      s5: {
        $first: "$s5"
      },
      // Use addToSet to count unique customers who selected this specific review
      uniqueReviewers: {
        $addToSet: "$orderReviews.id"
      }
    }
  },
  {
    // 7. THIRD GROUP: Prepare the dynamic fields for the pivot
    $group: {
      _id: "$_id.groupKey",
      totalCustomer: {
        $first: "$totalCustomer"
      },
      totalRatedCustomer: {
        $first: "$totalRatedCustomer"
      },
      sumRating: {
        $first: "$sumRating"
      },
      dishName: {
        $first: "$dishName"
      },
      s1: {
        $first: "$s1"
      },
      s2: {
        $first: "$s2"
      },
      s3: {
        $first: "$s3"
      },
      s4: {
        $first: "$s4"
      },
      s5: {
        $first: "$s5"
      },
      dynamicFields: {
        $push: {
          $cond: [
            {
              $and: [
                {
                  $ne: ["$_id.reviewName", null]
                },
                {
                  $ne: ["$_id.reviewName", ""]
                }
              ]
            },
            {
              k: "$_id.reviewName",
              v: {
                $concat: [
                  {
                    $toString: {
                      $size: "$uniqueReviewers"
                    }
                  },
                  " / ",
                  {
                    $toString:
                      "$totalRatedCustomer"
                  }
                ]
              }
            },
            "$$REMOVE"
          ]
        }
      }
    }
  },
  {
    // 8. FINAL PROJECT: Build the clean row and merge review columns
    $replaceRoot: {
      newRoot: {
        $mergeObjects: [
          {
            "Dish Name": "$dishName",
            "Diet Type": "$_id.dietType",
            Cuisine: {
              $ifNull: ["$_id.cuisine", "N/A"]
            },
            "Type Of Meal (B/M/S)":
              "$_id.mealType",
            "Total Customer": "$totalCustomer",
            "Total Rated Customer":
              "$totalRatedCustomer",
            "Avg Rating": {
              $cond: [
                {
                  $eq: ["$totalRatedCustomer", 0]
                },
                0,
                {
                  $round: [
                    {
                      $divide: [
                        "$sumRating",
                        "$totalRatedCustomer"
                      ]
                    },
                    2
                  ]
                }
              ]
            },
            "1 star": {
              $concat: [
                {
                  $toString: "$s1"
                },
                " / ",
                {
                  $toString: "$totalRatedCustomer"
                }
              ]
            },
            "2 star": {
              $concat: [
                {
                  $toString: "$s2"
                },
                " / ",
                {
                  $toString: "$totalRatedCustomer"
                }
              ]
            },
            "3 star": {
              $concat: [
                {
                  $toString: "$s3"
                },
                " / ",
                {
                  $toString: "$totalRatedCustomer"
                }
              ]
            },
            "4 star": {
              $concat: [
                {
                  $toString: "$s4"
                },
                " / ",
                {
                  $toString: "$totalRatedCustomer"
                }
              ]
            },
            "5 star": {
              $concat: [
                {
                  $toString: "$s5"
                },
                " / ",
                {
                  $toString: "$totalRatedCustomer"
                }
              ]
            }
          },
          {
            $arrayToObject: "$dynamicFields"
          }
        ]
      }
    }
  },
  {
    // 9. Sort by Month (Dec -> Oct) and then Alphabetically
    $sort: {
      // Month: -1,
      "Dish Name": 1
    }
  }
  // {
  //   $match: {
  //     "Dish Name": "Thai Mango Salad"
  //   }
  // }
]);

    // ─────────────────────────────────────────────────────────────────────────
    // Fixed columns that always appear in this order
    // ─────────────────────────────────────────────────────────────────────────
    const FIXED_COLS = [
      'Dish Name',
      'Diet Type',
      'Cuisine',
      'Type Of Meal (B/M/S)',
      'Total Customer',
      'Total Rated Customer',
      'Avg Rating',
      '1 star',
      '2 star',
      '3 star',
      '4 star',
      '5 star',
    ];

    // Discover all dynamic review-label columns that appear in the result set
    const reviewColSet = new Set<string>();
    overallData.forEach((row: Record<string, any>) => {
      Object.keys(row).forEach((key) => {
        if (!FIXED_COLS.includes(key)) {
          reviewColSet.add(key);
        }
      });
    });
    const reviewCols = Array.from(reviewColSet).sort();
    const allColumns = [...FIXED_COLS, ...reviewCols];

    // ─────────────────────────────────────────────────────────────────────────
    // Set column widths
    // ─────────────────────────────────────────────────────────────────────────
    allColumns.forEach((_, idx) => {
      const col = worksheet.getColumn(idx + 1);
      col.width = idx === 0 ? 40 : 22; // wider for dish name
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Header row
    // ─────────────────────────────────────────────────────────────────────────
    const headerRow = worksheet.addRow(allColumns);
    headerRow.eachCell((cell, colNum) => {
      const isReviewCol = colNum > FIXED_COLS.length;
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isReviewCol ? 'FFFCE4D6' : 'FF4472C4' },
      };
      cell.font = {
        bold: true,
        color: { argb: isReviewCol ? 'FF000000' : 'FFFFFFFF' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });
    headerRow.height = 30;

    // ─────────────────────────────────────────────────────────────────────────
    // Data rows – one per dish
    // ─────────────────────────────────────────────────────────────────────────
    overallData.forEach((row: Record<string, any>) => {
      const rowValues = allColumns.map((col) => row[col] ?? '');
      const dataRow = worksheet.addRow(rowValues);
      dataRow.eachCell((cell, colNum) => {
        cell.alignment = { horizontal: colNum <= 4 ? 'left' : 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();


    return buffer;
  }
// ─── Scheduler handler: saves, uploads, emails, cleans up ───
async overallRatingReportForScheduler(
 startDate: string,
  endDate: string,
): Promise<void> {
  const buffer =
   await this.overallRatingReport(startDate,endDate);
  // Save to disk
  const projectRoot = path.resolve(__dirname, '..', '..');
  const reportsDir = path.join(projectRoot, 'src', 'uploads');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const fileName = `delivery_report_${Date.now()}.xlsx`;
  const filePath = path.join(reportsDir, fileName);
  fs.writeFileSync(filePath, buffer); // buffer already in hand, no need to re-read workbook

  // Upload to S3
  const fileObj = {
    buffer,
    mimetype:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  const uploadData = { model_name: 'rating' };
  const result = await uploadExceelFile(uploadData, fileObj);
  const finalResultURL = `${process.env.BUCKET_FOLDER_NAME}/rating/${result.url}`;

  // Send email
  const payload = {
    customer_id: '68acbe2d4dfac0f67b6c20c1',
    email: process.env.RATING_EMAIL_ID,
    report_type: 'recipe_rating_report',
    attachment_filename: `recipe_rating_report(${this.formatDateString(startDate, endDate) || ''}).xlsx`,
    file_extension: 'xlsx',
    mime_type: 'application/xlsx',
    cc_emails:
      process.env.RATING_CC_EMAILS?.split(',').map((e) => e.trim()) || [],
    email_path: finalResultURL,
    dateString: this.formatDateString(startDate, endDate),
  };
  await this.notificationMasterService.sendNotificationMessage({
    channel: 'report_email',
    notificationPayload: payload,
  });

  // Cleanup
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error(`❌ Error deleting file: ${filePath}`, err);
  }
}
  private formatDateString(startDate: string, endDate: string): string {
    const start = moment(startDate).format('DD MMM YYYY');
    const end = moment(endDate).format('DD MMM YYYY');

    if (startDate === endDate) {
      return start;
    } else {
      return `${start} - ${end}`;
    }
  }
  async dishCostReport(dishReportDto: DishReportDto): Promise<any> {
    const orders = await this.dishCostReportData(dishReportDto);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Weekly Cost Report');
    // Get the system's current timezone

    // Add title and date
    worksheet.addRow('');
    worksheet.addRow([
      '',
      'Weekly Cost Report',
      '',
      '',
      '',
      '',
      'Date',
      moment().tz('Asia/Dubai').format('YYYY-MM-DD HH:mm:ss'),
    ]);
    worksheet.addRow('');

    // Get unique dates
    const dates = Array.from(
      new Set(orders.flatMap((order) => Object.keys(order.counts))),
    ).sort();

    const updatedDatesStatus = dates.map((singalDate) => {
      const newDateFormat = moment(new Date(singalDate as any)).format(
        'YYYY-MM-DD',
      );
      const date = moment(
        `${newDateFormat}T${moment().tz('Asia/Dubai').format('HH:mm:ss')}`,
      );

      const dateTime = moment()
        .tz('Asia/Dubai')
        .isBefore(
          moment(new Date(date as any))
            .tz('Asia/Dubai')
            .subtract(2, 'days')
            .set('hours', 12)
            .set('minutes', 0)
            .set('seconds', 0),
        );

      const status = dateTime ? 'open' : 'closed';
      console.log(`Date: ${newDateFormat}, Status: ${status}`);

      return { date: newDateFormat, status };
    });
    // Add headers
    const headers = worksheet.addRow([
      '',
      ...dates,
      'Total',
      '',
      ...dates,
      'Total',
    ]);

    const statusRow = [
      '',
      ...updatedDatesStatus.map((item) => item.status),
      '',
      '',
      ...updatedDatesStatus.map((item) => item.status),
    ];

    // Print Table
    console.log(statusRow.join('\t'));
    const headerRow = worksheet.addRow(headers);

    // Apply color to header row
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFAEE0E5' }, // Light Pink
      };
      cell.font = { bold: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    // Add Status Row
    const statusRowExcel = worksheet.addRow(statusRow);
    statusRowExcel.eachCell((cell) => {
      cell.font = { italic: true };
      cell.alignment = { horizontal: 'center' };
    });
    // Style header row
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFAEE0E5' }, // Light Purple
      };
      cell.font = { bold: true, color: { argb: 'FF000000' } }; // Black text
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Group orders by meal_category
    const groupedOrders = orders.reduce((acc, order) => {
      const category = order.meal_category || 'Uncategorized'; // Default to 'Uncategorized' if no category
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(order);
      return acc;
    }, {});

    // Add data rows dynamically
    Object.keys(groupedOrders).forEach((mealCategory) => {
      // Add category row
      const categoryRow = worksheet.addRow([mealCategory]);

      // Style category row
      categoryRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEEE8AA' }, // Pale Yellow
        };
        cell.font = { bold: true, italic: true };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });

      const categoryOrders = groupedOrders[mealCategory];

      // Add rows for each order in the category
      categoryOrders.forEach((order) => {
        const countValues = dates.map(
          (date) => order.counts[date as string]?.count || 0,
        );
        const priceValues = dates.map(
          (date) => order.counts[date as string]?.price || 0,
        );

        const rowValues = [
          order.dish_name, // Dish Name
          ...countValues, // Counts for each date
          countValues.reduce((sum, count) => sum + count, 0), // Total Count
          '', // Spacer column
          ...priceValues, // Prices for each date
          priceValues.reduce((sum, price) => sum + price, 0), // Total Price
        ];

        worksheet.addRow(rowValues);
      });

      // Add spacer row after each category
      worksheet.addRow('');
    });

    // Auto-adjust column widths
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    // Generate a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async breakdownCostReport(dishReportDto: DishReportDto): Promise<any> {
    const orders = await this.breakdownCostReportData(dishReportDto);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Details Cost Report');

    // Add title and date
    worksheet.addRow([
      '',
      'Details Cost Report',
      '',
      '',
      '',
      '',
      'Date',
      moment().tz('Asia/Dubai').format('YYYY-MM-DD HH:mm:ss'),
    ]);
    worksheet.addRow(''); // Empty row for spacing

    // Define headers with styles
    const headers = [
      'Dish Name',
      'Meal Category',
      'Date',
      'Diet Type',
      'Variant',
      'Size',
      'Price',
      'Count',
      'Unit Price',
    ];
    const headerRow = worksheet.addRow(headers);

    // Apply color to header row
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFAEE0E5' }, // Light Pink
      };
      cell.font = { bold: true };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Group data by 'Meal Category'
    const groupedOrders = orders.reduce((acc, order) => {
      const category = order['Meal Category'];
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(order);
      return acc;
    }, {});

    // Add grouped data with custom row styling
    Object.keys(groupedOrders).forEach((category) => {
      // Add a group header row for the Meal Category
      const categoryRow = worksheet.addRow([category]);
      categoryRow.eachCell((cell) => {
        cell.font = { bold: true, italic: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFEEE8AA' }, // Lemon Chiffon
        };
      });

      // Add rows for each item in the group
      groupedOrders[category].forEach((item) => {
        worksheet.addRow([
          item['Dish Name'],
          item['Meal Category'],
          item['Date'],
          item['Diet Type'],
          item['Variant'],
          item['Size'],
          item['Price'],
          item['Count'],
          item['Unit Price'],
        ]);
      });
      worksheet.addRow('');
    });

    // Auto-fit column widths
    worksheet.columns.forEach((column) => {
      column.width = Math.max(
        ...column.values.map((val) => (val ? val.toString().length : 10)),
      );
    });
    // Auto-adjust column widths
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });
    // Generate a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async ingredientWeeklyReport(dishReportDto: DishReportDto): Promise<any> {
    try {
      const response = await this.ingredientTotalCount(dishReportDto);
      const ingredientList = response.ingredient_list;
      // console.log('ingredientList', ingredientList);
      if (!ingredientList || ingredientList.length === 0) {
        throw new Error('No ingredient data found.');
      }
      ///////////////////////////////////////////////////////////////////////////////
      /////////////////////Ingredient By Quantity and Cost///////////////////////////
      ///////////////////////////////////////////////////////////////////////////////
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Ingredient Report');

      const dates = [...new Set(ingredientList.map((item) => item.date))].sort(
        (a, b) =>
          new Date(a as string).getTime() - new Date(b as string).getTime(),
      );

      const updatedDatesStatus = dates.map((singalDate) => {
        const newDateFormat = moment(new Date(singalDate as Date)).format(
          'YYYY-MM-DD',
        );
        const date = moment(
          `${newDateFormat}T${moment().tz('Asia/Dubai').format('HH:mm:ss')}`,
        );
        const dateTime = moment()
          .tz('Asia/Dubai')
          .isBefore(
            moment(new Date(date as any))
              .tz('Asia/Dubai')
              .subtract(2, 'days')
              .set('hours', 12)
              .set('minutes', 0)
              .set('seconds', 0),
          );
        const status = dateTime ? 'open' : 'closed';
        console.log(`Date: ${newDateFormat}, Status: ${status}`);
        return { date: newDateFormat, status };
      });
      // console.log(updatedDatesStatus);
      // console.log('dates', dates);

      // Add title and date
      this.addBoldRow(worksheet, [
        '',
        'Ingredient Report',
        '',
        '',
        'Date',
        moment().tz('Asia/Dubai').format('YYYY-MM-DD HH:mm:ss'),
      ]);
      worksheet.addRow(''); // Empty row for spacing
      this.addBoldRow(worksheet, ['', 'Ingredient Gross Quantity Report']);
      worksheet.addRow('');

      // Define headers with dates
      const headers = ['Ingredient Type', 'Ingredient Name', ...dates, 'Total'];

      this.createStyledHeaderRow(worksheet, headers, 'FFAEE0E5');

      // Generate Status Row
      const statusRow = [
        '',
        '',
        ...updatedDatesStatus.map((item) => item.status),
      ];

      // Add Status Row
      const fontStyle = { italic: true, bold: true, color: { argb: 'FF0000' } };
      const customAlignmentStyle = { horizontal: 'left', vertical: 'middle' };
      this.addAndStyleRow(
        worksheet,
        statusRow,
        fontStyle,
        customAlignmentStyle,
      );

      // Group data by ingredient_type and ingredient_name
      const groupedIngredients = ingredientList.reduce((acc, item) => {
        const {
          ingredient_type,
          ingredient_name,
          date,
          total_qty,
          net_qty,
          unit_cost,
        } = item;

        if (!acc[ingredient_type]) {
          acc[ingredient_type] = {};
        }
        if (!acc[ingredient_type][ingredient_name]) {
          acc[ingredient_type][ingredient_name] = {
            gross_qty: {},
            net_qty: {},
            unit_costs: {},
          };
        }

        acc[ingredient_type][ingredient_name].gross_qty[date] = total_qty;
        acc[ingredient_type][ingredient_name].net_qty[date] = net_qty;
        acc[ingredient_type][ingredient_name].unit_costs[date] = unit_cost;

        return acc;
      }, {});

      // Add data for each ingredient type
      Object.keys(groupedIngredients).forEach((ingredientType) => {
        // Add a row for the ingredient type (this is optional)
        worksheet.addRow([ingredientType, '']);

        // Add rows for each ingredient under the ingredient type
        Object.keys(groupedIngredients[ingredientType]).forEach(
          (ingredientName) => {
            const ingredientData =
              groupedIngredients[ingredientType][ingredientName];

            const totalQtyValues = dates.map((date) =>
              parseFloat(ingredientData.gross_qty[date as string] || 0).toFixed(
                2,
              ),
            );

            // const unitCostValues = dates.map((date) => {
            //   // Safely parse the ingredient data values for the given date
            //   const dateValue = parseFloat(
            //     ingredientData.gross_qty[date as string] || 0,
            //   );
            //   const unitCost = parseFloat(
            //     ingredientData.unit_costs[date as string] || 0,
            //   );

            //   // Calculate the unit cost value and return the result rounded to two decimal places
            //   return (dateValue * (unitCost / 1000) || 0).toFixed(2);
            // });

            const rowValues = [
              '', // Spacer for ingredient type
              ingredientName, // Ingredient name
              ...totalQtyValues, // Total quantities for each date
              totalQtyValues
                .reduce((sum, qty) => sum + parseFloat(qty), 0)
                .toFixed(2), // Total quantity
            ];
            // Add the row to the worksheet
            worksheet.addRow(rowValues);
          },
        );
      });

      // Auto-adjust column widths for better readability
      worksheet.columns.forEach((column) => {
        column.width = 20; // Adjust width for better readability (15 can be too narrow)
      });

      //////////////////////////////////////////////////////////////////////////////////////////
      //////////////////////////// Define headers with dates for net qty////////////////////
      //////////////////////////////////////////////////////////////////////////////////////
      worksheet.addRow(''); // Empty row for spacing
      worksheet.addRow('');
      this.addBoldRow(worksheet, ['', 'Ingredient Net Quantity Report']);
      worksheet.addRow('');
      this.createStyledHeaderRow(worksheet, headers, 'FFAEE0E5');
      this.addAndStyleRow(
        worksheet,
        statusRow,
        fontStyle,
        customAlignmentStyle,
      );

      // Add data for each ingredient type
      Object.keys(groupedIngredients).forEach((ingredientType) => {
        // Add a row for the ingredient type (this is optional)
        worksheet.addRow([ingredientType, '']);

        // Add rows for each ingredient under the ingredient type
        Object.keys(groupedIngredients[ingredientType]).forEach(
          (ingredientName) => {
            const ingredientData =
              groupedIngredients[ingredientType][ingredientName];

            const totalQtyValues = dates.map((date) =>
              parseFloat(ingredientData.net_qty[date as string] || 0).toFixed(
                2,
              ),
            );

            const rowValues = [
              '', // Spacer for ingredient type
              ingredientName, // Ingredient name
              ...totalQtyValues, // Total quantities for each date
              totalQtyValues
                .reduce((sum, qty) => sum + parseFloat(qty), 0)
                .toFixed(2), // Total quantity
            ];
            // Add the row to the worksheet
            worksheet.addRow(rowValues);
          },
        );
      });

      // Auto-adjust column widths for better readability
      worksheet.columns.forEach((column) => {
        column.width = 20; // Adjust width for better readability (15 can be too narrow)
      });

      //////////////////////////////////////////////////////////////////////////////////////////
      //////////////////////////// Define headers with dates for net qty////////////////////
      //////////////////////////////////////////////////////////////////////////////////////

      worksheet.addRow(''); // Empty row for spacing
      worksheet.addRow('');
      this.addBoldRow(worksheet, ['', 'Ingredient Cost Report']);
      worksheet.addRow('');
      this.createStyledHeaderRow(worksheet, headers, 'FFAEE0E5');
      this.addAndStyleRow(
        worksheet,
        statusRow,
        fontStyle,
        customAlignmentStyle,
      );

      // Add data for each ingredient type
      Object.keys(groupedIngredients).forEach((ingredientType) => {
        // Add a row for the ingredient type (this is optional)
        worksheet.addRow([ingredientType, '']);

        // Add rows for each ingredient under the ingredient type
        Object.keys(groupedIngredients[ingredientType]).forEach(
          (ingredientName) => {
            const ingredientData =
              groupedIngredients[ingredientType][ingredientName];

            const unitCostValues = dates.map((date) => {
              // Safely parse the ingredient data values for the given date
              const dateValue = parseFloat(
                ingredientData.gross_qty[date as string] || 0,
              );
              const unitCost = parseFloat(
                ingredientData.unit_costs[date as string] || 0,
              );

              //   // Calculate the unit cost value and return the result rounded to two decimal places
              return (dateValue * (unitCost / 1000) || 0).toFixed(2);
            });

            const rowValues = [
              '', // Spacer for ingredient type
              ingredientName, // Ingredient name
              ...unitCostValues, // Total cost for each date
              unitCostValues
                .reduce((sum, cost) => sum + parseFloat(cost), 0)
                .toFixed(2), // Total unit cost
            ];
            // Add the row to the worksheet
            worksheet.addRow(rowValues);
          },
        );
      });

      // Auto-adjust column widths for better readability
      worksheet.columns.forEach((column) => {
        column.width = 20; // Adjust width for better readability (15 can be too narrow)
      });

      ///////////////////////////////////////////////////////////////////////////////
      /////////////////////Ingredient By Supplier////////////////////////////////////
      ///////////////////////////////////////////////////////////////////////////////
      // Add second worksheet for grouping by supplier
      const supplierWorksheet = workbook.addWorksheet('Supplier Report');

      // Add title and date for the second worksheet
      this.addBoldRow(supplierWorksheet, [
        '',
        'Ingredient Report By Supplier',
        '',
        '',
        'Date',
        moment().tz('Asia/Dubai').format('YYYY-MM-DD HH:mm:ss'),
      ]);
      supplierWorksheet.addRow('');
      this.addBoldRow(supplierWorksheet, [
        '',
        'Ingredient Gross Quantity By Supplier',
      ]);
      supplierWorksheet.addRow('');
      // Define Headers for the second worksheet
      const supplierHeaders = [
        'Supplier',
        'Ingredient Type',
        'Ingredient Name',
        ...dates,
        'Total',
      ];
      this.createStyledHeaderRow(
        supplierWorksheet,
        supplierHeaders,
        'FFAEE0E5',
      );

      const supplierStatusRow = [
        '',
        '',
        '',
        ...updatedDatesStatus.map((item) => item.status),
      ];

      this.addAndStyleRow(
        supplierWorksheet,
        supplierStatusRow,
        fontStyle,
        customAlignmentStyle,
      );

      // Group data by supplier, ingredient_type, and ingredient_name
      const groupedBySupplier = ingredientList.reduce((acc, item) => {
        const {
          supplier,
          ingredient_type,
          ingredient_name,
          date,
          total_qty,
          net_qty,
          unit_cost,
        } = item;

        if (!acc[supplier]) {
          acc[supplier] = {};
        }
        if (!acc[supplier][ingredient_type]) {
          acc[supplier][ingredient_type] = {};
        }
        if (!acc[supplier][ingredient_type][ingredient_name]) {
          acc[supplier][ingredient_type][ingredient_name] = {
            gross_qty: {},
            net_qty: {},
            unit_costs: {},
          };
        }

        acc[supplier][ingredient_type][ingredient_name].gross_qty[date] =
          total_qty;
        acc[supplier][ingredient_type][ingredient_name].net_qty[date] = net_qty;
        acc[supplier][ingredient_type][ingredient_name].unit_costs[date] =
          unit_cost;
        return acc;
      }, {});

      // Populate data for each supplier
      Object.keys(groupedBySupplier).forEach((supplierName) => {
        supplierWorksheet.addRow([supplierName, '', '']); // Supplier title row

        Object.keys(groupedBySupplier[supplierName]).forEach(
          (ingredientType) => {
            Object.keys(
              groupedBySupplier[supplierName][ingredientType],
            ).forEach((ingredientName) => {
              const ingredientData =
                groupedBySupplier[supplierName][ingredientType][ingredientName];

              const totalQtyValues = dates.map((date) =>
                parseFloat(
                  ingredientData.gross_qty[date as string] || 0,
                ).toFixed(2),
              );

              const rowValues = [
                '',
                ingredientType,
                ingredientName,
                ...totalQtyValues, // Total quantities for each date
                totalQtyValues
                  .reduce((sum, qty) => sum + parseFloat(qty), 0)
                  .toFixed(2), // Total quantity
              ];

              // Add the row to the second worksheet
              supplierWorksheet.addRow(rowValues);
            });
          },
        );
        supplierWorksheet.addRow('');
      });

      // Auto-adjust column widths
      supplierWorksheet.columns.forEach((column) => {
        column.width = 20; // Adjust width for readability
      });
      /////////////////////////////////////////////////////////////////////////////////////
      ////////////////////////////////////ingredient net quantity by supplier/////////////
      /////////////////////////////////////////////////////////////////////////////////////
      // Add title and date for the second worksheet

      supplierWorksheet.addRow('');
      supplierWorksheet.addRow('');
      this.addBoldRow(supplierWorksheet, [
        '',
        'Ingredient Net Quantity By Supplier',
      ]);
      supplierWorksheet.addRow('');

      this.createStyledHeaderRow(
        supplierWorksheet,
        ['Supplier', 'Ingredient Type', 'Ingredient Name', ...dates, 'Total'],
        'FFAEE0E5',
      );

      this.addAndStyleRow(
        supplierWorksheet,
        supplierStatusRow,
        fontStyle,
        customAlignmentStyle,
      );

      // Populate data for each supplier
      Object.keys(groupedBySupplier).forEach((supplierName) => {
        supplierWorksheet.addRow([supplierName, '', '']); // Supplier title row

        Object.keys(groupedBySupplier[supplierName]).forEach(
          (ingredientType) => {
            Object.keys(
              groupedBySupplier[supplierName][ingredientType],
            ).forEach((ingredientName) => {
              const ingredientData =
                groupedBySupplier[supplierName][ingredientType][ingredientName];

              const totalQtyValues = dates.map((date) =>
                parseFloat(ingredientData.net_qty[date as string] || 0).toFixed(
                  2,
                ),
              );

              const rowValues = [
                '',
                ingredientType,
                ingredientName,
                ...totalQtyValues, // Total quantities for each date
                totalQtyValues
                  .reduce((sum, qty) => sum + parseFloat(qty), 0)
                  .toFixed(2), // Total quantity
              ];

              // Add the row to the second worksheet
              supplierWorksheet.addRow(rowValues);
            });
          },
        );
        supplierWorksheet.addRow('');
      });

      // Auto-adjust column widths
      supplierWorksheet.columns.forEach((column) => {
        column.width = 20; // Adjust width for readability
      });

      /////////////////////////////////////////////////////////////////////////////////////
      ////////////////////////////////////ingredient Cost by supplier/////////////
      /////////////////////////////////////////////////////////////////////////////////////

      supplierWorksheet.addRow('');
      this.addBoldRow(supplierWorksheet, ['', 'Ingredient Cost By Supplier']);
      supplierWorksheet.addRow('');
      this.createStyledHeaderRow(
        supplierWorksheet,
        supplierHeaders,
        'FFAEE0E5',
      );

      this.addAndStyleRow(
        supplierWorksheet,
        supplierStatusRow,
        fontStyle,
        customAlignmentStyle,
      );

      // Populate data for each supplier
      Object.keys(groupedBySupplier).forEach((supplierName) => {
        supplierWorksheet.addRow([supplierName, '', '']); // Supplier title row

        Object.keys(groupedBySupplier[supplierName]).forEach(
          (ingredientType) => {
            Object.keys(
              groupedBySupplier[supplierName][ingredientType],
            ).forEach((ingredientName) => {
              const ingredientData =
                groupedBySupplier[supplierName][ingredientType][ingredientName];

              const unitCostValues = dates.map((date) => {
                const dateValue = parseFloat(
                  ingredientData.gross_qty[date as string] || 0,
                );
                const unitCost = parseFloat(
                  ingredientData.unit_costs[date as string] || 0,
                );

                // Calculate the unit cost value and return the result rounded to two decimal places
                return (dateValue * (unitCost / 1000) || 0).toFixed(2);
              });

              const rowValues = [
                '',
                ingredientType,
                ingredientName,
                ...unitCostValues, // Unit costs for each date
                unitCostValues
                  .reduce((sum, cost) => sum + parseFloat(cost), 0)
                  .toFixed(2), // Total unit cost
              ];

              // Add the row to the second worksheet
              supplierWorksheet.addRow(rowValues);
            });
          },
        );
        supplierWorksheet.addRow('');
      });

      // Auto-adjust column widths
      supplierWorksheet.columns.forEach((column) => {
        column.width = 20; // Adjust width for readability
      });
      // Generate a buffer for the Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      console.error('Error generating weekly ingredient report:', error);
      throw new Error('Failed to generate the ingredient weekly report.');
    }
  }
  async recipeWiseIngredientWeeklyReport(
    dishReportDto: DishReportDto,
  ): Promise<any> {
    try {
      const response = await this.ingredientTotalCount(dishReportDto);
      const ingredientList = response.recipe_ingredient_list;
      // console.log('ingredientList', ingredientList);
      if (!ingredientList || ingredientList.length === 0) {
        throw new Error('No ingredient data found.');
      }
      ///////////////////////////////////////////////////////////////////////////////
      /////////////////////Ingredient By Quantity and Cost///////////////////////////
      ///////////////////////////////////////////////////////////////////////////////
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Recipe Wise Ingredient Report');

      const dates = [...new Set(ingredientList.map((item) => item.date))].sort(
        (a, b) =>
          new Date(a as string).getTime() - new Date(b as string).getTime(),
      );

      const updatedDatesStatus = dates.map((singalDate) => {
        const newDateFormat = moment(new Date(singalDate as Date)).format(
          'YYYY-MM-DD',
        );
        const date = moment(
          `${newDateFormat}T${moment().tz('Asia/Dubai').format('HH:mm:ss')}`,
        );
        const dateTime = moment()
          .tz('Asia/Dubai')
          .isBefore(
            moment(new Date(date as any))
              .tz('Asia/Dubai')
              .subtract(2, 'days')
              .set('hours', 12)
              .set('minutes', 0)
              .set('seconds', 0),
          );
        const status = dateTime ? 'open' : 'closed';
        console.log(`Date: ${newDateFormat}, Status: ${status}`);
        return { date: newDateFormat, status };
      });
      // console.log(updatedDatesStatus);
      // console.log('dates', dates);

      // Add title and date
      this.addBoldRow(worksheet, [
        '',
        'Recipe Wise Ingredient Report',
        '',
        '',
        'Date',
        moment().tz('Asia/Dubai').format('YYYY-MM-DD HH:mm:ss'),
      ]);
      this.addBoldRow(worksheet, [
        '',
        'Date Range:',
        `${dishReportDto.start_date}-${dishReportDto.end_date}`,
      ]);
      worksheet.addRow(''); // Empty row for spacing
      this.addBoldRow(worksheet, [
        '',
        '',
        'Ingredient Gross Quantity',
        '',
        // ...Array(dates.length + 1).fill(''), // Add empty spaces dynamically
        // '',
        'Ingredient Net Quantity',
        '',
        // ...Array(dates.length + 1).fill(''), // Add empty spaces dynamically
        'Ingredient Cost',
      ]);
      worksheet.addRow('');

      // Define headers with dates
      const headers = [
        'Recipe Name',
        // 'Ingredient Type',
        'Ingredient Name',
        // ...dates,
        'Total',
        '',
        // ...dates,
        'Total',
        '',
        // ...dates,
        'Total',
      ];

      this.createStyledHeaderRow(worksheet, headers, 'FFAEE0E5');

      // Generate Status Row
      const statusRow = [
        '',
        // '',
        '',
        // ...updatedDatesStatus.map((item) => item.status),
        '',
        '',
        // ...updatedDatesStatus.map((item) => item.status),
        '',
        '',
        // ...updatedDatesStatus.map((item) => item.status),
      ];

      // Add Status Row
      const fontStyle = { italic: true, bold: true, color: { argb: 'FF0000' } };
      const customAlignmentStyle = { horizontal: 'left', vertical: 'middle' };
      this.addAndStyleRow(
        worksheet,
        statusRow,
        fontStyle,
        customAlignmentStyle,
      );

      // Group data by ingredient_type and ingredient_name
      const groupedIngredients = ingredientList.reduce((acc, item) => {
        const {
          recipe_name,
          ingredient_type,
          ingredient_name,
          date,
          total_qty,
          net_qty,
          unit_cost,
        } = item;

        if (!acc[recipe_name]) {
          acc[recipe_name] = {};
        }
        if (!acc[recipe_name][ingredient_type]) {
          acc[recipe_name][ingredient_type] = {};
        }
        if (!acc[recipe_name][ingredient_type][ingredient_name]) {
          acc[recipe_name][ingredient_type][ingredient_name] = {
            gross_qty: {},
            net_qty: {},
            unit_costs: {},
          };
        }

        acc[recipe_name][ingredient_type][ingredient_name].gross_qty[date] =
          total_qty;
        acc[recipe_name][ingredient_type][ingredient_name].net_qty[date] =
          net_qty;
        acc[recipe_name][ingredient_type][ingredient_name].unit_costs[date] =
          unit_cost;

        return acc;
      }, {});

      Object.keys(groupedIngredients).forEach((recipe) => {
        // Add data for each ingredient type
        worksheet.addRow([recipe, '']);
        Object.keys(groupedIngredients[recipe]).forEach((ingredientType) => {
          // Add a row for the ingredient type (this is optional)
          // worksheet.addRow(['', ingredientType, '']);

          // Add rows for each ingredient under the ingredient type
          Object.keys(groupedIngredients[recipe][ingredientType]).forEach(
            (ingredientName) => {
              const ingredientData =
                groupedIngredients[recipe][ingredientType][ingredientName];

              const totalQtyValues = dates.map((date) =>
                parseFloat(
                  ingredientData.gross_qty[date as string] || 0,
                ).toFixed(2),
              );
              const totalNetQtyValues = dates.map((date) =>
                parseFloat(ingredientData.net_qty[date as string] || 0).toFixed(
                  2,
                ),
              );
              const unitCostValues = dates.map((date) => {
                // Safely parse the ingredient data values for the given date
                const dateValue = parseFloat(
                  ingredientData.gross_qty[date as string] || 0,
                );
                const unitCost = parseFloat(
                  ingredientData.unit_costs[date as string] || 0,
                );

                //   // Calculate the unit cost value and return the result rounded to two decimal places
                return (dateValue * (unitCost / 1000) || 0).toFixed(2);
              });

              const rowValues = [
                '', // Spacer for ingredient type
                // '',
                ingredientName, // Ingredient name

                /////////////////Gross QTY calculation////////////
                // ...totalQtyValues, // Total quantities for each date
                totalQtyValues
                  .reduce((sum, qty) => sum + parseFloat(qty), 0)
                  .toFixed(2), // Total quantity

                /////////////////Net QTY calculation////////////
                '',
                // ...totalNetQtyValues,
                totalNetQtyValues
                  .reduce((sum, qty) => sum + parseFloat(qty), 0)
                  .toFixed(2), // net quantity

                /////////////////Cost calculation////////////
                '',
                // ...unitCostValues,
                unitCostValues
                  .reduce((sum, qty) => sum + parseFloat(qty), 0)
                  .toFixed(2), // total cost values
                '',
              ];
              // Add the row to the worksheet
              worksheet.addRow(rowValues);
            },
          );
        });
        worksheet.addRow('');
      });

      // Auto-adjust column widths for better readability
      worksheet.columns.forEach((column) => {
        column.width = 20; // Adjust width for better readability (15 can be too narrow)
      });

      // //////////////////////////////////////////////////////////////////////////////////////////
      // //////////////////////////// Define headers with dates for net qty////////////////////
      // //////////////////////////////////////////////////////////////////////////////////////
      // worksheet.addRow(''); // Empty row for spacing
      // worksheet.addRow('');
      // this.addBoldRow(worksheet, ['', 'Ingredient Net Quantity Report']);
      // worksheet.addRow('');
      // this.createStyledHeaderRow(worksheet, headers, 'FFAEE0E5');
      // this.addAndStyleRow(
      //   worksheet,
      //   statusRow,
      //   fontStyle,
      //   customAlignmentStyle,
      // );

      // Object.keys(groupedIngredients).forEach((recipe) => {
      //   // Add data for each ingredient type
      //   worksheet.addRow([recipe, '']);
      //   Object.keys(groupedIngredients[recipe]).forEach((ingredientType) => {
      //     // Add a row for the ingredient type (this is optional)
      //     worksheet.addRow(['', ingredientType, '']);

      //     // Add rows for each ingredient under the ingredient type
      //     Object.keys(groupedIngredients[recipe][ingredientType]).forEach(
      //       (ingredientName) => {
      //         const ingredientData =
      //           groupedIngredients[recipe][ingredientType][ingredientName];

      //         const totalQtyValues = dates.map((date) =>
      //           parseFloat(ingredientData.net_qty[date as string] || 0).toFixed(
      //             2,
      //           ),
      //         );

      //         const rowValues = [
      //           '', // Spacer for ingredient type
      //           '',
      //           ingredientName, // Ingredient name
      //           ...totalQtyValues, // Total quantities for each date
      //           totalQtyValues
      //             .reduce((sum, qty) => sum + parseFloat(qty), 0)
      //             .toFixed(2), // Total quantity
      //         ];
      //         // Add the row to the worksheet
      //         worksheet.addRow(rowValues);
      //       },
      //     );
      //   });
      // });

      // // Auto-adjust column widths for better readability
      // worksheet.columns.forEach((column) => {
      //   column.width = 20; // Adjust width for better readability (15 can be too narrow)
      // });

      // //////////////////////////////////////////////////////////////////////////////////////////
      // //////////////////////////// Define headers with dates for net qty////////////////////
      // //////////////////////////////////////////////////////////////////////////////////////

      // worksheet.addRow(''); // Empty row for spacing
      // worksheet.addRow('');
      // this.addBoldRow(worksheet, ['', 'Ingredient Cost Report']);
      // worksheet.addRow('');
      // this.createStyledHeaderRow(worksheet, headers, 'FFAEE0E5');
      // this.addAndStyleRow(
      //   worksheet,
      //   statusRow,
      //   fontStyle,
      //   customAlignmentStyle,
      // );

      // Object.keys(groupedIngredients).forEach((recipe) => {
      //   // Add data for each ingredient type
      //   worksheet.addRow([recipe, '']);
      //   Object.keys(groupedIngredients[recipe]).forEach((ingredientType) => {
      //     // Add a row for the ingredient type (this is optional)
      //     worksheet.addRow(['', ingredientType, '']);

      //     // Add rows for each ingredient under the ingredient type
      //     Object.keys(groupedIngredients[recipe][ingredientType]).forEach(
      //       (ingredientName) => {
      //         const ingredientData =
      //           groupedIngredients[recipe][ingredientType][ingredientName];

      //         const unitCostValues = dates.map((date) => {
      //           // Safely parse the ingredient data values for the given date
      //           const dateValue = parseFloat(
      //             ingredientData.gross_qty[date as string] || 0,
      //           );
      //           const unitCost = parseFloat(
      //             ingredientData.unit_costs[date as string] || 0,
      //           );

      //           //   // Calculate the unit cost value and return the result rounded to two decimal places
      //           return (dateValue * (unitCost / 1000) || 0).toFixed(2);
      //         });

      //         const rowValues = [
      //           '',
      //           '', // Spacer for ingredient type
      //           ingredientName, // Ingredient name
      //           ...unitCostValues, // Total cost for each date
      //           unitCostValues
      //             .reduce((sum, cost) => sum + parseFloat(cost), 0)
      //             .toFixed(2), // Total unit cost
      //         ];
      //         // Add the row to the worksheet
      //         worksheet.addRow(rowValues);
      //       },
      //     );
      //   });
      // });

      // // Auto-adjust column widths for better readability
      // worksheet.columns.forEach((column) => {
      //   column.width = 20; // Adjust width for better readability (15 can be too narrow)
      // });

      // Generate a buffer for the Excel file
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
    } catch (error) {
      console.error('Error generating weekly ingredient report:', error);
      throw new Error('Failed to generate the ingredient weekly report.');
    }
  }
  async ingredientTotalCount(
    ingredientWeeklyReportDto: IngredientWeeklyReportDto,
  ): Promise<any> {
    const recipePortioning = await this.getDeliveryOrderCount(
      ingredientWeeklyReportDto,
    );
    // console.log('recipePortioning', recipePortioning);

    const type = 'dumpRecipesModel';
    if (!recipePortioning) {
      return null;
    }
    const recipeData = await this.getRecipeData(ingredientWeeklyReportDto);
    // console.log('recipeData', recipeData);
    if (recipeData.length == 0) {
      return null;
    }

    const recipeMetaIds = await this.getrecipeMetaIds(
      ingredientWeeklyReportDto,
      type,
    );

    // console.log('recipeMetaIds', recipeMetaIds);
    const componentMetaData = await this.componentModel.find({
      _id: { $in: recipeMetaIds?.[0]?.componentIds || [] },
    });

    const supplierMetaData = await this.supplierModel.find({});
    const ingredientMetaData = await this.ingredientModel.find({
      _id: { $in: recipeMetaIds?.[0]?.ingredientIds || [] },
    });
    // console.log(ingredientMetaData, componentMetaData, 'ingredientMetaData');
    interface IngredientData {
      total_qty: number;
      net_qty: number;
      ingredient_type: string;
      cutting_style: string;
      waste: number;
      dish_name: Array<string>;
      recipe_dish_name: string;
      supplier: string;
      unit_cost: number;
    }

    // interface ComponentIngredients {
    //   ingredients: { [ingredient_name: string]: IngredientData };
    //   cooking_method: [];
    //   component_name: string;
    //   component_type: string;
    // }

    // const componentWiseIngredients: {
    //   [componentId: string]: ComponentIngredients;
    // } = {};

    const allIngredients: {
      [date: string]: {
        [ingredient_name: string]: IngredientData;
      };
    } = {};
    const recipeWiseData: {
      [date: string]: {
        [recipe_dish_name: string]: { [ingredient: string]: IngredientData };
      };
    } = {};
    const miseEnPlaceIngredients: {
      [date: string]: {
        [ingredient_name: string]: IngredientData;
      };
    } = {};

    await Promise.all(
      await recipePortioning.map(async (singleRecipe) => {
        const { recipe_id, variants, delivery_date } = singleRecipe;
        // Ensure delivery_date is a valid Date object
        const dateObject = new Date(delivery_date);

        // Format the date to 'YYYY-MM-DD'
        const date = dateObject.toISOString().split('T')[0];
        // console.log('4444444444444', recipe_id, date);
        const variantsMap = new Map();
        for (const variant of variants) {
          variantsMap.set(
            `${variant.recipe_id}-${variant.protein_option}-${variant.size}-${variant.protein_category}`,
            variant,
          );
        }
        // console.log('variantsMap', variantsMap);
        const existRecipeData = recipeData.filter(
          (item) =>
            item.recipe_id.toString() === recipe_id.toString() &&
            item.date.toISOString().split('T')[0] === date, // Compare only the YYYY-MM-DD part
        );

        for (const recipe of existRecipeData) {
          const singleComponent = recipe.composition;
          const component_id = recipe.component_id;
          const recipe_dish_name = recipe.dish_name;
          const portioningBalance = singleComponent.portioning_balance;
          // console.log('portioningBalance', portioningBalance);
          // singleComponent.total_qty = portioningBalance.reduce(
          //   (
          //     total: number,
          //     portion: {
          //       protein_type: any;
          //       type: any;
          //       net_qty: number;
          //       protein_category: any;
          //     },
          //   ) => {
          //     const key = `${recipe_id}-${portion.protein_type}-${portion.type}-${portion.protein_category}`;
          //     const variant = variantsMap.get(key);
          //     if (variant) {
          //       return total + Number(portion.net_qty) * Number(variant.count);
          //     }
          //     return total;
          //   },
          //   0,
          // );

          const subIngredients =
            await this.kitchenAppService.calculateIngredientsForComponent(
              component_id,
              1,
              componentMetaData,
              ingredientMetaData,
              'Component',
              supplierMetaData,
            );

          const calculatedWeight =
            (recipe?.component_details?.use_calculated_weight ||
            recipe?.component_details?.manual_weight == 0
              ? Number(recipe?.component_details?.calculated_weight)
              : Number(recipe?.component_details?.manual_weight)) || 1;
          // console.log('================================', subIngredients);
          await Promise.all(
            subIngredients.map(async (componentIngredient) => {
              // const componentId = componentIngredient.componentId;
              // const componentName = componentIngredient.name || null;
              // const component_type = componentIngredient.type || null;
              // const cookingMethod = componentIngredient.cooking_methods || [];
              const grossQty = componentIngredient.gross_qty;
              const netQty = componentIngredient.net_qty;
              const ingredientType = componentIngredient.ingredient_type;
              const ingredientName = componentIngredient.ingredient_name;
              const ingredientmiseEnPlace = componentIngredient.mise_en_place;
              const ingredientCuttingStyle = componentIngredient.cutting_style;
              const ingredientWaste = componentIngredient.waste;
              const ingredientSupplier = componentIngredient.supplier;
              const ingredientUnitPrice = componentIngredient.unitPrice;
              // if (!componentWiseIngredients[componentId]) {
              //   componentWiseIngredients[componentId] = {
              //     ingredients: {},
              //     cooking_method: cookingMethod,
              //     component_name: componentName,
              //     component_type: component_type,
              //   };
              // }
              // if (ingredientName == 'Apple Juice') {
              // console.log('portioningBalance', portioningBalance);
              // console.log('componentName', componentName, ingredientName);
              // console.log('recipe', recipe.dish_name);
              if (ingredientType != 'Sub-recipe') {
                // console.log('111111111111', ingredientName);
                portioningBalance.forEach(
                  (portion: {
                    protein_type: any;
                    type: any;
                    net_qty: any;
                    protein_category: any;
                  }) => {
                    const key = `${recipe_id}-${portion.protein_type}-${portion.type}-${portion.protein_category}`;
                    const variant = variantsMap.get(key);
                    const variantCount = Number(variant?.count);
                    if (variant && variantCount > 0) {
                      // console.log('variant1', variant);

                      const grossQtyToAdd =
                        (grossQty * variantCount * portion.net_qty) /
                        calculatedWeight;

                      const netQtyToAdd =
                        (netQty * variantCount * portion.net_qty) /
                        calculatedWeight;

                      // if (
                      //   !componentWiseIngredients[componentId].ingredients[
                      //     ingredientName
                      //   ]
                      // ) {
                      //   componentWiseIngredients[componentId].ingredients[
                      //     ingredientName
                      //   ] = {
                      //     total_qty: 0,
                      //     net_qty: 0,
                      //     ingredient_type: ingredientType,
                      //     cutting_style: ingredientCuttingStyle,
                      //     waste: ingredientWaste,
                      //   };
                      // }

                      // componentWiseIngredients[componentId].ingredients[
                      //   ingredientName
                      // ].total_qty += grossQtyToAdd;

                      // componentWiseIngredients[componentId].ingredients[
                      //   ingredientName
                      // ].net_qty += netQtyToAdd;

                      if (!allIngredients[date]) {
                        allIngredients[date] = {}; // Initialize the date if it doesn't exist
                      }

                      if (!allIngredients[date][ingredientName]) {
                        allIngredients[date][ingredientName] = {
                          total_qty: 0,
                          net_qty: 0,
                          ingredient_type: ingredientType,
                          cutting_style: ingredientCuttingStyle,
                          waste: ingredientWaste,
                          dish_name: [],
                          supplier: ingredientSupplier,
                          recipe_dish_name: '',
                          unit_cost: ingredientUnitPrice,
                        };
                      }

                      // Update total_qty and net_qty
                      allIngredients[date][ingredientName].total_qty +=
                        grossQtyToAdd;
                      allIngredients[date][ingredientName].net_qty +=
                        netQtyToAdd;

                      allIngredients[date][ingredientName].recipe_dish_name =
                        recipe_dish_name;

                      // Add new dish name, ensuring uniqueness using Set
                      allIngredients[date][ingredientName].dish_name = [
                        ...new Set([
                          ...allIngredients[date][ingredientName].dish_name, // Existing dish names
                          recipe_dish_name, // New dish name to add
                        ]),
                      ];

                      if (ingredientmiseEnPlace) {
                        if (!miseEnPlaceIngredients[date]) {
                          miseEnPlaceIngredients[date] = {}; // Initialize the date if it doesn't exist
                        }

                        if (!miseEnPlaceIngredients[date][ingredientName]) {
                          miseEnPlaceIngredients[date][ingredientName] = {
                            total_qty: 0,
                            net_qty: 0,
                            ingredient_type: ingredientType,
                            cutting_style: ingredientCuttingStyle,
                            waste: ingredientWaste,
                            dish_name: [],
                            recipe_dish_name: '',
                            supplier: ingredientSupplier,
                            unit_cost: ingredientUnitPrice,
                          };
                        }

                        // Update total_qty and net_qty for miseEnPlaceIngredients
                        miseEnPlaceIngredients[date][
                          ingredientName
                        ].total_qty += grossQtyToAdd;
                        miseEnPlaceIngredients[date][ingredientName].net_qty +=
                          netQtyToAdd;

                        miseEnPlaceIngredients[date][
                          ingredientName
                        ].recipe_dish_name = recipe.dish_name;
                        // Ensure unique dish names for miseEnPlaceIngredients
                        miseEnPlaceIngredients[date][ingredientName].dish_name =
                          [
                            ...new Set([
                              ...miseEnPlaceIngredients[date][ingredientName]
                                .dish_name, // Existing dish names
                              recipe.dish_name, // New dish name to add
                            ]),
                          ];
                      }

                      if (!recipeWiseData[date]) {
                        recipeWiseData[date] = {}; // Initialize the date if it doesn't exist
                      }
                      if (!recipeWiseData[date][recipe_dish_name]) {
                        recipeWiseData[date][recipe_dish_name] = {}; // Initialize the date if it doesn't exist
                      }

                      if (
                        !recipeWiseData[date][recipe_dish_name][ingredientName]
                      ) {
                        recipeWiseData[date][recipe_dish_name][ingredientName] =
                          {
                            total_qty: 0,
                            net_qty: 0,
                            ingredient_type: ingredientType,
                            cutting_style: ingredientCuttingStyle,
                            waste: ingredientWaste,
                            dish_name: [],
                            supplier: ingredientSupplier,
                            recipe_dish_name: '',
                            unit_cost: ingredientUnitPrice,
                          };
                      }

                      // Update total_qty and net_qty
                      recipeWiseData[date][recipe_dish_name][
                        ingredientName
                      ].total_qty += grossQtyToAdd;
                      recipeWiseData[date][recipe_dish_name][
                        ingredientName
                      ].net_qty += netQtyToAdd;

                      recipeWiseData[date][recipe_dish_name][
                        ingredientName
                      ].recipe_dish_name = recipe_dish_name;

                      // Add new dish name, ensuring uniqueness using Set
                    } else {
                      // console.log('key', key, variant, variantCount);
                    }
                  },
                );
              }
            }),
          );
        }
      }),
    );
    // const componentResult = Object.entries(componentWiseIngredients).map(
    //   ([component_id, data]) => {
    //     return {
    //       component_id,
    //       component_name: data.component_name,
    //       cooking_method: data.cooking_method,
    //       component_type: data.component_type,
    //       ingredients: Object.entries(data.ingredients).map(
    //         ([ingredient_name, ingredientData]) => ({
    //           ingredient_name,
    //           ingredient_type: ingredientData.ingredient_type || null,
    //           total_qty: setRounded(Number(ingredientData.total_qty)),
    //           net_qty: setRounded(Number(ingredientData.net_qty)),
    //         }),
    //       ),
    //     };
    //   },
    // );
    console.log('recipeWiseData', recipeWiseData);
    const allIngredientsResult = Object.entries(allIngredients).flatMap(
      ([date, ingredients]) =>
        Object.entries(ingredients).map(([ingredient_name, data]) => {
          // console.log('date', date, moment(date), moment(new Date(date)));
          // const formattedDate = moment(date, 'ddd MMM DD YYYY HH:mm:ss ');
          // console.log('222222', formattedDate, date);
          // const formattedDateString = formattedDate.isValid()
          //   ? formattedDate.format('DD-MMM-YYYY')
          //   : 'Invalid Date'; // Fallback if the date is invalid

          return {
            date: date,
            ingredient_name,
            supplier: data.supplier || '',
            unit_cost: data.unit_cost,
            ingredient_type: data.ingredient_type || null,
            total_qty: setRounded(Number(data.total_qty)) || 0,
            net_qty: setRounded(Number(data.net_qty)) || 0,
            dish_names: [...new Set(data.dish_name)], // Ensure dish_name is unique
          };
        }),
    );

    const allIngredientsRecipeWiseData = Object.entries(recipeWiseData).flatMap(
      ([date, recipes]) =>
        Object.entries(recipes).flatMap(([recipe_name, ingredients]) =>
          Object.entries(ingredients).map(([ingredient_name, data]) => ({
            date: date,
            recipe_name: recipe_name,
            ingredient_name: ingredient_name,
            supplier: data.supplier || '',
            unit_cost: data.unit_cost || 0,
            ingredient_type: data.ingredient_type || null,
            total_qty: setRounded(Number(data.total_qty)) || 0,
            net_qty: setRounded(Number(data.net_qty)) || 0,
          })),
        ),
    );

    // console.log('allIngredientsRecipeWiseData', allIngredientsRecipeWiseData);

    const miseEnPlaceIngredientsResult = Object.entries(
      miseEnPlaceIngredients,
    ).flatMap(([date, ingredients]) =>
      Object.entries(ingredients).map(([ingredient_name, data]) => {
        return {
          date: moment(new Date(date)).format('DD-MMM-YYYY'),
          ingredient_name,
          ingredient_type: data.ingredient_type || null,
          total_qty: setRounded(Number(data.total_qty)) || 0,
          net_qty: setRounded(Number(data.net_qty)) || 0,
          dish_names: [...new Set(data.dish_name)], // Ensure dish_name is unique
        };
      }),
    );

    const response = {
      ingredient_list: allIngredientsResult,
      mise_en_place_ingredient_list: miseEnPlaceIngredientsResult,
      recipe_ingredient_list: allIngredientsRecipeWiseData,
      // component_list: componentResult,
      // composition: result,
      // variants,
      recipePortioning: recipePortioning,
    };
    return response;
  }

  async getDeliveryOrderCount(ingredientWeeklyReportDto): Promise<any> {
    try {
      const orderCount = await this.deliveryModel.aggregate([
        {
          $match: {
            delivery_date: {
              $gte: new Date(
                moment(ingredientWeeklyReportDto.start_date)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
              $lte: new Date(
                moment(ingredientWeeklyReportDto.end_date)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
            },
            delivery_type: 'subscription',
            not_deliverable: false,
            is_delivery_freezed: false,
          },
        },
        {
          $unwind: {
            path: '$delivery_item',
          },
        },
        {
          $unwind: {
            path: '$delivery_item.selected_meal',
          },
        },
        // {
        //   $match: {
        //     $or: [
        //       {
        //         'delivery_item.selected_meal._id': recipeId,
        //       },
        //       {
        //         'delivery_item.selected_meal._id': new mongoose.Types.ObjectId(
        //           recipeId,
        //         ),
        //       },
        //     ],
        //   },
        // },
        {
          $group: {
            _id: {
              recipe_id: {
                $toString: '$delivery_item.selected_meal._id',
              },
              protein_option:
                '$delivery_item.selected_meal.variants.protein_option',
              size: '$delivery_item.selected_meal.variants.size',
              protein_category:
                '$delivery_item.selected_meal.variants.protein_category',
              delivery_date: '$delivery_date',
            },
            count: {
              $sum: 1,
            },
            // delivery_date: {
            //   $first: '$delivery_date',
            // },
            meal_category: {
              $first: '$delivery_item.selected_meal.meal_category',
            },
            dish_name: {
              $first: '$delivery_item.selected_meal.dish_name',
            },
            recipe_id: {
              $first: '$delivery_item.selected_meal.recipe_id',
            },
          },
        },
        {
          $group: {
            _id: {
              recipe_id: { $toObjectId: '$_id.recipe_id' },
              date: '$_id.delivery_date',
            },
            recipe_id: {
              $first: { $toObjectId: '$_id.recipe_id' },
            },
            delivery_date: {
              $first: '$_id.delivery_date',
            },
            variants: {
              $push: {
                recipe_id: {
                  $toString: '$_id.recipe_id',
                },
                protein_option: '$_id.protein_option',
                size: '$_id.size',
                count: '$count',
                protein_category: '$_id.protein_category',
              },
            },
          },
        },
        // {
        //   $match: {
        //     recipe_id: new mongoose.Types.ObjectId('67c554f23e3e967df14b0221'),
        //   },
        // },
      ]);
      return orderCount;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  async getRecipeData(ingredientWeeklyReportDto: any): Promise<any> {
    try {
      // Execute the aggregate query with the dynamic pipeline
      return await this.dumpRecipesModel.aggregate([
        {
          $match: {
            date: {
              $gte: new Date(
                moment(ingredientWeeklyReportDto.start_date)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
              $lte: new Date(
                moment(ingredientWeeklyReportDto.end_date)
                  .utcOffset(0, true)
                  .set({ hour: 23, minute: 59, second: 59, millisecond: 999 })
                  .toDate(),
              ),
            },
          },
        },
        {
          $unwind: '$recipes',
        },
        {
          $addFields: {
            'recipes.date': '$date', // Adding the date field to the recipes object
          },
        },
        {
          $replaceRoot: {
            newRoot: '$recipes', // Replacing the root with the recipes object that now includes the date
          },
        },
        {
          $unwind: '$composition', // Unwinding the composition array
        },
        {
          $lookup: {
            from: 'components', // Looking up the components collection
            localField: 'composition.component_id',
            foreignField: '_id',
            as: 'component_details',
          },
        },
        {
          $unwind: '$component_details', // Unwinding the component details array
        },
        {
          $project: {
            component_details: 1, // Projecting the component details
            dish_name: 1, // Projecting the dish name
            recipe_id: 1,
            date: 1, // Projecting the date
            component_id: '$composition.component_id', // Projecting the component ID
            'composition.portioning_balance': 1, // Projecting the portioning balance
            'composition.type': 1, // Projecting the composition type
            // cooking_methods: '$component_details.cooking_method', // Projecting the cooking methods from component details
          },
        },
        // {
        //   $match: {
        //     recipe_id: new Types.ObjectId('67054ef593a773db3a3dcf49'),
        //   },
        // },
      ]);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  async getrecipeMetaIds(
    ingredientWeeklyReportDto: any,
    recipesModel: string,
  ): Promise<any> {
    try {
      const pipeline = [
        {
          $match: {
            date: {
              $gte: new Date(
                moment(ingredientWeeklyReportDto.start_date)
                  .utcOffset(0, true)
                  .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                  .toDate(),
              ),
              $lte: new Date(
                moment(ingredientWeeklyReportDto.end_date)
                  .utcOffset(0, true)
                  .set({ hour: 23, minute: 59, second: 59, millisecond: 999 })
                  .toDate(),
              ),
            },
          },
        },
        {
          $unwind: {
            path: '$recipes',
          },
        },
        {
          $addFields: {
            'recipes.date': '$date', // Adding the date field to the recipes object
          },
        },
        {
          $replaceRoot: {
            newRoot: '$recipes', // Replacing the root with the recipes object that now includes the date
          },
        },
        {
          $unwind: {
            path: '$composition',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            componentId: '$composition.component_id',
            ingredientId: '$composition.ingredient_id',
          },
        },
        {
          $graphLookup: {
            from: 'components',
            startWith: '$componentId',
            connectFromField: 'composition.component_id',
            connectToField: '_id',
            as: 'subRecipes',
            maxDepth: 10,
            depthField: 'depth',
          },
        },
        {
          $unwind: {
            path: '$subRecipes',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: '$subRecipes.composition',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            componentId: '$subRecipes._id',
            ingredientId: '$subRecipes.composition.ingredient_id',
          },
        },
        {
          $group: {
            _id: null,
            componentIds: {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ['$componentId', null] },
                      { $ne: ['$componentId', ''] },
                    ],
                  },
                  then: '$componentId',
                  else: null,
                },
              },
            },
            ingredientIds: {
              $addToSet: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ['$ingredientId', null] },
                      { $ne: ['$ingredientId', ''] },
                    ],
                  },
                  then: '$ingredientId',
                  else: null,
                },
              },
            },
          },
        },
        {
          $project: {
            componentIds: {
              $filter: {
                input: '$componentIds',
                as: 'componentId',
                cond: { $ne: ['$$componentId', null] },
              },
            },
            ingredientIds: {
              $filter: {
                input: '$ingredientIds',
                as: 'ingredientId',
                cond: { $ne: ['$$ingredientId', null] },
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            componentIds: 1,
            ingredientIds: 1,
          },
        },
      ];
      return await this[`${recipesModel}`].aggregate(pipeline);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  async dishCostReportData(dishReportDto) {
    console.log({
      delivery_date: {
        $gte: new Date(
          moment(dishReportDto.start_date)
            .utcOffset(0, true)
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toDate(),
        ),
        $lte: new Date(
          moment(dishReportDto.end_date)
            .utcOffset(0, true)
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toDate(),
        ),
      },
    });
    return await this.deliveryModel.aggregate([
      {
        $match: {
          delivery_date: {
            $gte: new Date(
              moment(dishReportDto.start_date)
                .utcOffset(0, true)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .toDate(),
            ),
            $lte: new Date(
              moment(dishReportDto.end_date)
                .utcOffset(0, true)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .toDate(),
            ),
          },
          delivery_type: 'subscription',
          not_deliverable: false,
          is_delivery_freezed: false,
        },
      },
      {
        $unwind: {
          path: '$delivery_item',
        },
      },
      {
        $project: {
          dish_name: '$delivery_item.selected_meal.dish_name',
          meal_category: '$delivery_item.selected_meal.meal_category',
          delivery_date: 1,
          variants: '$delivery_item.selected_meal.variants.protein_option',
          size: '$delivery_item.selected_meal.variants.size',
          day: {
            $dateToString: {
              format: '%d',
              date: '$delivery_date',
            },
          },
          month: {
            $dateToString: {
              format: '%m',
              date: '$delivery_date',
            },
          },
          year: {
            $dateToString: {
              format: '%Y',
              date: '$delivery_date',
            },
          },
          price: '$delivery_item.selected_meal.price',
          filtered_price: {
            $filter: {
              input: SELECTED_MEAL_PRICE_AS_ARRAY,
              as: 'item',
              cond: {
                $eq: [
                  '$$item.protein_type',
                  '$delivery_item.selected_meal.variants.protein_option',
                ],
              },
            },
          },
          meal_price: '$delivery_item.selected_meal.variants.components',
        },
      },
      // {
      //   $match:
      //     /**
      //      * query: The query in MQL.
      //      */
      //     {
      //       dish_name:
      //         "Balkan Mushroom Rice and Protein"
      //     }
      // }
      {
        $addFields: {
          month_name: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ['$month', '01'],
                  },
                  then: 'Jan',
                },
                {
                  case: {
                    $eq: ['$month', '02'],
                  },
                  then: 'Feb',
                },
                {
                  case: {
                    $eq: ['$month', '03'],
                  },
                  then: 'Mar',
                },
                {
                  case: {
                    $eq: ['$month', '04'],
                  },
                  then: 'Apr',
                },
                {
                  case: {
                    $eq: ['$month', '05'],
                  },
                  then: 'May',
                },
                {
                  case: {
                    $eq: ['$month', '06'],
                  },
                  then: 'Jun',
                },
                {
                  case: {
                    $eq: ['$month', '07'],
                  },
                  then: 'Jul',
                },
                {
                  case: {
                    $eq: ['$month', '08'],
                  },
                  then: 'Aug',
                },
                {
                  case: {
                    $eq: ['$month', '09'],
                  },
                  then: 'Sep',
                },
                {
                  case: {
                    $eq: ['$month', '10'],
                  },
                  then: 'Oct',
                },
                {
                  case: {
                    $eq: ['$month', '11'],
                  },
                  then: 'Nov',
                },
                {
                  case: {
                    $eq: ['$month', '12'],
                  },
                  then: 'Dec',
                },
              ],
              default: 'Invalid Month',
            },
          },
        },
      },
      {
        $project: {
          dish_name: 1,
          meal_category: 1,
          variants: 1,
          size: 1,
          delivery_date: {
            $concat: ['$day', '-', '$month_name', '-', '$year'],
          },
          month: 1,
          year: 1,
          day: 1,
          meal_price: 1,
          average_price: {
            $arrayElemAt: ['$filtered_price', 0],
          },
        },
      },
      {
        $project:
          /**
           * specifications: The fields to
           *   include or exclude.
           */
          {
            size_price: {
              $arrayElemAt: [
                {
                  $objectToArray: '$average_price.size_prices',
                },
                {
                  $indexOfArray: [
                    {
                      $map: {
                        input: {
                          $objectToArray: '$average_price.size_prices',
                        },
                        as: 'item',
                        in: '$$item.k',
                      },
                    },
                    '$size',
                  ],
                },
              ],
            },
            size: 1,
            dish_name: 1,
            meal_category: 1,
            variants: 1,
            delivery_date: 1,
            month: 1,
            meal_price: 1,
            year: 1,
            day: 1,
          },
      },
      {
        $project:
          /**
           * specifications: The fields to
           *   include or exclude.
           */
          {
            dish_name: 1,
            meal_category: 1,
            size: 1,
            variants: 1,
            delivery_date: 1,
            month: 1,
            year: 1,
            day: 1,
            // average_price: '$size_price.v',
            average_price: {
              $cond: {
                if: {
                  $eq: ['$meal_category', 'Meal'],
                },
                then: {
                  $sum: {
                    $map: {
                      input: '$meal_price',
                      as: 'component',
                      in: '$$component.price',
                    },
                  },
                },
                else: '$size_price.v',
              },
            },
          },
      },
      {
        $group: {
          _id: {
            dish_name: '$dish_name',
            meal_category: '$meal_category',
            delivery_date: '$delivery_date',
          },
          price: {
            $sum: '$average_price',
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $group:
          /**
           * _id: The id of the group.
           * fieldN: The first field name.
           */
          {
            _id: {
              dish_name: '$_id.dish_name',
              meal_category: '$_id.meal_category',
            },
            countsByDate: {
              $push: {
                date: '$_id.delivery_date',
                price: '$price',
                count: '$count',
              },
            },
          },
      },
      {
        $project: {
          _id: 0,
          dish_name: '$_id.dish_name',
          meal_category: '$_id.meal_category',
          counts: {
            $arrayToObject: {
              $map: {
                input: '$countsByDate',
                as: 'item',
                in: {
                  k: '$$item.date',
                  // Value as an object with price and count
                  v: { price: '$$item.price', count: '$$item.count' },
                },
              },
            },
          },
        },
      },
      {
        $sort: { dish_name: 1 },
      },
    ]);
  }

  async breakdownCostReportData(dishReportDto) {
    console.log({
      delivery_date: {
        $gte: new Date(
          moment(dishReportDto.start_date)
            .utcOffset(0, true)
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toDate(),
        ),
        $lte: new Date(
          moment(dishReportDto.end_date)
            .utcOffset(0, true)
            .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
            .toDate(),
        ),
      },
    });
    return await this.deliveryModel.aggregate([
      {
        $match: {
          delivery_date: {
            $gte: new Date(
              moment(dishReportDto.start_date)
                .utcOffset(0, true)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .toDate(),
            ),
            $lte: new Date(
              moment(dishReportDto.end_date)
                .utcOffset(0, true)
                .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                .toDate(),
            ),
          },
          delivery_type: 'subscription',
          not_deliverable: false,
          is_delivery_freezed: false,
        },
      },
      {
        $unwind: {
          path: '$delivery_item',
        },
      },
      {
        $project: {
          dish_name: '$delivery_item.selected_meal.dish_name',
          meal_category: '$delivery_item.selected_meal.meal_category',
          delivery_date: 1,
          variants: '$delivery_item.selected_meal.variants.protein_option',
          protein_category:
            '$delivery_item.selected_meal.variants.protein_category',
          size: '$delivery_item.selected_meal.variants.size',
          day: {
            $dateToString: {
              format: '%d',
              date: '$delivery_date',
            },
          },
          month: {
            $dateToString: {
              format: '%m',
              date: '$delivery_date',
            },
          },
          year: {
            $dateToString: {
              format: '%Y',
              date: '$delivery_date',
            },
          },
          price: '$delivery_item.selected_meal.price',
          filtered_price: {
            $filter: {
              input: SELECTED_MEAL_PRICE_AS_ARRAY,
              as: 'item',
              cond: {
                $eq: [
                  '$$item.protein_type',
                  '$delivery_item.selected_meal.variants.protein_option',
                ],
              },
            },
          },
          meal_price: '$delivery_item.selected_meal.variants.components',
        },
      },
      // {
      //   $match:
      //     /**
      //      * query: The query in MQL.
      //      */
      //     {
      //       dish_name: "Key Lime Yoghurt"
      //     }
      // }
      {
        $addFields: {
          month_name: {
            $switch: {
              branches: [
                {
                  case: {
                    $eq: ['$month', '01'],
                  },
                  then: 'Jan',
                },
                {
                  case: {
                    $eq: ['$month', '02'],
                  },
                  then: 'Feb',
                },
                {
                  case: {
                    $eq: ['$month', '03'],
                  },
                  then: 'Mar',
                },
                {
                  case: {
                    $eq: ['$month', '04'],
                  },
                  then: 'Apr',
                },
                {
                  case: {
                    $eq: ['$month', '05'],
                  },
                  then: 'May',
                },
                {
                  case: {
                    $eq: ['$month', '06'],
                  },
                  then: 'Jun',
                },
                {
                  case: {
                    $eq: ['$month', '07'],
                  },
                  then: 'Jul',
                },
                {
                  case: {
                    $eq: ['$month', '08'],
                  },
                  then: 'Aug',
                },
                {
                  case: {
                    $eq: ['$month', '09'],
                  },
                  then: 'Sep',
                },
                {
                  case: {
                    $eq: ['$month', '10'],
                  },
                  then: 'Oct',
                },
                {
                  case: {
                    $eq: ['$month', '11'],
                  },
                  then: 'Nov',
                },
                {
                  case: {
                    $eq: ['$month', '12'],
                  },
                  then: 'Dec',
                },
              ],
              default: 'Invalid Month',
            },
          },
        },
      },
      {
        $project: {
          dish_name: 1,
          meal_category: 1,
          variants: 1,
          size: 1,
          protein_category: 1,
          delivery_date: {
            $concat: ['$day', '-', '$month_name', '-', '$year'],
          },
          month: 1,
          year: 1,
          day: 1,
          average_price: {
            $arrayElemAt: ['$filtered_price', 0],
          },
          meal_price: 1,
        },
      },
      {
        $project: {
          size_price: {
            $arrayElemAt: [
              {
                $objectToArray: '$average_price.size_prices',
              },
              {
                $indexOfArray: [
                  {
                    $map: {
                      input: {
                        $objectToArray: '$average_price.size_prices',
                      },
                      as: 'item',
                      in: '$$item.k',
                    },
                  },
                  '$size',
                ],
              },
            ],
          },
          size: 1,
          dish_name: 1,
          meal_category: 1,
          protein_category: 1,
          variants: 1,
          delivery_date: 1,
          month: 1,
          year: 1,
          day: 1,
          meal_price: 1,
        },
      },
      {
        $project: {
          dish_name: 1,
          meal_category: 1,
          size: 1,
          variants: 1,
          delivery_date: 1,
          month: 1,
          protein_category: 1,
          year: 1,
          day: 1,
          average_price: {
            $cond: {
              if: {
                $eq: ['$meal_category', 'Meal'],
              },
              then: {
                $sum: {
                  $map: {
                    input: '$meal_price',
                    as: 'component',
                    in: '$$component.price',
                  },
                },
              },
              else: '$size_price.v',
            },
          },
        },
      },
      {
        $group: {
          _id: {
            dish_name: '$dish_name',
            meal_category: '$meal_category',
            delivery_date: '$delivery_date',
            variants: '$variants',
            size: '$size',
            protein_category: '$protein_category',
          },
          price: {
            $sum: '$average_price',
          },
          count: {
            $sum: 1,
          },
          unit_price: {
            $first: '$average_price',
          },
        },
      },
      {
        $group: {
          _id: {
            dish_name: '$_id.dish_name',
            meal_category: '$_id.meal_category',
          },
          countsByDate: {
            $push: {
              date: '$_id.delivery_date',
              size: '$_id.size',
              variants: '$_id.variants',
              price: '$price',
              count: '$count',
              unit_price: '$unit_price',
              protein_category: '$_id.protein_category',
            },
          },
        },
      },
      {
        $unwind: '$countsByDate',
      },
      {
        $project: {
          _id: 0,
          'Dish Name': '$_id.dish_name',
          'Meal Category': '$_id.meal_category',
          Date: '$countsByDate.date',
          'Diet Type': '$countsByDate.protein_category',
          Variant: '$countsByDate.variants',
          Size: '$countsByDate.size',
          Price: '$countsByDate.price',
          Count: '$countsByDate.count',
          'Unit Price': '$countsByDate.unit_price',
        },
      },
      {
        $sort: {
          Date: 1,
          'Dish Name': 1,
          Size: 1,
        },
      },
    ]);
  }

  async createStyledHeaderRow(worksheet, headers, fillColor = 'FFAEE0E5') {
    const headerRow = worksheet.addRow(headers);

    // Apply styles to header row
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: fillColor },
      };
      cell.font = { bold: true };
      // cell.border = {
      //   top: { style: 'thin' },
      //   left: { style: 'thin' },
      //   bottom: { style: 'thin' },
      //   right: { style: 'thin' },
      // };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    return headerRow;
  }

  addAndStyleRow(
    worksheet,
    rowData,
    fontStyle = { italic: true },
    alignmentStyle = { horizontal: 'center' },
  ) {
    const row = worksheet.addRow(rowData);
    row.eachCell((cell) => {
      cell.font = fontStyle;
      cell.alignment = alignmentStyle;
    });
    return row;
  }

  addBoldRow(worksheet: any, rowData: any[]) {
    const row = worksheet.addRow(rowData);
    row.eachCell((cell: any) => {
      cell.font = { bold: true };
    });
    return row;
  }
  // async getSurveyReport(): Promise<any> {
  //   throw new BadRequestException('Sorry, this feature is not available yet.');

  //   try {
  //     const surveyData = await this.SurveyResponsesModel.aggregate([
  //       {
  //         $match: {
  //           survey_id: new mongoose.Types.ObjectId('67bf34da8dbf432e2fe0d518'),
  //         },
  //       },
  //       {
  //         $lookup: {
  //           from: 'customers',
  //           let: {
  //             localId: '$customer_id',
  //           },
  //           pipeline: [
  //             {
  //               $addFields: {
  //                 customerIdStr: {
  //                   $toString: '$_id',
  //                 },
  //               },
  //             },
  //             {
  //               $match: {
  //                 $expr: {
  //                   $eq: ['$customerIdStr', '$$localId'],
  //                 },
  //               },
  //             },
  //           ],
  //           as: 'customerData',
  //         },
  //       },
  //       {
  //         $unwind: {
  //           path: '$customerData',
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: '$customer_id',
  //           // 'Survey ID': { $first: '$survey_id' },
  //           'Survey Title': { $first: '$survey_title' },
  //           'Plan Type': { $first: '$plan_type' },
  //           'Customer Type': { $first: '$customer_type' },
  //           Reward: { $first: '$reward' },
  //           'Survey Completed': { $first: '$finalize' },
  //           'Survey Skip': { $first: '$skip' },
  //           'Created At': { $first: '$createdAt' },
  //           'Q1: Primary Goal': {
  //             $first: { $arrayElemAt: ['$answers.answer', 0] },
  //           },
  //           'Q2: Areas of Wellness': {
  //             $first: { $arrayElemAt: ['$answers.answer', 1] },
  //           },
  //           'Q3: Fitness Tracking': {
  //             $first: { $arrayElemAt: ['$answers.answer', 2] },
  //           },
  //           'Q4: Fitness Apps': {
  //             $first: { $arrayElemAt: ['$answers.answer', 3] },
  //           },
  //           'Q5: Interest in App': {
  //             $first: { $arrayElemAt: ['$answers.answer', 4] },
  //           },
  //           'Q6: Additional Features': {
  //             $first: { $arrayElemAt: ['$answers.answer', 5] },
  //           },
  //           'Q7: Challenges': {
  //             $first: { $arrayElemAt: ['$answers.answer', 6] },
  //           },
  //           'Q8: Likely to Use Service': {
  //             $first: { $arrayElemAt: ['$answers.answer', 7] },
  //           },
  //           // 'Q9: Early Access Interest': {
  //           //   $first: { $arrayElemAt: ['$answers.answer', 8] },
  //           // },
  //           Email: {
  //             $first: '$customerData.email',
  //           },
  //           'WhatsApp Number': {
  //             $first: '$customerData.whatsapp_number',
  //           },
  //           'First Name': {
  //             $first: '$customerData.first_name',
  //           },
  //           'WhatsApp Country Code': {
  //             $first: '$customerData.whatsapp_country_code',
  //           },
  //         },
  //       },
  //     ]);
  //     console.log('================================', surveyData);
  //     // Create a new workbook and add a worksheet
  //     const workbook = new ExcelJS.Workbook();
  //     const worksheet = workbook.addWorksheet('Survey Report');

  //     if (surveyData.length > 0) {
  //       worksheet.addRow(Object.keys(surveyData[0])); // First row as headers
  //     }

  //     // Add data to the worksheet
  //     surveyData.forEach((data) => {
  //       worksheet.addRow(Object.values(data));
  //     });
  //     // Add rows
  //     // surveyData.forEach((data) => {
  //     //   worksheet.addRow(data);
  //     // });
  //     const buffer = await workbook.xlsx.writeBuffer();
  //     return buffer;
  //   } catch (error) {
  //     console.error('Error surveyResponseData report:', error);
  //     throw new Error('Failed surveyResponseData report.');
  //   }
  // }

  // async surveyResponseData(): Promise<any> {
  //   try {
  //     const surveyData = await this.SurveyResponsesModel.aggregate([
  //       {
  //         $match: {
  //           survey_id: new mongoose.Types.ObjectId('67bf34da8dbf432e2fe0d518'),
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: null,
  //           total: { $sum: 1 },
  //           skipped: {
  //             $sum: {
  //               $cond: [{ $eq: ['$skip', true] }, 1, 0],
  //             },
  //           },
  //           completed: {
  //             $sum: {
  //               $cond: [{ $eq: ['$finalize', true] }, 1, 0],
  //             },
  //           },
  //           answers: { $push: '$answers' },
  //         },
  //       },
  //       {
  //         $unwind: '$answers',
  //       },
  //       {
  //         $unwind: '$answers',
  //       },
  //       {
  //         $unwind: '$answers.answer', // Unwind each answer in the array
  //       },
  //       {
  //         $addFields: {
  //           question_number: {
  //             $switch: {
  //               branches: [
  //                 {
  //                   case: {
  //                     $eq: ['$answers.question_id', '6582da732958af7cfeee3001'],
  //                   },
  //                   then: 'Q1 - What is your primary goal for using Delicut?',
  //                 },
  //                 {
  //                   case: {
  //                     $eq: ['$answers.question_id', '6582da732958af7cfeee3002'],
  //                   },
  //                   then: 'Q2 - What areas of wellness do you actively focus on?',
  //                 },
  //                 {
  //                   case: {
  //                     $eq: ['$answers.question_id', '6582da732958af7cfeee3003'],
  //                   },
  //                   then: 'Q3 - How do you currently track your fitness and nutrition?',
  //                 },
  //                 {
  //                   case: {
  //                     $eq: ['$answers.question_id', '6582da732958af7cfeee3004'],
  //                   },
  //                   then: 'Q4 - Do you currently use any fitness / wellness apps?',
  //                 },
  //                 {
  //                   case: {
  //                     $eq: ['$answers.question_id', '6582da732958af7cfeee3005'],
  //                   },
  //                   then: 'Q5 - How interested are you in using a personalized wellness app?',
  //                 },
  //                 {
  //                   case: {
  //                     $eq: ['$answers.question_id', '6582da732958af7cfeee3006'],
  //                   },
  //                   then: 'Q6 - What additional features would you find valuable in a wellness app?',
  //                 },
  //                 {
  //                   case: {
  //                     $eq: ['$answers.question_id', '6582da732958af7cfeee3007'],
  //                   },
  //                   then: 'Q7 - What are the biggest challenges you face in maintaining a healthy lifestyle?',
  //                 },
  //                 {
  //                   case: {
  //                     $eq: ['$answers.question_id', '6582da732958af7cfeee3008'],
  //                   },
  //                   then: "Q8 - How likely are you to use Delicut's wellness solution?",
  //                 },
  //               ],
  //               default: 'Unknown Question',
  //             },
  //           },
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: {
  //             question: '$question_number',
  //             answer: '$answers.answer',
  //           },
  //           count: { $sum: 1 },
  //           total: { $first: '$total' },
  //           skipped: { $first: '$skipped' },
  //           completed: { $first: '$completed' },
  //         },
  //       },
  //       {
  //         $addFields: {
  //           percentage: {
  //             $round: [
  //               {
  //                 $multiply: [
  //                   { $divide: ['$count', '$completed'] }, // Divide count by completed
  //                   100,
  //                 ],
  //               },
  //               2, // Round to 2 decimal places
  //             ],
  //           },
  //         },
  //       },
  //       {
  //         $group: {
  //           _id: '$_id.question',
  //           answers: {
  //             $push: {
  //               answer: '$_id.answer',
  //               count: '$count',
  //               percentage: '$percentage',
  //             },
  //           },
  //           total: { $first: '$total' },
  //           skipped: { $first: '$skipped' },
  //           completed: { $first: '$completed' },
  //         },
  //       },
  //       {
  //         $project: {
  //           question_number: 1,
  //           question_text: '$_id',
  //           answers: 1,
  //           total: 1,
  //           skipped: 1,
  //           completed: 1,
  //         },
  //       },
  //     ]);
  //     // console.log('================================', surveyData);

  //     return surveyData;
  //   } catch (error) {
  //     console.error('Error surveyResponseData:', error);
  //     throw new Error('Failed surveyResponseData.');
  //   }
  // }
  async getSurveyReport(surveyId?: string) {
    try {
      // Use the provided surveyId or fallback to a default
      const targetSurveyId = surveyId
        ? new mongoose.Types.ObjectId(surveyId)
        : new mongoose.Types.ObjectId('67fd26e27f2b014dcfca556f');

      // OPTIMIZATION: Split the operation into multiple smaller queries instead of one large aggregation

      // 1. First, fetch just the IDs and answers structure (minimal data)
      const surveyResponses = await this.SurveyResponsesModel.find(
        {
          survey_id: targetSurveyId,
          'answers.0': { $exists: true },
        },
        {
          customer_id: 1,
          plan_type: 1,
          reward: 1,
          finalize: 1,
          skip: 1,
          answers: 1,
          survey_title: 1,
        },
      ).lean();

      if (!surveyResponses || surveyResponses.length === 0) {
        throw new Error(
          'No survey responses found for the specified survey ID',
        );
      }

      // Extract survey title for the filename (using the first response's title)
      const surveyTitle = surveyResponses[0]?.survey_title || 'Survey Report';

      // Create a safe filename by removing invalid characters
      const safeFileName =
        surveyTitle
          .replace(/[\\/:*?"<>|]/g, '') // Remove invalid filename characters
          .trim() || 'Survey Report';

      // Create the final filename with suffix
      const finalFileName = `${safeFileName}_survey_report`;

      // 2. Extract unique customer IDs to fetch in batch
      const customerIds = [
        ...new Set(surveyResponses.map((r) => r.customer_id)),
      ];

      // 3. Fetch all customer data in one query
      const customersData = await this.CustomersModel.find(
        {
          _id: {
            $in: customerIds.map((id) => new mongoose.Types.ObjectId(id)),
          },
        },
        {
          _id: 1,
          first_name: 1,
          last_name: 1,
          country_code: 1,
          phone_number: 1,
          whatsapp_country_code: 1,
          whatsapp_number: 1,
          email: 1,
        },
      ).lean();

      // 4. Create a fast lookup map for customers
      const customerMap = new Map();
      for (const customer of customersData) {
        customerMap.set(customer._id.toString(), customer);
      }

      // OPTIMIZATION: Handle question structure determination

      // Find response with most answers for structure
      let maxAnswersLength = 0;
      let mostCompleteResponse = null;

      for (const response of surveyResponses) {
        const answersLength = response.answers?.length || 0;
        if (answersLength > maxAnswersLength) {
          maxAnswersLength = answersLength;
          mostCompleteResponse = response;
        }
      }

      // Early optimization: If we have no answers to process, return an empty Excel file
      if (
        !mostCompleteResponse ||
        !mostCompleteResponse.answers ||
        mostCompleteResponse.answers.length === 0
      ) {
        // Create minimal Excel file
        const workbook = new ExcelJS.Workbook();
        workbook.addWorksheet(safeFileName);
        const buffer = await workbook.xlsx.writeBuffer();
        return { buffer, filename: finalFileName };
      }

      // Define static base fields
      const baseFields = [
        'Name',
        'Plan Type',
        'Contact',
        'WhatsApp',
        'Email',
        'Reward',
        'Survey Completed',
        'Survey Skip',
      ];

      // Build question map efficiently
      const orderedQuestionMap = new Map();
      const questions = mostCompleteResponse.answers;

      for (let i = 0; i < questions.length; i++) {
        const answer = questions[i];
        const questionId = answer.question_id || '';
        // Only process the question text if we haven't seen this ID before
        if (questionId && !orderedQuestionMap.has(questionId)) {
          const questionText = answer.question || '';
          const cleanQuestion = questionText.includes('?')
            ? questionText.substring(0, questionText.indexOf('?')).trim()
            : questionText.trim();

          orderedQuestionMap.set(questionId, {
            position: i,
            fieldName: `Q${i + 1}: ${cleanQuestion}`,
          });
        }
      }

      // Pre-calculate ordered question fields - avoid repeated conversions
      const orderedQuestionFields = Array.from(orderedQuestionMap.entries())
        .sort((a, b) => a[1].position - b[1].position)
        .map(([_, info]) => info.fieldName);

      // All column headers in correct order
      const headers = [...baseFields, ...orderedQuestionFields];

      // OPTIMIZATION: Stream-based Excel generation
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(safeFileName, {
        properties: { tabColor: { argb: '6699CC' } },
      });

      // Add headers
      worksheet.addRow(headers);

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6E6E6' },
      };

      // OPTIMIZATION: Process in smaller batches to avoid memory issues
      const BATCH_SIZE = 100; // Process 100 rows at a time

      for (let i = 0; i < surveyResponses.length; i += BATCH_SIZE) {
        const batch = surveyResponses.slice(i, i + BATCH_SIZE);

        for (const response of batch) {
          // Get customer data from map (much faster than linear search)
          const customer = customerMap.get(response.customer_id);

          // Prepare row data as array directly (avoid object creation)
          const rowData = [
            // Name
            customer
              ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
              : '',
            // Plan Type
            response.plan_type || '',
            // Contact
            customer
              ? `${customer.country_code || ''} ${customer.phone_number || ''}`.trim()
              : '',
            // WhatsApp
            customer
              ? `${customer.whatsapp_country_code || ''} ${customer.whatsapp_number || ''}`.trim()
              : '',
            // Email
            customer?.email || '',
            // Reward
            response.reward || 0,
            // Survey Completed
            response.finalize ? 'Yes' : 'No',
            // Survey Skip
            response.skip ? 'Yes' : 'No',
          ];

          // Create an answer lookup map
          const answersByQuestionId = new Map();

          if (response.answers && Array.isArray(response.answers)) {
            for (const answer of response.answers) {
              if (answer.question_id) {
                // Format answer
                const formattedAnswer = Array.isArray(answer.answer)
                  ? answer.answer.join('; ')
                  : answer.answer ?? '';
                answersByQuestionId.set(answer.question_id, formattedAnswer);
              }
            }
          }

          // Add question answers in the correct order
          for (const [questionId, questionInfo] of orderedQuestionMap) {
            rowData.push(answersByQuestionId.get(questionId) || '');
          }

          // Add the row to the worksheet
          worksheet.addRow(rowData);
        }
      }

      // OPTIMIZATION: Set column widths more efficiently
      // Just set reasonable defaults instead of calculating from content
      const DEFAULT_WIDTH = 15;
      const NAME_WIDTH = 20;
      const EMAIL_WIDTH = 25;
      const QUESTION_WIDTH = 30;

      worksheet.getColumn(1).width = NAME_WIDTH; // Name
      worksheet.getColumn(5).width = EMAIL_WIDTH; // Email

      // Give question columns more space
      for (let i = baseFields.length + 1; i <= headers.length; i++) {
        worksheet.getColumn(i).width = QUESTION_WIDTH;
      }

      // Set default width for remaining columns
      for (let i = 2; i <= baseFields.length; i++) {
        if (i !== 5) {
          // Skip email which we already set
          worksheet.getColumn(i).width = DEFAULT_WIDTH;
        }
      }

      // OPTIMIZATION: Generate Excel with minimal formatting
      const buffer = await workbook.xlsx.writeBuffer({
        useStyles: true,
        useSharedStrings: false, // Disable shared strings for performance
        zip: {
          compression: 'DEFLATE',
          compressionOptions: { level: 1 }, // Minimal compression for speed
        },
      });

      return { buffer, filename: finalFileName };
    } catch (error) {
      console.error('Error generating survey Excel report:', error);
      throw new Error(
        `Failed to generate survey Excel report: ${error.message}`,
      );
    }
  }
  async surveyList(): Promise<any> {
    try {
      const surveyList = await this.SurveysModel.find({})
        .select('-questions -description')
        .lean();
      return surveyList;
    } catch (error) {
      console.error('Error fetching survey list:', error);
      throw new Error('Failed to fetch survey list.');
    }
  }
  async surveyResponseData(
    surveyId: string = '67fd26e27f2b014dcfca556f',
  ): Promise<any> {
    try {
      // surveyId = '67fd26e27f2b014dcfca556f';
      // First, get the survey structure to map question IDs to their texts and types
      const survey = await this.SurveysModel.findById(surveyId);

      if (!survey) {
        return {
          message: 'Survey not found',
          data: [],
          status: false,
        };
      }

      // Create mapping objects for question metadata
      const questionMap = {};
      const questionTypeMap = {};
      const questionOrderMap = {};

      survey.questions.forEach((q: any, index) => {
        // Add null check for question_code property
        const questionNumber = q.question_code
          ? q.question_code.replace('q', 'Q')
          : `Q${index + 1}`;
        const displayText = `${questionNumber} - ${q.text}`;

        questionMap[q._id.toString()] = displayText;
        questionTypeMap[q._id.toString()] = q.type;
        questionOrderMap[q._id.toString()] = index + 1;
      });

      // Get the basic metrics first
      const metrics = await this.SurveyResponsesModel.aggregate([
        {
          $match: {
            survey_id: new mongoose.Types.ObjectId(surveyId),
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            skipped: {
              $sum: {
                $cond: [{ $eq: ['$skip', true] }, 1, 0],
              },
            },
            completed: {
              $sum: {
                $cond: [{ $eq: ['$finalize', true] }, 1, 0],
              },
            },
          },
        },
      ]);

      const totalMetrics =
        metrics.length > 0
          ? metrics[0]
          : { total: 0, skipped: 0, completed: 0 };

      console.log(`Total metrics: ${JSON.stringify(totalMetrics)}`);

      // Get all responses
      const responses = await this.SurveyResponsesModel.find({
        survey_id: new mongoose.Types.ObjectId(surveyId),
        finalize: true,
      }).lean();

      console.log(`Found ${responses.length} finalized responses`);

      // Process the responses manually instead of using $function
      const questionAnswers = {};
      const questionTotalAnswers = {}; // Track total non-null answers per question
      const rawAnswerData = {}; // For debugging

      // Initialize question answer mapping
      Object.keys(questionMap).forEach((qId) => {
        questionAnswers[questionMap[qId]] = [];
        questionTotalAnswers[questionMap[qId]] = 0;
        rawAnswerData[questionMap[qId]] = [];
      });

      // Helper function to normalize answers for better comparison
      const normalizeAnswer = (answer) => {
        if (answer === null || answer === undefined) return null;

        // Convert to string and trim whitespace
        return String(answer).trim();
      };

      // Helper function to add answers to the mapping
      function addAnswer(questionText, rawAnswer) {
        if (!questionAnswers[questionText]) {
          questionAnswers[questionText] = [];
        }

        // Store raw answer for debugging
        rawAnswerData[questionText].push(rawAnswer);

        // Normalize answer for comparison
        const normalizedAnswer = normalizeAnswer(rawAnswer);

        // Skip null/undefined answers
        if (normalizedAnswer === null) return;

        // Check for existing answers case-insensitively
        const existingAnswer = questionAnswers[questionText].find(
          (a) =>
            normalizeAnswer(a.answer).toLowerCase() ===
            normalizedAnswer.toLowerCase(),
        );

        if (existingAnswer) {
          existingAnswer.count += 1;
        } else {
          questionAnswers[questionText].push({
            answer: rawAnswer, // Keep original form for display
            count: 1,
          });
        }
      }

      // Process each response
      responses.forEach((response, index) => {
        if (response.answers && Array.isArray(response.answers)) {
          response.answers.forEach((answerObj) => {
            const questionId = answerObj.question_id.toString();
            const questionText =
              questionMap[questionId] || `Unknown Question (${questionId})`;

            if (Array.isArray(answerObj.answer)) {
              // Handle array of answers
              answerObj.answer.forEach((ans) => {
                if (ans !== null && ans !== undefined) {
                  addAnswer(questionText, ans);
                  questionTotalAnswers[questionText]++;
                }
              });
            } else if (
              answerObj.answer !== undefined &&
              answerObj.answer !== null
            ) {
              // Handle non-null single answer
              addAnswer(questionText, answerObj.answer);
              questionTotalAnswers[questionText]++;
            }
            // Ignore null answers entirely
          });
        }
      });

      // Debug logging for any specific answers you're troubleshooting
      Object.keys(rawAnswerData).forEach((questionText) => {
        if (questionText.toLowerCase().includes('grocery')) {
          console.log(`Raw answers for "${questionText}":`);
          console.log(rawAnswerData[questionText]);

          // Count occurrences of specific answers
          const personalizedCount = rawAnswerData[questionText].filter((ans) =>
            String(ans).toLowerCase().includes('personalized grocery lists'),
          ).length;
          console.log(
            `Direct count of "Personalized grocery lists": ${personalizedCount}`,
          );
        }
      });

      // Calculate percentages and format the final result
      const surveyData = Object.keys(questionAnswers).map((questionText) => {
        const answers = questionAnswers[questionText];
        const totalValidAnswers = questionTotalAnswers[questionText];

        // Calculate percentages based ONLY on the sum of non-null answers
        answers.forEach((ans) => {
          ans.percentage =
            totalValidAnswers > 0
              ? Math.round((ans.count / totalValidAnswers) * 100 * 100) / 100
              : 0;
        });

        // Sort by count in descending order
        answers.sort((a, b) => b.count - a.count);

        // Create the question data object with only non-null answers
        return {
          _id: questionText,
          question_text: questionText,
          answers: answers,
          total: totalMetrics.total,
          skipped: totalMetrics.skipped,
          completed: totalMetrics.completed,
        };
      });

      // Handle text responses specially
      const textQuestionIds = survey.questions
        .filter((q) => q.type === 'Text')
        .map((q: any) => q._id.toString());

      // For each text question, get the actual text responses
      for (const textQuestionId of textQuestionIds) {
        const questionText = questionMap[textQuestionId];
        const textQuestion: any = surveyData.find(
          (q) => q.question_text === questionText,
        );

        if (textQuestion) {
          const textResponses = await this.SurveyResponsesModel.aggregate([
            {
              $match: {
                survey_id: new mongoose.Types.ObjectId(surveyId),
                'answers.question_id': textQuestionId,
                finalize: true,
              },
            },
            {
              $unwind: '$answers',
            },
            {
              $match: {
                'answers.question_id': textQuestionId,
                'answers.answer': { $ne: null }, // Exclude null answers in aggregate
              },
            },
            {
              $project: {
                _id: 0,
                text_response: '$answers.answer',
              },
            },
          ]);

          textQuestion.text_responses = textResponses.map(
            (r) => r.text_response,
          );
        }
      }

      // Final check for any problematic answers
      surveyData.forEach((question) => {
        if (question.question_text.toLowerCase().includes('grocery')) {
          console.log(
            `Final count for answers to "${question.question_text}":`,
          );
          question.answers.forEach((ans) => {
            console.log(`- ${ans.answer}: ${ans.count} (${ans.percentage}%)`);
          });
        }
      });

      return surveyData;
    } catch (error) {
      console.error('Error getting survey responses:', error);
      throw new Error('Failed to fetch survey details.');
    }
  }

  //   Dimension - date, coupon, customer type
  // Metrics: orders, new order. Repeat orders, new net gmv, repeat net gmv, cancellation
  // Its important to pass cancellations as im afraid affiliate abuse our offering, place order then cancel

  async arabyAdsData(
    arabyAdsDto: ArabyAdsDto,
    campaign_name?: string,
  ): Promise<any> {
    try {
      console.log('araby ads data', arabyAdsDto);
      const {
        page = 1,
        limit = 10,
        start_date,
        end_date,
        search = '',
        churn_days = 30,
      } = arabyAdsDto;
      let couponData = await this.CouponModel.find(
        // {
        //   $or: [
        //     { name: campaignName },
        //     { agency_name: campaignName },
        //   ],
        // },
        { company: campaign_name },
        {
          _id: 1,
        },
      );
      couponData = couponData?.map((couponItm) => couponItm?._id);
      const orderData = await this.OrderModel.aggregate([
        {
          $match: {
            order_status: { $in: ['Completed', 'Partially_Cancelled'] },
            coupon_id: { $in: couponData },
            createdAt: {
              $gte: moment(start_date).startOf('day').toDate(),
              $lte: moment(end_date).endOf('day').toDate(),
            },
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
        { $unwind: '$couponData' },
        {
          $match: {
            'couponData.coupon_code': { $regex: search, $options: 'i' },
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
        { $unwind: { path: '$addressData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'orders',
            let: {
              customerId: '$customer_id',
              currentOrderDate: '$createdAt',
              currentOrderId: '$_id',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$customer_id', '$$customerId'] },
                      { $lt: ['$createdAt', '$$currentOrderDate'] },
                      { $ne: ['$_id', '$$currentOrderId'] },
                      { $eq: ['$order_status', 'Completed'] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: 'lastOrderBefore',
          },
        },
        {
          $addFields: {
            lastOrderDate: {
              $ifNull: [
                { $arrayElemAt: ['$lastOrderBefore.createdAt', 0] },
                null,
              ],
            },
          },
        },
        {
          $addFields: {
            daysSinceLastOrder: {
              $cond: [
                { $ne: ['$lastOrderDate', null] },
                {
                  $floor: {
                    $divide: [
                      { $subtract: ['$createdAt', '$lastOrderDate'] },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                },
                null,
              ],
            },
          },
        },
        {
          $addFields: {
            user_status: {
              $switch: {
                branches: [
                  { case: { $eq: ['$lastOrderDate', null] }, then: 'New' },
                  {
                    case: { $gt: ['$daysSinceLastOrder', churn_days] },
                    then: 'Churned',
                  },
                ],
                default: 'Active',
              },
            },
          },
        },
        {
          $facet: {
            data: [
              {
                $project: {
                  _id: 0,
                  // customer_id: 1,
                  coupon: '$couponData.coupon_code',
                  created_at: {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$createdAt',
                      timezone: 'Asia/Dubai',
                    },
                  },
                  order_id: '$order_number',
                  'Customer type': '$type_of_order',
                  amount: {
                    $round: [
                      {
                        $subtract: [
                          {
                            $subtract: [
                              '$final_order_total',
                              '$order_vat_value',
                            ],
                          },
                          '$refundable_deposite',
                        ],
                      },
                      2,
                    ],
                  },
                  country: {
                    $cond: [
                      { $eq: ['$addressData.country', 'United Arab Emirates'] },
                      'UAE',
                      '$addressData.country',
                    ],
                  },
                  currency: 'AED',
                  'Previous Order Date': {
                    $dateToString: {
                      format: '%Y-%m-%d',
                      date: '$lastOrderDate',
                      timezone: 'Asia/Dubai',
                    },
                  },
                  'Days Since Last Order': '$daysSinceLastOrder',
                  'Customer Status': '$user_status',
                  plan_type: {
                    $switch: {
                      branches: [
                        {
                          case: {
                            $gt: [
                              {
                                $size: {
                                  $filter: {
                                    input: '$order_item',
                                    as: 'item',
                                    cond: {
                                      $in: [
                                        '$$item.plan_duration_in_days',
                                        [5, 6, '5', '6'],
                                      ],
                                    },
                                  },
                                },
                              },
                              0,
                            ],
                          },
                          then: 'weekly',
                        },
                        {
                          case: {
                            $gt: [
                              {
                                $size: {
                                  $filter: {
                                    input: '$order_item',
                                    as: 'item',
                                    cond: {
                                      $in: [
                                        '$$item.plan_duration_in_days',
                                        [20, 24, '20', '24'],
                                      ],
                                    },
                                  },
                                },
                              },
                              0,
                            ],
                          },
                          then: 'monthly',
                        },
                        {
                          case: {
                            $gt: [
                              {
                                $size: {
                                  $filter: {
                                    input: '$order_item',
                                    as: 'item',
                                    cond: {
                                      $in: [
                                        '$$item.plan_duration_in_days',
                                        [60, 72, '60', '72'],
                                      ],
                                    },
                                  },
                                },
                              },
                              0,
                            ],
                          },
                          then: '3_month',
                        },
                      ],
                      default: 'unknown',
                    },
                  },
                  status: '$order_status',
                },
              },
              { $skip: (page - 1) * limit },
              { $limit: limit },
            ],
            count: [{ $count: 'count' }],
            total: [
              {
                $group: {
                  _id: null,
                  totalAmount: {
                    $sum: {
                      $subtract: [
                        {
                          $subtract: ['$final_order_total', '$order_vat_value'],
                        },
                        '$refundable_deposite',
                      ],
                    },
                  },
                },
              },
              {
                $project: {
                  _id: 0,
                  totalAmount: { $round: ['$totalAmount', 2] },
                },
              },
            ],
          },
        },
      ]);

      console.log('orders Data===>', orderData?.[0]?.total?.[0]?.totalAmount);
      return {
        data: orderData?.[0]?.data,
        page: page,
        total: orderData?.[0]?.count?.[0]?.count,
        grand_total: orderData?.[0]?.total?.[0]?.totalAmount,
      };
    } catch (error) {
      console.error('Error getting arabyads responses:', error);
      throw new Error('Failed to fetch arabyads details.');
    }
  }

  async getArabyAdsReportCsv(
    arabyAdsCsvDto: ArabyAdsCSVDto,
    campaign_name?: string,
  ) {
    try {
      const { churn_days = 30 } = arabyAdsCsvDto;
      const couponData = await this.CouponModel.find(
        {
          // $or: [
          //   { name: campaignName },
          //   { agency_name: campaignName },
          // ],
          company: campaign_name,
        },
        { _id: 1 },
      ).lean();

      const orderData = await this.OrderModel.aggregate([
        {
          $match: {
            order_status: { $in: ['Completed', 'Partially_Cancelled'] },
            coupon_id: { $in: couponData.map((c) => c._id) },
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
        { $unwind: '$couponData' },
        {
          $lookup: {
            from: 'addresses',
            localField: 'address_id',
            foreignField: '_id',
            as: 'addressData',
          },
        },
        { $unwind: { path: '$addressData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'orders',
            let: {
              customerId: '$customer_id',
              currentOrderDate: '$createdAt',
              currentOrderId: '$_id',
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$customer_id', '$$customerId'] },
                      { $lt: ['$createdAt', '$$currentOrderDate'] },
                      { $ne: ['$_id', '$$currentOrderId'] },
                      { $eq: ['$order_status', 'Completed'] },
                    ],
                  },
                },
              },
              { $sort: { createdAt: -1 } },
              { $limit: 1 },
            ],
            as: 'lastOrderBefore',
          },
        },
        {
          $addFields: {
            lastOrderDate: {
              $ifNull: [
                { $arrayElemAt: ['$lastOrderBefore.createdAt', 0] },
                null,
              ],
            },
          },
        },
        {
          $addFields: {
            daysSinceLastOrder: {
              $cond: [
                { $ne: ['$lastOrderDate', null] },
                {
                  $floor: {
                    $divide: [
                      { $subtract: ['$createdAt', '$lastOrderDate'] },
                      1000 * 60 * 60 * 24,
                    ],
                  },
                },
                null,
              ],
            },
          },
        },
        {
          $addFields: {
            user_status: {
              $switch: {
                branches: [
                  { case: { $eq: ['$lastOrderDate', null] }, then: 'New' },
                  {
                    case: { $gt: ['$daysSinceLastOrder', churn_days] },
                    then: 'Churned',
                  },
                ],
                default: 'Active',
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            coupon: '$couponData.coupon_code',
            created_at: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt',
                timezone: 'Asia/Dubai',
              },
            },
            order_id: '$order_number',
            'Customer type': '$type_of_order',
            amount: {
              $round: [
                {
                  $subtract: [
                    {
                      $subtract: ['$final_order_total', '$order_vat_value'],
                    },
                    '$refundable_deposite',
                  ],
                },
                2,
              ],
            },
            country: {
              $cond: [
                { $eq: ['$addressData.country', 'United Arab Emirates'] },
                'UAE',
                '$addressData.country',
              ],
            },
            currency: 'AED',
            'Previous Order Date': {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$lastOrderDate',
                timezone: 'Asia/Dubai',
              },
            },
            'Days Since Last Order': '$daysSinceLastOrder',
            'Customer Status': '$user_status',
            plan_type: {
              $switch: {
                branches: [
                  {
                    case: {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: '$order_item',
                              as: 'item',
                              cond: {
                                $in: [
                                  '$$item.plan_duration_in_days',
                                  ['5', '6', 5, 6],
                                ],
                              },
                            },
                          },
                        },
                        0,
                      ],
                    },
                    then: 'weekly',
                  },
                  {
                    case: {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: '$order_item',
                              as: 'item',
                              cond: {
                                $in: [
                                  '$$item.plan_duration_in_days',
                                  ['20', '24', 20, 24],
                                ],
                              },
                            },
                          },
                        },
                        0,
                      ],
                    },
                    then: 'monthly',
                  },
                  {
                    case: {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: '$order_item',
                              as: 'item',
                              cond: {
                                $in: [
                                  '$$item.plan_duration_in_days',
                                  ['60', '72', 60, 72],
                                ],
                              },
                            },
                          },
                        },
                        0,
                      ],
                    },
                    then: '3_month',
                  },
                ],
                default: 'unknown',
              },
            },
            status: '$order_status',
          },
        },
      ]);

      // Create Excel workbook and worksheet
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('ArabyAds');

      // Add headers
      worksheet.columns = Object.keys(orderData[0] || {}).map((key) => ({
        header: key,
        key,
      }));

      // Add rows
      orderData.forEach((order) => {
        worksheet.addRow(order);
      });

      // Generate buffer and filename
      const buffer = await workbook.xlsx.writeBuffer();
      const finalFileName = `araby-ads-report.xlsx`;

      return { buffer, filename: finalFileName };
    } catch (error) {
      console.error('Error generating survey Excel report:', error);
      throw new Error(
        `Failed to generate survey Excel report: ${error.message}`,
      );
    }
  }
}
