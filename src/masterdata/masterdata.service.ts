import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import { CreateMasterdatumDto } from './dto/create-masterdatum.dto';
import {
  CreateMasterdataCouponDto,
  UpdateMasterdataCouponDto,
} from './dto/create-single-masterdatum.dto';
import { UpdateMasterdatumDto } from './dto/update-masterdatum.dto';
import { MasterDataDocument } from './Schemas/masterdata.schema';
// import { v4 as uuidv4 } from 'uuid';
import { DeleteMasterdatumDto } from './dto/delete-masterdatum.dto';
import { AllergensDataDocument } from 'src/common/schema/allergens.schema';
import { CategoryDataDocument } from 'src/common/schema/category.schema';
import { CuisineDataDocument } from 'src/common/schema/cuisine.schema';
import { EthnicityDataDocument } from 'src/common/schema/ethnicity.schema';
import { IngredientDocument } from 'src/ingredient/schemas/ingredient.schema';
import { DishTypeDataDocument } from 'src/common/schema/dish_type.schema';
import { VariantDataDocument } from 'src/common/schema/variants.schema';
import { RMSHistoryService } from 'src/common/utils/helper';
import { Translate } from 'src/translation/schemas/translation.schema';

@Injectable()
export class MasterdataService {
  constructor(
    @InjectModel('MasterDataKMS')
    private readonly masterDataModel: Model<MasterDataDocument>,
    @InjectModel('Allergens')
    private readonly allergensModel: Model<AllergensDataDocument>,
    @InjectModel('Cuisines')
    private readonly cuisineModel: Model<CuisineDataDocument>,
    @InjectModel('Dishtypes')
    private readonly dishtypeModel: Model<DishTypeDataDocument>,
    @InjectModel('Categories')
    private readonly categoriesModel: Model<CategoryDataDocument>,
    @InjectModel('Variants')
    private readonly variantModel: Model<VariantDataDocument>,
    @InjectModel('Ingredient')
    private readonly ingredientModel: Model<IngredientDocument>,
    @InjectModel('Ethnicity')
    private readonly ethnicityModel: Model<EthnicityDataDocument>,
    private readonly rmsHistoryService: RMSHistoryService,
    @InjectModel('translations')
    private translationModel: Model<Translate>,
    private readonly httpService: HttpService,
  ) {}

  private get platformApiBaseUrl(): string {
    return (process.env.BACKEND_API_URL || '').trim().replace(/\/$/, '');
  }
  async createCoupon(dto: CreateMasterdataCouponDto) {
    try {
      // Transform flat DTO to nested value format
      const value = {
        discountCode: dto.discountCode,
        is_default: dto.is_default ?? false,
        type_of_customer: dto.type_of_customer,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        colors: dto.colors,
        offerScreen: dto.offerScreen,
        thankYouScreen: dto.thankYouScreen,
        channel: dto.channel,
        campaignName: dto.campaignName,
        campaignId: dto.campaignId,
        category: dto.category,
      };

      await this.validateCoupon(value);
      const data = await this.masterDataModel.create({
        key: 'coupons',
        label: 'Coupons',
        is_active: true,
        value: value,
      });
      return { data, message: 'Coupon created successfully!', status: true };
    } catch (err) {
      throw err;
    }
  }

  private async validateCoupon(value: Record<string, any>) {
    if (!value) {
      throw new HttpException(
        { message: 'value is required!', status: false },
        HttpStatus.BAD_REQUEST,
      );
    }
    const { is_default, startDate, endDate, type_of_customer } = value;

    // 1. Only one is_default: true allowed per type_of_customer
    if (is_default) {
      const defaultExists = await this.masterDataModel.findOne({
        key: 'coupons',
        'value.is_default': true,
        'value.type_of_customer': type_of_customer,
        is_active: true,
      });
      if (defaultExists) {
        throw new HttpException(
          {
            message: `A default coupon already exists for ${type_of_customer} customers!`,
            status: false,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      return; // No date validation needed for default coupon
    }

    // 2. Non-default coupons require startDate and endDate
    if (!startDate || !endDate) {
      throw new HttpException(
        {
          message:
            'startDate and endDate are required for non-default coupons!',
          status: false,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);

    if (newStart > newEnd) {
      throw new HttpException(
        { message: 'startDate cannot be after endDate!', status: false },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async listCoupons(
    page: number = 1,
    limit: number = 10,
    search?: string,
    type_of_customer?: string,
  ) {
    try {
      // Validate pagination params
      const pageNum = Math.max(1, page);
      const limitNum = Math.max(1, Math.min(100, limit)); // Max 100 per page
      const skip = (pageNum - 1) * limitNum;

      // Build filters
      const filters: any = { key: 'coupons', is_active: true };
      if (search) {
        filters['value.discountCode'] = { $regex: search, $options: 'i' };
      }
      if (type_of_customer) {
        filters['value.type_of_customer'] = type_of_customer;
      }

      // Get total count
      const total = await this.masterDataModel.countDocuments(filters);

      // Get paginated coupons
      const coupons = await this.masterDataModel
        .find(filters)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum);

      // Fully flatten: no nested objects
      const data = coupons.map((coupon: any) => ({
        _id: coupon._id,
        discountCode: coupon.value?.discountCode,
        is_default: coupon.value?.is_default,
        type_of_customer: coupon.value?.type_of_customer,
        startDate: coupon.value?.startDate,
        endDate: coupon.value?.endDate,
        // colors
        cardBackground: coupon.value?.colors?.cardBackground,
        closeBtnBackground: coupon.value?.colors?.closeBtnBackground,
        thankYouCardBackground: coupon.value?.colors?.thankYouCardBackground,
        // offerScreen
        offerSubtitle: coupon.value?.offerScreen?.subtitle,
        discountText: coupon.value?.offerScreen?.discountText,
        renewalText: coupon.value?.offerScreen?.renewalText,
        minimumText: coupon.value?.offerScreen?.minimumText,
        buttonText: coupon.value?.offerScreen?.buttonText,
        headerTextWeb: coupon.value?.offerScreen?.headerTextWeb,
        discountWeb: coupon.value?.offerScreen?.discountWeb,
        footerTextWeb: coupon.value?.offerScreen?.footerTextWeb,
        subTextWeb: coupon.value?.offerScreen?.subTextWeb,
        offerTypeTextWeb: coupon.value?.offerScreen?.offerTypeTextWeb,
        // thankYouScreen
        thankYouTitle: coupon.value?.thankYouScreen?.title,
        thankYouSubtitle: coupon.value?.thankYouScreen?.subtitle,
        channel: coupon.value?.channel,
        campaignName: coupon.value?.campaignName,
        campaignId: coupon.value?.campaignId,
        category: coupon.value?.category,
        createdAt: coupon.createdAt,
        updatedAt: coupon.updatedAt,
      }));

      const totalPages = Math.ceil(total / limitNum);

      return {
        data,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        message: 'Coupons fetched successfully!',
        status: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async getCouponById(id: string) {
    try {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new HttpException(
          { message: 'Invalid coupon ID format!', status: false },
          HttpStatus.BAD_REQUEST,
        );
      }

      const coupon = await this.masterDataModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        key: 'coupons',
        is_active: true,
      });

      if (!coupon) {
        throw new HttpException(
          { message: 'Coupon not found!', status: false },
          HttpStatus.NOT_FOUND,
        );
      }

      // Return in flat format (same as create/update expects)
      const couponValue = coupon.value as any;
      const couponDoc = coupon as any;
      const data = {
        _id: coupon._id,
        discountCode: couponValue?.discountCode,
        is_default: couponValue?.is_default ?? false,
        type_of_customer: couponValue?.type_of_customer,
        startDate: couponValue?.startDate,
        endDate: couponValue?.endDate,
        colors: {
          cardBackground: couponValue?.colors?.cardBackground,
          closeBtnBackground: couponValue?.colors?.closeBtnBackground,
          thankYouCardBackground: couponValue?.colors?.thankYouCardBackground,
        },
        offerScreen: {
          subtitle: couponValue?.offerScreen?.subtitle,
          discountText: couponValue?.offerScreen?.discountText,
          renewalText: couponValue?.offerScreen?.renewalText,
          minimumText: couponValue?.offerScreen?.minimumText,
          buttonText: couponValue?.offerScreen?.buttonText,
          headerTextWeb: couponValue?.offerScreen?.headerTextWeb,
          discountWeb: couponValue?.offerScreen?.discountWeb,
          footerTextWeb: couponValue?.offerScreen?.footerTextWeb,
          subTextWeb: couponValue?.offerScreen?.subTextWeb,
          offerTypeTextWeb: couponValue?.offerScreen?.offerTypeTextWeb,
        },
        thankYouScreen: {
          title: couponValue?.thankYouScreen?.title,
          subtitle: couponValue?.thankYouScreen?.subtitle,
        },
        channel: couponValue?.channel,
        campaignName: couponValue?.campaignName,
        campaignId: couponValue?.campaignId,
        category: couponValue?.category,
        createdAt: couponDoc?.createdAt,
        updatedAt: couponDoc?.updatedAt,
      };

      return { data, message: 'Coupon fetched successfully!', status: true };
    } catch (err) {
      throw err;
    }
  }

  async updateCoupon(id: string, dto: UpdateMasterdataCouponDto) {
    try {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new HttpException(
          { message: 'Invalid coupon ID format!', status: false },
          HttpStatus.BAD_REQUEST,
        );
      }

      const coupon = await this.masterDataModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        key: 'coupons',
        is_active: true,
      });

      if (!coupon) {
        throw new HttpException(
          { message: 'Coupon not found!', status: false },
          HttpStatus.NOT_FOUND,
        );
      }

      // Transform flat DTO to nested value format and merge with existing
      const updateValue: any = {
        discountCode: dto.discountCode,
        type_of_customer: dto.type_of_customer,
        colors: dto.colors,
        offerScreen: dto.offerScreen,
        thankYouScreen: dto.thankYouScreen,
      };

      // Optional fields
      if (dto.channel !== undefined) updateValue.channel = dto.channel;
      if (dto.campaignName !== undefined)
        updateValue.campaignName = dto.campaignName;
      if (dto.campaignId !== undefined) updateValue.campaignId = dto.campaignId;
      if (dto.category !== undefined) updateValue.category = dto.category;
      if (dto.is_default !== undefined) updateValue.is_default = dto.is_default;
      if (dto.startDate !== undefined)
        updateValue.startDate = dto.startDate
          ? new Date(dto.startDate)
          : undefined;
      if (dto.endDate !== undefined)
        updateValue.endDate = dto.endDate ? new Date(dto.endDate) : undefined;

      // Merge with existing value (preserve optional fields if not provided)
      const updatedValue = {
        ...coupon.value,
        ...updateValue,
        // Preserve existing optional fields if not in update, default is_default to false
        is_default:
          updateValue.is_default ?? coupon.value['is_default'] ?? false,
        startDate: updateValue.startDate ?? coupon.value['startDate'],
        endDate: updateValue.endDate ?? coupon.value['endDate'],
      };

      // Validate updated coupon
      await this.validateCouponUpdate(id, updatedValue);

      const data = await this.masterDataModel.findByIdAndUpdate(
        new mongoose.Types.ObjectId(id),
        { value: updatedValue },
        { new: true },
      );

      return { data, message: 'Coupon updated successfully!', status: true };
    } catch (err) {
      throw err;
    }
  }

  async deleteCoupon(id: string) {
    try {
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new HttpException(
          { message: 'Invalid coupon ID format!', status: false },
          HttpStatus.BAD_REQUEST,
        );
      }

      const coupon = await this.masterDataModel.findOne({
        _id: new mongoose.Types.ObjectId(id),
        key: 'coupons',
        is_active: true,
      });

      if (!coupon) {
        throw new HttpException(
          { message: 'Coupon not found!', status: false },
          HttpStatus.NOT_FOUND,
        );
      }

      // Soft delete: set is_active to false
      await this.masterDataModel.findByIdAndUpdate(
        new mongoose.Types.ObjectId(id),
        { is_active: false },
        { new: true },
      );

      return {
        data: {},
        message: 'Coupon deleted successfully!',
        status: true,
      };
    } catch (err) {
      throw err;
    }
  }

  private async validateCouponUpdate(
    couponId: string,
    value: Record<string, any>,
  ) {
    const { is_default, startDate, endDate, type_of_customer } = value;

    // 1. Check is_default conflict per type_of_customer (exclude current coupon)
    if (is_default) {
      const defaultExists = await this.masterDataModel.findOne({
        _id: { $ne: couponId },
        key: 'coupons',
        'value.is_default': true,
        'value.type_of_customer': type_of_customer,
        is_active: true,
      });
      if (defaultExists) {
        throw new HttpException(
          {
            message: `A default coupon already exists for ${type_of_customer} customers!`,
            status: false,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      return;
    }

    // 2. Non-default coupons require startDate and endDate
    if (!startDate || !endDate) {
      throw new HttpException(
        {
          message:
            'startDate and endDate are required for non-default coupons!',
          status: false,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);

    if (newStart > newEnd) {
      throw new HttpException(
        { message: 'startDate cannot be after endDate!', status: false },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async create(createMasterdatumDto: CreateMasterdatumDto) {
    try {
      const documents = [];
      console.log({ createMasterdatumDto });
      if (
        createMasterdatumDto?.key == 'allergens' ||
        createMasterdatumDto?.key == 'cuisine' ||
        createMasterdatumDto?.key == 'dish_type'
      ) {
        for (let i = 0; i < createMasterdatumDto?.value?.length; i++) {
          if (createMasterdatumDto?.value?.[i]?.name == undefined) {
            throw new HttpException(
              { message: 'Please pass the correct payload', status: false },
              HttpStatus.BAD_REQUEST,
            );
          }
          const documentPayload: any = { is_active: true };
          for (const keyData in createMasterdatumDto?.value?.[i]) {
            if (keyData == 'name') {
              let checkAlreadyExist;
              if (createMasterdatumDto?.key === 'allergens') {
                checkAlreadyExist = await this.allergensModel.findOne({
                  name: createMasterdatumDto?.value?.[i]?.[keyData],
                });
              } else if (createMasterdatumDto?.key == 'cuisine') {
                checkAlreadyExist = await this.cuisineModel.findOne({
                  name: createMasterdatumDto?.value?.[i]?.[keyData],
                });
              } else if (createMasterdatumDto?.key == 'dish_type') {
                checkAlreadyExist = await this.dishtypeModel.findOne({
                  name: createMasterdatumDto?.value?.[i]?.[keyData],
                });
              }
              if (checkAlreadyExist) {
                throw new HttpException(
                  {
                    message: `${createMasterdatumDto?.key?.toUpperCase()} Already Exist!`,
                    status: false,
                  },
                  HttpStatus.BAD_REQUEST,
                );
              }
            }
            documentPayload[keyData] =
              createMasterdatumDto?.value?.[i]?.[keyData];
          }
          documents.push(documentPayload);
        }

        const insertOperations = documents?.map((doc) => ({
          insertOne: {
            document: doc,
          },
        }));

        let insertedData = null;
        if (createMasterdatumDto?.key === 'allergens') {
          insertedData = await this.allergensModel.bulkWrite(insertOperations);
        } else if (createMasterdatumDto?.key == 'cuisine') {
          insertedData = await this.cuisineModel.bulkWrite(insertOperations);
        } else if (createMasterdatumDto?.key == 'dish_type') {
          insertedData = await this.dishtypeModel.bulkWrite(insertOperations);
        }

        return {
          data: insertedData,
          message: `${createMasterdatumDto?.key?.toUpperCase()} MasterData Inserted Successfully!`,
          status: true,
        };
      }

      for (let i = 0; i < createMasterdatumDto?.value?.length; i++) {
        const itm = createMasterdatumDto.value[i];

        // Validation for is_vegetarian and is_non_vegetarian
        if (createMasterdatumDto?.key == 'ingredient_category') {
          if (itm?.is_vegetarian && itm?.is_non_vegetarian) {
            throw new HttpException(
              {
                message:
                  'Only one of is_vegetarian or is_non_vegetarian can be true.',
                status: false,
              },
              HttpStatus.BAD_REQUEST,
            );
          }
        }
        const checkAlreadyExist = await this.masterDataModel.findOne({
          key: createMasterdatumDto?.key,
          'value.value': itm?.value,
        });
        if (checkAlreadyExist) {
          throw new HttpException(
            {
              message: `${createMasterdatumDto?.label?.toUpperCase()} Already Exist!`,
              status: false,
            },
            HttpStatus.BAD_REQUEST,
          );
        }

        documents.push({
          key: createMasterdatumDto?.key,
          label: createMasterdatumDto?.label,
          is_active: true,
          value: itm,
        });
        if (createMasterdatumDto?.key === 'meal_category') {
          const existingTranslation = await this.translationModel.findOne({
            key: createMasterdatumDto?.value[0]?.value,
            data: createMasterdatumDto?.value[0]?.value,
            language: 'en',
            is_not_translation_data: true,
          });
          if (!existingTranslation) {
            // Handle additional translations
            if (createMasterdatumDto.key_translations) {
              for (const translation of createMasterdatumDto.key_translations) {
                console.log({
                  key: createMasterdatumDto.value[0],
                  data: translation.data,
                  language: translation.language,
                  is_not_translation_data: true,
                });
                await this.translationModel.create({
                  key: createMasterdatumDto.value[0]?.value,
                  data: translation.data,
                  language: translation.language,
                  is_not_translation_data: true,
                });
                // }
              }
            }
          }
        }
      }

      const insertOperations = documents?.map((doc) => ({
        insertOne: {
          document: doc,
        },
      }));

      const insertedData =
        await this.masterDataModel.bulkWrite(insertOperations);

      return {
        data: insertedData,
        message: 'Master Data Inserted Successfully!',
        status: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async findAll(key?: string) {
    try {
      if (key) {
        const masterDataArray = [];

        let keyArray = key?.toString()?.split(',');
        keyArray = keyArray?.map((keys) => keys.trim());
        const otherMasterData = [
          { key: 'allergens', label: 'Allergens', model: 'allergensModel' },
          // {
          //   key: 'recipe_category',
          //   label: 'Recipe Category',
          //   model: 'categoriesModel',
          // },
          // { key: 'variants', label: 'Variants', model: 'variantModel' },
          { key: 'cuisine', label: 'Cuisine', model: 'cuisineModel' },
          { key: 'dish_type', label: 'Dish Type', model: 'dishtypeModel' },
        ];

        for (let i = 0; i < keyArray?.length; i++) {
          const indexOfKey = otherMasterData?.findIndex(
            (masterData) => masterData.key == keyArray[i],
          );
          if (indexOfKey == 0) {
            const allergensDataTemp = await this.allergensModel.find({
              is_active: true,
            });
            const allergensDataStringified = JSON.stringify(allergensDataTemp);
            const allergensData = JSON.parse(allergensDataStringified);
            const tempAllergensPayload: any = {
              key: 'allergens',
              label: 'Allergens',
              value: [],
            };
            allergensData?.forEach((allergensData: any) => {
              const tempValuePayload = {
                id: allergensData?._id,
                key: allergensData?.name,
                value: allergensData?.name,
              };
              for (const valueInside in allergensData) {
                if (valueInside != '_id')
                  tempValuePayload[valueInside] = allergensData[valueInside];
              }
              tempAllergensPayload.value.push(tempValuePayload);
            });
            masterDataArray?.push(tempAllergensPayload);
          }
          // if (indexOfKey == 1) {
          //   const recipeCategoryTemp = await this.categoriesModel.find({
          //     is_active: true,
          //   });
          //   const recipeCategoryDataStringified =
          //     JSON.stringify(recipeCategoryTemp);
          //   const recipeCategoryData = JSON.parse(
          //     recipeCategoryDataStringified,
          //   );
          //   const tempRecipeCategoryPayload: any = {
          //     key: 'recipe_category',
          //     label: 'Recipe Category',
          //     value: [],
          //   };
          //   recipeCategoryData?.forEach((recipeCategoryData: any) => {
          //     const tempValuePayload = {
          //       id: recipeCategoryData?._id,
          //       key: recipeCategoryData?.category_name || '',
          //       value: recipeCategoryData?.category_name || '',
          //     };

          //     for (const valueInside in recipeCategoryData) {
          //       if (valueInside != '_id')
          //         tempValuePayload[valueInside] =
          //           recipeCategoryData[valueInside];
          //     }
          //     tempRecipeCategoryPayload.value.push(tempValuePayload);
          //   });
          //   masterDataArray?.push(tempRecipeCategoryPayload);
          // }
          // if (indexOfKey == 2) {
          //   const variantsDataTemp = await this.variantModel.find({
          //     is_active: true,
          //   });
          //   const variantsDataStringified = JSON.stringify(variantsDataTemp);
          //   const variantsData = JSON.parse(variantsDataStringified);
          //   const tempVariantPayload: any = {
          //     key: 'variants',
          //     label: 'Variants',
          //     value: [],
          //   };
          //   variantsData?.forEach((variantData: any) => {
          //     const tempValuePayload = {
          //       id: variantData?._id,
          //       key: variantData?.display_name || '',
          //       value: variantData?.display_name || '',
          //     };

          //     for (const valueInside in variantData) {
          //       if (valueInside != '_id')
          //         tempValuePayload[valueInside] = variantData[valueInside];
          //     }
          //     tempVariantPayload.value.push(tempValuePayload);
          //   });
          //   masterDataArray?.push(tempVariantPayload);
          // }
          if (indexOfKey == 1) {
            const cuisineDataTemp = await this.cuisineModel.find({
              is_active: true,
            });
            const cuisineDataStringified = JSON.stringify(cuisineDataTemp);
            const cuisineData = JSON.parse(cuisineDataStringified);
            const tempCuisinePayload: any = {
              key: 'cuisine',
              label: 'Cuisine',
              value: [],
            };
            cuisineData?.forEach((cuisineData: any) => {
              const tempValuePayload = {
                id: cuisineData?._id,
                key: cuisineData?.name,
                value: cuisineData?.name,
              };
              for (const valueInside in cuisineData) {
                if (valueInside != '_id')
                  tempValuePayload[valueInside] = cuisineData[valueInside];
              }
              tempCuisinePayload.value.push(tempValuePayload);
            });
            masterDataArray?.push(tempCuisinePayload);
          }
          if (indexOfKey == 2) {
            const dishtypeDataTemp = await this.dishtypeModel.find({
              is_active: true,
            });
            const dishtypeDataStringified = JSON.stringify(dishtypeDataTemp);
            const dishtypeData = JSON.parse(dishtypeDataStringified);
            const tempDishTypePayload: any = {
              key: 'dish_type',
              label: 'Dish Type',
              value: [],
            };
            dishtypeData?.forEach((dishtypeData: any) => {
              const tempValuePayload = {
                id: dishtypeData?._id,
                key: dishtypeData?.name,
                value: dishtypeData?.name,
              };
              for (const valueInside in dishtypeData) {
                if (valueInside != '_id')
                  tempValuePayload[valueInside] = dishtypeData[valueInside];
              }
              tempDishTypePayload.value.push(tempValuePayload);
            });
            masterDataArray?.push(tempDishTypePayload);
          }
        }

        const tempMasterDataArray = await this.masterDataModel.aggregate([
          {
            $match: {
              key: { $in: keyArray },
              is_active: true,
            },
          },
          {
            $sort: {
              createdAt: -1,
            },
          },
          {
            $group: {
              _id: '$key',
              label: { $first: '$label' },
              value: {
                $push: {
                  _id: '$_id',
                  value: '$value',
                  createdAt: '$createdAt',
                  updatedAt: '$updatedAt',
                },
              },
            },
          },
          {
            $sort: {
              _id: 1,
            },
          },
          // {
          //   $project : {
          //     key : '$_id',
          //     label : 1,
          //     value : 1
          //   }
          // }
        ]);

        tempMasterDataArray?.forEach((masterData) => {
          const tempPayload: any = {};
          tempPayload.key = masterData._id;
          tempPayload.label = masterData.label;
          tempPayload.value = [];

          // if (masterData?._id == 'macro_guideline') {
          //   const tempData = [];
          //   masterData.value.forEach((valueData: any) => {
          //     const indexOfType = tempData?.findIndex(
          //       (itm) => itm?.key == valueData?.value?.key,
          //     );
          //     if (indexOfType == -1) {
          //       tempData?.push({
          //         key: valueData?.value?.key,
          //         value: [{ _id: valueData?._id, ...valueData?.value }],
          //       });
          //     } else {
          //       tempData[indexOfType].value?.push({
          //         _id: valueData?._id,
          //         ...valueData?.value,
          //       });
          //     }
          //   });
          //   tempPayload.value = tempData;
          // } else {
          masterData.value.forEach((valueData: any) => {
            const tempValuePayload = {
              id: valueData._id,
              createdAt: valueData?.createdAt,
              updatedAt: valueData?.updatedAt,
            };
            for (const valueInside in valueData.value) {
              tempValuePayload[valueInside] = valueData.value[valueInside];
            }
            tempPayload.value.push(tempValuePayload);
          });
          // }
          masterDataArray.push(tempPayload);
        });

        if (masterDataArray.length === 0)
          throw new NotFoundException('Master Data Not Found!');
        return {
          data: masterDataArray,
          message: 'Data Fetched Successfully!',
          status: true,
        };
      }
      const masterDataArray = [];
      const allergensDataTemp = await this.allergensModel.find({
        is_active: true,
      });
      const allergensDataStringified = JSON.stringify(allergensDataTemp);
      const allergensData = JSON.parse(allergensDataStringified);
      // const recipeCategoryTemp = await this.categoriesModel.find({
      //   is_active: true,
      // });
      // const recipeCategoryDataStringified = JSON.stringify(recipeCategoryTemp);
      // const recipeCategoryData = JSON.parse(recipeCategoryDataStringified);
      const cuisineDataTemp = await this.cuisineModel.find({
        is_active: true,
      });
      const cuisineDataStringified = JSON.stringify(cuisineDataTemp);
      const cuisineData = JSON.parse(cuisineDataStringified);
      const dishtypeDataTemp = await this.dishtypeModel.find({
        is_active: true,
      });
      const dishtypeDataStringified = JSON.stringify(dishtypeDataTemp);
      const dishtypeData = JSON.parse(dishtypeDataStringified);
      // const variantsDataTemp = await this.variantModel.find({
      //   is_active: true,
      // });
      // const variantsDataStringified = JSON.stringify(variantsDataTemp);
      // const variantsData = JSON.parse(variantsDataStringified);

      const tempAllergensPayload: any = {
        key: 'allergens',
        label: 'Allergens',
        value: [],
      };
      // const tempRecipeCategoryPayload: any = {
      //   key: 'recipe_category',
      //   label: 'Recipe Category',
      //   value: [],
      // };
      const tempCuisinePayload: any = {
        key: 'cuisine',
        label: 'Cuisine',
        value: [],
      };
      const tempDishTypePayload: any = {
        key: 'dish_type',
        label: 'Dish Type',
        value: [],
      };
      // const tempVariantPayload: any = {
      //   key: 'variants',
      //   label: 'Variants',
      //   value: [],
      // };
      allergensData?.forEach((allergensData: any) => {
        const tempValuePayload = {
          id: allergensData?._id,
          key: allergensData?.name,
          value: allergensData?.name,
        };
        for (const valueInside in allergensData) {
          if (valueInside != '_id')
            tempValuePayload[valueInside] = allergensData[valueInside];
        }
        tempAllergensPayload.value.push(tempValuePayload);
      });
      cuisineData?.forEach((cuisineData: any) => {
        const tempValuePayload = {
          id: cuisineData?._id,
          key: cuisineData?.name,
          value: cuisineData?.name,
        };
        for (const valueInside in cuisineData) {
          if (valueInside != '_id')
            tempValuePayload[valueInside] = cuisineData[valueInside];
        }
        tempCuisinePayload.value.push(tempValuePayload);
      });
      dishtypeData?.forEach((dishtypeData: any) => {
        const tempValuePayload = {
          id: dishtypeData?._id,
          key: dishtypeData?.name,
          value: dishtypeData?.name,
        };
        for (const valueInside in dishtypeData) {
          if (valueInside != '_id')
            tempValuePayload[valueInside] = dishtypeData[valueInside];
        }
        tempDishTypePayload.value.push(tempValuePayload);
      });

      // recipeCategoryData?.forEach((recipeCategoryData: any) => {
      //   const tempValuePayload = {
      //     id: recipeCategoryData?._id,
      //     key: recipeCategoryData?.category_name || '',
      //     value: recipeCategoryData?.category_name || '',
      //   };

      //   for (const valueInside in recipeCategoryData) {
      //     if (valueInside != '_id')
      //       tempValuePayload[valueInside] = recipeCategoryData[valueInside];
      //   }
      //   tempRecipeCategoryPayload.value.push(tempValuePayload);
      // });

      // variantsData?.forEach((variantData: any) => {
      //   const tempValuePayload = {
      //     id: variantData?._id,
      //     key: variantData?.display_name || '',
      //     value: variantData?.display_name || '',
      //   };

      //   for (const valueInside in variantData) {
      //     if (valueInside != '_id')
      //       tempValuePayload[valueInside] = variantData[valueInside];
      //   }
      //   tempVariantPayload.value.push(tempValuePayload);
      // });

      masterDataArray?.push(tempAllergensPayload);
      masterDataArray?.push(tempCuisinePayload);
      masterDataArray?.push(tempDishTypePayload);
      // masterDataArray?.push(tempRecipeCategoryPayload);
      // masterDataArray?.push(tempVariantPayload);
      const tempMasterDataArray = await this.masterDataModel.aggregate([
        {
          $match: {
            is_active: true,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $group: {
            _id: '$key',
            label: { $first: '$label' },
            value: {
              $push: {
                _id: '$_id',
                value: '$value',
                createdAt: '$createdAt',
                updatedAt: '$updatedAt',
              },
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ]);

      tempMasterDataArray?.forEach((masterData) => {
        const tempPayload: any = {};
        tempPayload.key = masterData._id;
        tempPayload.label = masterData.label;
        tempPayload.value = [];

        // if (masterData?._id == 'macro_guideline') {
        //   const tempData = [];
        //   masterData.value.forEach((valueData: any) => {
        //     const indexOfType = tempData?.findIndex(
        //       (itm) => itm?.key == valueData?.value?.key,
        //     );
        //     if (indexOfType == -1) {
        //       tempData?.push({
        //         key: valueData?.value?.key,
        //         value: [{ _id: valueData?._id, ...valueData?.value }],
        //       });
        //     } else {
        //       tempData[indexOfType].value?.push({
        //         _id: valueData?._id,
        //         ...valueData?.value,
        //       });
        //     }
        //   });
        //   tempPayload.value = tempData;
        // } else {
        masterData.value.forEach((valueData: any) => {
          const tempValuePayload = {
            id: valueData._id,
            createdAt: valueData?.createdAt,
            updatedAt: valueData?.updatedAt,
          };
          for (const valueInside in valueData.value) {
            tempValuePayload[valueInside] = valueData.value[valueInside];
          }
          tempPayload.value.push(tempValuePayload);
        });
        // }
        masterDataArray.push(tempPayload);
      });
      if (masterDataArray.length === 0)
        throw new NotFoundException('Master Data Not Found!');
      return {
        data: masterDataArray,
        message: 'Data Fetched Successfully!',
        status: true,
      };
    } catch (err) {
      throw err;
    }
  }

  async findOne(key: string) {
    try {
      if (mongoose.isValidObjectId(key)) {
        const allergensData: any = await this.allergensModel.findOne({
          _id: key,
          is_active: true,
        });
        const cuisineData: any = await this.cuisineModel.findOne({
          _id: key,
          is_active: true,
        });
        const dishtypeData: any = await this.dishtypeModel.findOne({
          _id: key,
          is_active: true,
        });
        // const recipeCategoryData: any = await this.categoriesModel.findOne({
        //   _id: key,
        //   is_active: true,
        // });
        // const variantData: any = await this.variantModel.findOne({
        //   _id: key,
        //   is_active: true,
        // });
        const subMasterData: any = await this.masterDataModel.findOne({
          _id: key,
          is_active: true,
        });
        const keyTranslations = await this.translationModel
          .find({
            key: subMasterData?.value?.value,
            is_not_translation_data: true,
          })
          .select('-createdAt -updatedAt -__v -is_not_translation_data');

        // Add translations if available
        if (keyTranslations.length) {
          subMasterData._doc.translations = keyTranslations; // `_doc` ensures we modify the plain object in Mongoose
        }
        if (allergensData) {
          const payload = {
            _id: allergensData?._id,
            key: 'allergens',
            label: 'Allergens',
            is_active: true,
            value: {
              key: allergensData?.name,
              value: allergensData?.name,
              name: allergensData?.name,
              is_vegetarian: allergensData?.is_vegetarian,
            },
            createdAt: allergensData?.createdAt,
            updatedAt: allergensData?.updatedAt,
          };
          return {
            message: 'Data Fetched Successfully!',
            data: payload,
            status: true,
          };
        } else if (cuisineData) {
          const payload = {
            _id: cuisineData?._id,
            key: 'cuisine',
            label: 'Cuisine',
            is_active: true,
            value: {
              key: cuisineData?.name,
              value: cuisineData?.name,
              name: cuisineData?.name,
            },
            createdAt: cuisineData?.createdAt,
            updatedAt: cuisineData?.updatedAt,
          };
          return {
            message: 'Data Fetched Successfully!',
            data: payload,
            status: true,
          };
        } else if (dishtypeData) {
          const payload = {
            _id: dishtypeData?._id,
            key: 'dish_type',
            label: 'Dish Type',
            is_active: true,
            value: {
              key: dishtypeData?.name,
              value: dishtypeData?.name,
              name: dishtypeData?.name,
            },
            createdAt: dishtypeData?.createdAt,
            updatedAt: dishtypeData?.updatedAt,
          };
          return {
            message: 'Data Fetched Successfully!',
            data: payload,
            status: true,
          };
        }
        // else if (recipeCategoryData) {
        //   const payload = {
        //     _id: recipeCategoryData?._id,
        //     key: 'recipe_category',
        //     label: 'Recipe Category',
        //     is_active: true,
        //     value: {
        //       key: recipeCategoryData?.category_name,
        //       value: recipeCategoryData?.category_name,
        //       category_name: recipeCategoryData?.category_name,
        //       order_number: recipeCategoryData?.order_number,
        //       is_vegetarian: recipeCategoryData?.is_vegetarian,
        //       is_live: recipeCategoryData?.is_live,
        //     },
        //     createdAt: recipeCategoryData?.createdAt,
        //     updatedAt: recipeCategoryData?.updatedAt,
        //   };
        //   return {
        //     message: 'Data Fetched Successfully!',
        //     data: payload,
        //     status: true,
        //   };
        // } else if (variantData) {
        //   const payload = {
        //     _id: variantData?._id,
        //     key: 'variants',
        //     label: 'Variants',
        //     is_active: true,
        //     value: {
        //       key: variantData?.display_name,
        //       value: variantData?.display_name,
        //       display_name: variantData?.display_name,
        //       order_number: variantData?.order_number,
        //       internal_name: variantData?.internal_name,
        //       ingredients: variantData?.ingredients,
        //     },
        //     createdAt: variantData?.createdAt,
        //     updatedAt: variantData?.updatedAt,
        //   };
        //   return {
        //     message: 'Data Fetched Successfully!',
        //     data: payload,
        //     status: true,
        //   };
        // }
        else if (subMasterData) {
          // if (subMasterData?.key == 'macro_guideline') {
          //   subMasterData = await this.masterDataModel.find({
          //     key: 'macro_guideline',
          //     'value.key': subMasterData?.value?.key,
          //     is_active: true,
          //   });
          // }
          if (keyTranslations.length) {
            subMasterData.translations = keyTranslations;
          }

          return {
            message: 'Data Fetched Successfully!',
            data: subMasterData,
            status: true,
          };
        } else {
          return {
            message: 'No Master Data Present!',
            data: {},
            status: true,
          };
        }
      } else {
        if (key == 'allergens') {
          const allergensDataTemp = await this.allergensModel.find({
            is_active: true,
          });
          const allergensDataStringified = JSON.stringify(allergensDataTemp);
          const allergensData = JSON.parse(allergensDataStringified);
          const tempAllergensPayload: any = {
            key: 'allergens',
            label: 'Allergens',
            value: [],
          };
          allergensData?.forEach((allergensData: any) => {
            const tempValuePayload = {
              id: allergensData?._id,
              key: allergensData?.name,
              value: allergensData?.name,
            };
            for (const valueInside in allergensData) {
              if (valueInside != '_id')
                tempValuePayload[valueInside] = allergensData[valueInside];
            }
            tempAllergensPayload.value.push(tempValuePayload);
          });
          return {
            message: 'Data Fetched Successfully!',
            data: tempAllergensPayload || {},
            status: true,
          };
        }
        // else if (key == 'recipe_category') {
        //   const recipeCategoryTemp = await this.categoriesModel.find({
        //     is_active: true,
        //   });
        //   const recipeCategoryDataStringified =
        //     JSON.stringify(recipeCategoryTemp);
        //   const recipeCategoryData = JSON.parse(recipeCategoryDataStringified);
        //   const tempRecipeCategoryPayload: any = {
        //     key: 'recipe_category',
        //     label: 'Recipe Category',
        //     value: [],
        //   };
        //   recipeCategoryData?.forEach((recipeCategoryData: any) => {
        //     const tempValuePayload = {
        //       id: recipeCategoryData?._id,
        //       key: recipeCategoryData?.category_name || '',
        //       value: recipeCategoryData?.category_name || '',
        //     };

        //     for (const valueInside in recipeCategoryData) {
        //       if (valueInside != '_id')
        //         tempValuePayload[valueInside] = recipeCategoryData[valueInside];
        //     }
        //     tempRecipeCategoryPayload.value.push(tempValuePayload);
        //   });

        //   return {
        //     message: 'Data Fetched Successfully!',
        //     data: tempRecipeCategoryPayload || {},
        //     status: true,
        //   };
        // }
        else if (key == 'cuisine') {
          const cuisineDataTemp = await this.cuisineModel.find({
            is_active: true,
          });
          const cuisineDataStringified = JSON.stringify(cuisineDataTemp);
          const cuisineData = JSON.parse(cuisineDataStringified);
          const tempCuisinePayload: any = {
            key: 'cuisine',
            label: 'Cuisine',
            value: [],
          };
          cuisineData?.forEach((cuisineData: any) => {
            const tempValuePayload = {
              id: cuisineData?._id,
              key: cuisineData?.name,
              value: cuisineData?.name,
            };
            for (const valueInside in cuisineData) {
              if (valueInside != '_id')
                tempValuePayload[valueInside] = cuisineData[valueInside];
            }
            tempCuisinePayload.value.push(tempValuePayload);
          });
          return {
            message: 'Data Fetched Successfully!',
            data: tempCuisinePayload || {},
            status: true,
          };
        } else if (key == 'dish_type') {
          const dishtypeDataTemp = await this.dishtypeModel.find({
            is_active: true,
          });
          const dishtypeDataStringified = JSON.stringify(dishtypeDataTemp);
          const dishtypeData = JSON.parse(dishtypeDataStringified);
          const tempDishTypePayload: any = {
            key: 'dish_type',
            label: 'Dish Type',
            value: [],
          };
          dishtypeData?.forEach((dishtypeData: any) => {
            const tempValuePayload = {
              id: dishtypeData?._id,
              key: dishtypeData?.name,
              value: dishtypeData?.name,
            };
            for (const valueInside in dishtypeData) {
              if (valueInside != '_id')
                tempValuePayload[valueInside] = dishtypeData[valueInside];
            }
            tempDishTypePayload.value.push(tempValuePayload);
          });
          return {
            message: 'Data Fetched Successfully!',
            data: tempDishTypePayload || {},
            status: true,
          };
        }
        // else if (key == 'variants') {
        //   const variantsDataTemp = await this.variantModel.find({
        //     is_active: true,
        //   });
        //   const variantsDataStringified = JSON.stringify(variantsDataTemp);
        //   const variantsData = JSON.parse(variantsDataStringified);
        //   const tempVariantPayload: any = {
        //     key: 'variants',
        //     label: 'Variants',
        //     value: [],
        //   };
        //   variantsData?.forEach((variantData: any) => {
        //     const tempValuePayload = {
        //       id: variantData?._id,
        //       key: variantData?.display_name || '',
        //       value: variantData?.display_name || '',
        //     };

        //     for (const valueInside in variantData) {
        //       if (valueInside != '_id')
        //         tempValuePayload[valueInside] = variantData[valueInside];
        //     }
        //     tempVariantPayload.value.push(tempValuePayload);
        //   });
        //   return {
        //     message: 'Data Fetched Successfully!',
        //     data: tempVariantPayload || {},
        //     status: true,
        //   };
        // }
        else {
          const masterData: any = { value: [] };

          const tempMasterData: any = await this.masterDataModel.find({
            key: key,
            is_active: true,
          });

          // if (key == 'macro_guideline') {
          //   tempMasterData?.map((itmData, index) => {
          //     if (index == 0) {
          //       masterData[`key`] = itmData?.key;
          //       masterData[`label`] = itmData?.label;
          //       masterData.value = [];
          //     }
          //     const checkIndex = masterData?.value?.findIndex(
          //       (indItm) => indItm?.key == itmData?.value?.key,
          //     );
          //     if (checkIndex == -1) {
          //       masterData.value?.push({
          //         key: itmData?.value?.key,
          //         id: itmData?._id,
          //         value: [{ _id: itmData?._id, ...itmData?.value }],
          //       });
          //     } else {
          //       masterData.value[checkIndex]?.value?.push({
          //         _id: itmData?._id,
          //         ...itmData?.value,
          //       });
          //     }
          //   });
          //   // tempMasterData.value.forEach((valueData: any) => {
          //   //   const indexOfType = tempData?.findIndex(
          //   //     (itm) => itm?.key == valueData?.value?.key,
          //   //   );
          //   //   if (indexOfType == -1) {
          //   //     tempData?.push({
          //   //       key: valueData?.value?.key,
          //   //       value: [{ _id: valueData?._id, ...valueData?.value }],
          //   //     });
          //   //   } else {
          //   //     tempData[indexOfType].value?.push({
          //   //       _id: valueData?._id,
          //   //       ...valueData?.value,
          //   //     });
          //   //   }
          //   // });
          // } else {
          tempMasterData?.map((data: any, index: number) => {
            if (index == 0) {
              masterData.key = data.key;
              masterData.label = data.label;
            }
            const tempPayload: any = {
              id: data?._id,
              createdAt: data?.createdAt,
              updatedAt: data?.updatedAt,
            };
            for (const keyData in data?.value) {
              if (key == 'macro_guideline' && keyData == 'value') {
                tempPayload.value = data?.value['value'];
              } else {
                tempPayload[`${keyData}`] = data?.value[keyData];
              }
            }
            masterData?.value?.push(tempPayload);
          });
          // }
          return {
            message: 'Data Fetched Successfully!',
            data: masterData,
            status: true,
          };
        }
      }
    } catch (err) {
      throw err;
    }
  }

  async update(key: string, updateMasterdatumDto: UpdateMasterdatumDto) {
    try {
      const bulkOperationsForOtherMasterData = [];

      if (updateMasterdatumDto?.value) {
        for (let i = 0; i < updateMasterdatumDto.value.length; i++) {
          const update: any = updateMasterdatumDto.value[i];
          const setPayload: any = {};

          for (const key in update) {
            setPayload[key] = update[key];
          }
          console.log({ setPayload });
          // Validation for is_vegetarian and is_non_vegetarian
          if (updateMasterdatumDto.label == 'Ingredient Category') {
            if (
              setPayload.hasOwnProperty('is_vegetarian') &&
              setPayload.hasOwnProperty('is_non_vegetarian')
            ) {
              if (setPayload.is_vegetarian && setPayload.is_non_vegetarian) {
                throw new HttpException(
                  {
                    message:
                      'Both is_vegetarian and is_non_vegetarian cannot be true.',
                    status: false,
                  },
                  HttpStatus.BAD_REQUEST,
                );
              }
            }
          }

          // Removing fields that shouldn't be updated directly
          if (
            setPayload[`is_active`] !== undefined &&
            setPayload[`is_active`] !== null
          ) {
            delete setPayload[`is_active`];
          }

          delete setPayload[`id`];

          let checkAlreadyExist;
          if (key == 'allergens') {
            checkAlreadyExist = await this.allergensModel.findOne({
              _id: { $ne: new mongoose.Types.ObjectId(update?.id) },
              name: setPayload?.name,
            });
          }
          if (key == 'cuisine') {
            checkAlreadyExist = await this.cuisineModel.findOne({
              _id: { $ne: new mongoose.Types.ObjectId(update?.id) },
              name: setPayload?.name,
            });
          }
          if (key == 'dish_type') {
            checkAlreadyExist = await this.dishtypeModel.findOne({
              _id: { $ne: new mongoose.Types.ObjectId(update?.id) },
              name: setPayload?.name,
            });
          }

          if (checkAlreadyExist) {
            throw new HttpException(
              {
                message: `${key?.toUpperCase()} Already Exist!`,
                status: false,
              },
              HttpStatus.BAD_REQUEST,
            );
          }

          bulkOperationsForOtherMasterData.push({
            updateOne: {
              filter: { _id: update?.id, is_active: true },
              update: { $set: setPayload },
            },
          });
          if (key === 'meal_category') {
            if (updateMasterdatumDto.key_translations) {
              for (const translation of updateMasterdatumDto.key_translations) {
                await this.translationModel.findOneAndUpdate(
                  {
                    key: (updateMasterdatumDto?.value as any[])[0]?.value,
                    language: translation.language,
                  },
                  {
                    key: (updateMasterdatumDto?.value as any[])[0]?.value,
                    data: translation.data,
                    language: translation.language,
                    is_not_translation_data: true,
                  },
                  { upsert: true },
                );
              }
            }
          }
        }
      }

      if (key == 'allergens') {
        const updateAllergensData = await this.allergensModel.bulkWrite(
          bulkOperationsForOtherMasterData,
        );
        return {
          message: 'Master data updated successfully!',
          data: updateAllergensData,
          status: true,
        };
      } else if (key == 'cuisine') {
        const updateCuisineData = await this.cuisineModel.bulkWrite(
          bulkOperationsForOtherMasterData,
        );
        return {
          message: 'Master data updated successfully!',
          data: updateCuisineData,
          status: true,
        };
      } else if (key == 'dish_type') {
        const updateDishtypeData = await this.dishtypeModel.bulkWrite(
          bulkOperationsForOtherMasterData,
        );
        return {
          message: 'Master data updated successfully!',
          data: updateDishtypeData,
          status: true,
        };
      } else {
        await this.masterDataModel.updateMany(
          { key: key },
          { label: updateMasterdatumDto?.label },
        );

        const bulkOperations = [];

        if (updateMasterdatumDto?.value) {
          for (let i = 0; i < updateMasterdatumDto.value.length; i++) {
            const update: any = updateMasterdatumDto.value[i];
            const setPayload: any = {};

            for (const key in update) {
              setPayload[`value.${key}`] = update[key];
            }

            delete setPayload[`value.id`];

            let checkAlreadyExist = false;
            if (key != 'macro_guideline') {
              checkAlreadyExist = await this.masterDataModel.findOne({
                _id: { $ne: new mongoose.Types.ObjectId(update?.id) },
                key: key,
                'value.value': setPayload[`value.value`],
                // is_active: true,
              });
            }
            if (checkAlreadyExist) {
              throw new HttpException(
                {
                  message: `${key?.toUpperCase()} Already Exist!`,
                  status: false,
                },
                HttpStatus.BAD_REQUEST,
              );
            }
            console.log({ update });
            bulkOperations.push({
              updateOne: {
                filter: { _id: update?.id, is_active: true },
                update: { $set: setPayload },
              },
            });
          }
        }

        const updateMasterData =
          await this.masterDataModel.bulkWrite(bulkOperations);

        return {
          message: 'Master data updated successfully!',
          data: updateMasterData,
          status: true,
        };
      }
    } catch (err) {
      throw err;
    }
  }

  async remove(key: string) {
    try {
      const deleteMasterData = await this.masterDataModel.findOneAndDelete({
        key: key,
      });
      if (deleteMasterData) {
        return {
          message: 'Master data deleted successfully!',
          data: deleteMasterData,
          status: true,
        };
      } else {
        return {
          message: 'No master data to delete!',
          data: {},
          status: false,
        };
      }
    } catch (err) {
      throw err;
    }
  }

  async delete(key: string, deleteMasterdatumDto: DeleteMasterdatumDto) {
    try {
      // await this.masterDataModel.findOneAndUpdate(
      //   { key: key },
      //   { $pull: { value: { id: { $in: deleteMasterdatumDto?.value } } } },
      //   { new: true },
      // );
      // await this.masterDataModel.findOneAndUpdate(
      //   { key: key, 'value.id': { $in: deleteMasterdatumDto?.value } },
      //   { $set: { 'value.$[elem].is_active': false } },
      //   { new: true, arrayFilters: [{ 'elem.id': { $in: deleteMasterdatumDto?.value } }] }
      // );
      if (key == 'allergens') {
        await this.allergensModel.updateMany(
          {
            _id: { $in: deleteMasterdatumDto?.value },
          },
          {
            is_active: false,
          },
        );
      }
      // else if (key == 'variants') {
      //   await this.variantModel.updateMany(
      //     {
      //       _id: { $in: deleteMasterdatumDto?.value },
      //     },
      //     {
      //       is_active: false,
      //     },
      //   );
      // }
      else if (key == 'dish_type') {
        await this.dishtypeModel.updateMany(
          {
            _id: { $in: deleteMasterdatumDto?.value },
          },
          {
            is_active: false,
          },
        );
      } else if (key == 'cuisine') {
        await this.cuisineModel.updateMany(
          {
            _id: { $in: deleteMasterdatumDto?.value },
          },
          {
            is_active: false,
          },
        );
      }
      // else if (key == 'recipe_category') {
      //   await this.categoriesModel.updateMany(
      //     {
      //       _id: { $in: deleteMasterdatumDto?.value },
      //     },
      //     {
      //       is_active: false,
      //     },
      //   );
      // }
      else {
        await this.masterDataModel.updateMany(
          {
            key: key,
            _id: { $in: deleteMasterdatumDto?.value },
          },
          {
            is_active: false,
          },
        );
      }

      return {
        message: 'Master data value deleted successfully!',
        data: {},
        status: true,
      };
    } catch (err) {
      throw err;
    }
  }

  /**
   * Same envelope as platform sendResponse for GET /api/v1/master-data/get-ingredient.
   */
  async getAllIngredientResponse(): Promise<{
    message: string;
    data: {
      ingredient: unknown[];
      category: unknown[];
      cusine: unknown[];
      ethnicity: string[];
    };
    status: boolean;
  }> {
    const proxied = await this.fetchPlatformGetIngredient();
    if (proxied) {
      return proxied;
    }

    const data = await this.getAllIngredientLocal();
    return {
      message: 'Ingredients details fetched successfully!',
      data,
      status: true,
    };
  }

  private async fetchPlatformGetIngredient(): Promise<{
    message: string;
    data: {
      ingredient: unknown[];
      category: unknown[];
      cusine: unknown[];
      ethnicity: string[];
    };
    status: boolean;
  } | null> {
    const baseUrl = this.platformApiBaseUrl;
    if (!baseUrl) {
      return null;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get<{
          message?: string;
          data?: {
            ingredient: unknown[];
            category: unknown[];
            cusine: unknown[];
            ethnicity: string[];
          };
          status?: boolean;
        }>(`${baseUrl}/api/v1/master-data/get-ingredient`, {
          headers: { accept: 'application/json' },
        }),
      );

      const body = response.data;
      if (body?.status === true && body?.data) {
        return {
          message:
            body.message || 'Ingredients details fetched successfully!',
          data: body.data,
          status: true,
        };
      }
    } catch (error) {
      const status = error instanceof AxiosError ? error.response?.status : null;
      console.warn(
        `Platform get-ingredient proxy failed (${status ?? 'network'}), using local DB`,
      );
    }

    return null;
  }

  /** Local fallback — same query order and shape as platform masterdata.controller.js */
  private async getAllIngredientLocal() {
    const ingredientsData = await this.getCustomerVisibleIngredients();
    const categoryData = await this.getIngredientCategories();
    const cuisineData = await this.getCuisineList();
    const ethnicityData = await this.getEthnicityList();

    return {
      ingredient: ingredientsData,
      category: categoryData,
      cusine: cuisineData,
      ethnicity: ethnicityData,
    };
  }

  private getCustomerVisibleIngredients() {
    return this.ingredientModel.aggregate<{
      ingredient: string;
      ingredient_tl?: Record<string, string>;
      category_name_ref: string[];
    }>([
      { $match: { show_customers: true } },
      {
        $addFields: {
          categoryObjectIds: {
            $map: {
              input: { $ifNull: ['$category', []] },
              as: 'cat',
              in: { $toObjectId: '$$cat' },
            },
          },
        },
      },
      {
        $lookup: {
          from: 'masterdatakms',
          localField: 'categoryObjectIds',
          foreignField: '_id',
          as: 'categoryDetails',
        },
      },
      {
        $group: {
          _id: '$name_of_customers',
          ingredient_tl: { $first: '$name_of_customers_tl' },
          category_name_ref: {
            $addToSet: '$categoryDetails.value.value',
          },
        },
      },
      {
        $project: {
          _id: 0,
          ingredient: '$_id',
          ingredient_tl: 1,
          category_name_ref: {
            $reduce: {
              input: '$category_name_ref',
              initialValue: [],
              in: { $setUnion: ['$$value', '$$this'] },
            },
          },
        },
      },
    ]);
  }

  private async getIngredientCategories() {
    const rows = await this.masterDataModel
      .find({ is_active: true, key: 'ingredient_category' })
      .select({ _id: 1, value: 1 })
      .lean()
      .exec();

    return rows.map((row) => {
      const value = (row.value ?? {}) as Record<string, unknown>;
      return {
        _id: row._id,
        order_number: value.order_number as number | undefined,
        category_name: value.value as string,
        is_vegetarian: value.is_vegetarian as boolean | undefined,
        is_live: value.is_live as boolean | undefined,
      };
    });
  }

  private getCuisineList() {
    return this.cuisineModel
      .find({}, { _id: 0, name: 1 })
      .lean<Array<{ name: string }>>()
      .exec();
  }

  private async getEthnicityList(): Promise<string[]> {
    const rows = await this.ethnicityModel.aggregate([
      {
        $group: {
          _id: null,
          name: { $push: '$name' },
        },
      },
      {
        $project: {
          _id: 0,
          name: 1,
        },
      },
    ]);

    if (!rows.length) {
      return [];
    }

    return rows[0].name ?? [];
  }
}
