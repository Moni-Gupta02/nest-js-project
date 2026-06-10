import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Delete,
  Param,
  Put,
  ValidationPipe,
  UsePipes,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { IngredientService } from './ingredient.service';
import { ApiBadRequestResponse, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { message } from 'src/common/assets';
import {
  handleUnexpectedError,
  handleValidationError,
  isMassUnit,
  isVolumeUnit,
} from 'src/common/utils/utils';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ReplaceIngredientDto } from './dto/replace-ingredient.dto';
import { OptionalListFilterDto } from 'src/common/dto/filter.dto';
import ingredientList from '../migration/list';
import ingredientPackageList from '../migration/package';
import convert from 'convert';
import { CategoryDataDocument } from 'src/common/schema/category.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { IngredientDocument } from './schemas/ingredient.schema';
import { MasterDataDocument } from 'src/masterdata/Schemas/masterdata.schema';
import { SupplierDocument } from 'src/supplier/schemas/supplier.schemas';
import { PermissionsDocument } from 'src/roles/Schemas/roles.schema';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UniqueNameService } from 'src/common/utils/uniqueNameService';
import { HistoryService } from 'src/history/history.service';
import { FindIngredientDto } from './dto/list-ingredient.dto';

@ApiTags('Ingredient')
@ApiBearerAuth('access-token')
@Controller('ingredient')
@UsePipes(new ValidationPipe({ transform: true })) // Apply validation pipe
export class IngredientController {
  constructor(
    private readonly ingredientService: IngredientService,
    @InjectModel('Category')
    private readonly categoryModel: Model<CategoryDataDocument>,
    @InjectModel('Ingredient')
    private readonly ingredientModel: Model<IngredientDocument>,
    @InjectModel('MasterDataKMS')
    private readonly masterDataModel: Model<MasterDataDocument>,
    @InjectModel('Supplier')
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel('Permissions')
    private readonly rolesModel: Model<PermissionsDocument>,
    private readonly uniqueNameService: UniqueNameService,
    private readonly historyService: HistoryService,
  ) {}

  @Permissions({ resource: 'ingredient', actions: 'create' })
  @Post('create')
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async create(
    @Req() request: Request,
    @Body() createIngredientDto: CreateIngredientDto,
  ) {
    try {
      const user = request['user'];

      const isUnique = await this.uniqueNameService.isNameUnique(
        'ingredient',
        'name',
        createIngredientDto.name,
      );
      if (!isUnique) {
        throw new HttpException(
          {
            data: `Ingredient '${createIngredientDto.name}' is already Exist!`,
            message: `Ingredient '${createIngredientDto.name}' is already Exist!`,
            status: false,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      const createdIngredient =
        await this.ingredientService.create(createIngredientDto);
      await this.historyService.createHistory(
        user._id,
        createdIngredient?._id,
        'ingredient',
        message.history.HISTORY_CREATED,
        null,
        createIngredientDto,
      );
      return {
        message: message.ingredient.INGREDIENT_CREATED,
        data: createdIngredient,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Permissions({ resource: 'ingredient', actions: 'read' })
  @Get('name-list')
  async searchDishes(@Query('ingredient_name') ingredient_name: string) {
    const ingredientData =
      await this.ingredientService.findIngredientBySearch(ingredient_name);
    console.log(ingredientData);
    return {
      message: message.ingredient.INGREDIENT_LIST,
      data: ingredientData,
      status: true,
    };
  }

  @Get('/list')
  @Permissions({ resource: 'ingredient', actions: 'read' })
  async ingredient(@Query() ingredientDto: OptionalListFilterDto) {
    // console.log('Ingredient DTO:', ingredientDto);

    const ingredientData = await this.ingredientService.ingredient(
      ingredientDto.search,
      ingredientDto.page,
      ingredientDto.limit,
      ingredientDto.sort,
      ingredientDto.order,
    );

    return {
      message: 'Ingredient list retrieved successfully',
      data: ingredientData,
      status: true,
    };
  }

  @Get('/list-new')
  @Permissions({ resource: 'ingredient', actions: 'read' })
  async ingredientList(@Query() ingredientDto: OptionalListFilterDto) {
    // console.log('Ingredient DTO:', ingredientDto);

    const ingredientData = await this.ingredientService.ingredientList(
      ingredientDto.search,
      ingredientDto.page,
      ingredientDto.limit,
      ingredientDto.sort,
      ingredientDto.order,
    );

    return {
      message: 'Ingredient list retrieved successfully',
      data: ingredientData,
      status: true,
    };
  }

  @Permissions({ resource: 'ingredient', actions: 'delete' })
  @Delete('delete/:id')
  async delete(@Param('id') userId: string) {
    try {
      const deletedInredient = await this.ingredientService.delete(userId);
      return {
        message: message.ingredient.INGREDIENT_DELETE,
        data: deletedInredient,
        status: true,
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Permissions({ resource: 'ingredient', actions: 'read' })
  @Get(':id')
  async getById(@Param('id') userId: string) {
    const ingredientData = await this.ingredientService.getById(userId);

    return {
      message: message.ingredient.INGREDIENT_LIST,
      data: ingredientData,
      status: true,
    };
  }
  @Permissions({ resource: 'ingredient', actions: 'update' })
  @UsePipes(new ValidationPipe({ transform: true })) // Apply validation pipe
  @Put('update/:id')
  async update(
    @Req() request: Request,
    @Param('id') userId: string,
    @Body() updateUser: UpdateIngredientDto,
  ) {
    try {
      const user = request['user'];
      const updateIngredient = await this.ingredientService.update(
        user._id,
        userId,
        updateUser,
      );
      return {
        message: message.ingredient.INGREDIENT_UPDATED,
        data: updateIngredient,
        status: true,
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  @Post('ingredient-by-ids')
  @Permissions({ resource: 'ingredient', actions: 'read' })
  async findAllIngredientsByIds(
    @Body(ValidationPipe) findIngredientDto: FindIngredientDto,
  ) {
    try {
      const data = await this.ingredientService.findAllIngredientsByIds(
        findIngredientDto.ingredients_ids,
      );
      return {
        data,
        message: message.ingredient.INGREDIENT_LIST,
        status: true,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'ingredient', actions: 'update' })
  @Post('replace')
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async replace(
    @Req() request: Request,
    @Body() replaceIngredientDto: ReplaceIngredientDto,
  ) {
    try {
      const user = request['user'];
      const createdIngredient = await this.ingredientService.replace(
        user._id,
        replaceIngredientDto,
      );
      await this.historyService.createHistory(
        user._id,
        replaceIngredientDto.ingredient_id,
        'ingredient',
        message.history.HISTORY_REPLACE,
        null,
        replaceIngredientDto,
      );
      return {
        message: message.ingredient.INGREDIENT_CREATED,
        data: createdIngredient,
        status: true,
      };
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  async importIngredient() {
    const ingredintsData = [];
    let count = 0;
    let Bulkcount = 0;

    for (const element of ingredientList) {
      const packageAllInfo = ingredientPackageList.filter(
        (item) => item.name == element['name (required)'],
      );

      const packageInfo = ingredientPackageList.filter(
        (item) =>
          item.name == element['name (required)'] && item['orderable'] == '1',
      );

      if (packageInfo.length == 1) {
        console.log('packageInfo', packageInfo.length);
        count++;
      }
      if (packageAllInfo.length > 1) {
        console.log('packageAllInfo', packageAllInfo.length);
        Bulkcount++;
      }

      if (packageInfo.length == 1) {
        const allergensObj = {
          corn: element['corn'],
          wheat: element['wheat'],
          rye: element['rye'],
          barley: element['barley'],
          oats: element['oats'],
          spelt: element['spelt'],
          khorasan: element['khorasan'],
          crustaceans: element['crustaceans'],
          eggs: element['eggs'],
          fish: element['fish'],
          peanut: element['peanut'],
          'cereals containing gluten': element['cereals containing gluten'],
          soybeans: element['soybeans'],
          milk: element['milk'],
          lactose: element['lactose'],
          nuts: element['nuts'],
          walnuts: element['walnuts'],
          'pecan nuts': element['pecan nuts'],
          'brazil nuts': element['brazil nuts'],
          'pistachio nuts': element['pistachio nuts'],
          'macadamia nuts': element['macadamia nuts'],
          almonds: element['almonds'],
          hazelnuts: element['hazelnuts'],
          cashews: element['cashews'],
          celery: element['celery'],
          mustard: element['mustard'],
          seeds: element['seeds'],
          'sesame seeds': element['sesame seeds'],
          'poppy seeds': element['poppy seeds'],
          'sunflower seeds': element['sunflower seeds'],
          sulphites: element['sulphites'],
          lupin: element['lupin'],
          molluscs: element['molluscs'],
          'legume/pulse': element['legume/pulse'],
        };

        const dietTypeObj = {
          element,
          coloring: element['coloring'],
          coriander: element['coriander'],
          glutamate: element['glutamate'],
          carrot: element['carrot'],
          preservative: element['preservative'],
          antioxidant: element['antioxidant'],
          'flavor enhancers': element['flavor enhancers'],
          sulphur: element['sulphur'],
          'is blackened': element['is blackened'],
          sweetener: element['sweetener'],
          'aspartame (E951)': element['aspartame (E951)'],
          'acesulfame (E962)': element['acesulfame (E962)'],
          sorbates: element['sorbates'],
          benzoates: element['benzoates'],
          nitrates: element['nitrates'],
          propionates: element['propionates'],
          phosphate: element['phosphate'],
          caffeine: element['caffeine'],
          alcohol: element['alcohol'],
          quinine: element['quinine'],
          taurine: element['taurine'],
          'genetic modified': element['genetic modified'],
          cacao: element['cacao'],
          'poultry meat': element['poultry meat'],
          beef: element['beef'],
          pork: element['pork'],
          lamb: element['lamb'],
          vegan: element['vegan'],
          vegetarian: element['vegetarian'],
          halal: element['halal'],
          kosher: element['kosher'],
        };

        const allergensArr = [];
        for (const [allergen, value] of Object.entries(allergensObj)) {
          if (value === 1) {
            const categoryData = await this.masterDataModel.findOne(
              {
                key: 'allergens',
                'value.key': { $regex: allergen, $options: 'i' },
              },
              // { key: 'allergens', 'value.key': 'Fish' },

              { _id: 1 },
              {},
            );
            console.log('allergensArr', categoryData, allergen);
            if (categoryData?._id) {
              allergensArr.push(categoryData?._id.toString());
            }
          }
        }

        const dietTypeArr = [];
        for (const [dietType, value] of Object.entries(dietTypeObj)) {
          if (value === 1) {
            const dietTypeData = await this.masterDataModel
              .findOne(
                {
                  key: 'diet_type',
                  'value.key': { $regex: dietType, $options: 'i' },
                },
                // { key: 'diet_type', 'value.key': 'Vegetarian' },
                { _id: 1 },
                {},
              )
              .exec();
            console.log('dietTypeArr', dietTypeData, dietType);

            if (dietTypeData?._id) {
              dietTypeArr.push(dietTypeData?._id.toString());
            }
          }
        }
        const bulkPackageData = packageAllInfo.filter(
          (item) =>
            item.quantity?.toLocaleString().includes('x') &&
            item.price !== undefined &&
            item.price !== null,
        );

        let singlePackageData = packageAllInfo.filter(
          (item) =>
            !item.quantity?.toLocaleString().includes('x') &&
            item.price !== undefined &&
            item.price !== null,
        );
        // console.log('element', element);
        let bulk_number = undefined;
        let singleAvgPriceKg: number = undefined;
        let bulkAvgPriceKg: number = undefined;

        let supplier_details: any;
        if (packageInfo.length >= 1) {
          if (singlePackageData.length == 1) {
            console.log('single existing package');
            const singlePackageUnit: string = singlePackageData?.[0].unit;
            let singlePackageInKg: any;
            const size = Number(singlePackageData?.[0].quantity);

            if (isMassUnit(singlePackageUnit)) {
              singlePackageInKg = convert(size, singlePackageUnit).to('kg');
            } else if (isVolumeUnit(singlePackageUnit)) {
              const singlePackageInLiters = convert(size, singlePackageUnit).to(
                'l',
              );

              // Convert liters to kilograms
              singlePackageInKg = singlePackageInLiters;
            } else {
              singlePackageInKg = size;
            }

            singleAvgPriceKg =
              Number(singlePackageData?.[0].price) / singlePackageInKg;
          }

          if (bulkPackageData[0]?.quantity) {
            const size1 = bulkPackageData?.[0].quantity
              .toLocaleString()
              .match(/\b\d+\b(?!\D*$)/g);
            const size = Number(size1[size1.length - 1]);
            bulk_number = bulkPackageData[0].quantity
              .toLocaleString()
              .match(/\d+/);
            let bulkPackageInKg: any;
            if (bulk_number == 1) {
              bulk_number = Number(
                bulkPackageData[0].quantity
                  .toLocaleString()
                  .match(/\b1\s*\*\s*(\d+)\b/),
              );
            }
            const bulkPackageUnit: string =
              bulkPackageData?.[0].unit || packageAllInfo[0]?.unit;
            // console.log('bulkPackageUnit', bulkPackageUnit);

            // console.log('bulk_number', bulk_number, 'size', size);
            if (isMassUnit(bulkPackageUnit)) {
              bulkPackageInKg = convert(size, bulkPackageUnit).to('kg');
              // console.log('isMassUnit', bulkPackageInKg);
            } else if (isVolumeUnit(bulkPackageUnit)) {
              const bulkPackageInLiters = convert(size, bulkPackageUnit).to(
                'l',
              );
              // console.log('isVolumeUnit', bulkPackageInLiters);
              // Convert liters to kilograms
              bulkPackageInKg = bulkPackageInLiters;
            } else {
              bulkPackageInKg = size;
            }
            // console.log(
            //   'bulkPackageData?.[0].price',
            //   bulkPackageData?.[0].price,
            //   bulkPackageInKg,
            // );
            bulkAvgPriceKg =
              Number(bulkPackageData?.[0].price) / bulkPackageInKg;
            // console.log('bulkAvgPriceKg', bulkAvgPriceKg);
          } else {
            // console.log('1111111111', packageAllInfo);
          }

          if (singlePackageData.length == 0 && bulkPackageData.length > 0) {
            singlePackageData = bulkPackageData;
            singleAvgPriceKg = bulkAvgPriceKg;
          }
          // console.log('bulk existing package', bulkPackageData);
          // console.log('single existing package', singlePackageData);

          let supplieExist = await this.supplierModel
            .findOne({ company: singlePackageData[0]['supplier'] }, { _id: 1 })
            .exec();
          // console.log(
          //   'supplieExist',
          //   supplieExist,
          //   singlePackageData[0]['supplier'],
          // );
          if (!supplieExist) {
            supplieExist = await this.supplierModel.create({
              company: singlePackageData[0]['supplier'],
            });
          }
          supplier_details = [
            {
              supplier: supplieExist._id,
              supplier_article: '',
              product_name: packageInfo[0]?.['product name'] || '',
              conversion_ratio: 1,
              supplier_pref: 1,
              image: [],
              single_package: {
                size:
                  singlePackageData.length > 0
                    ? Number(singlePackageData[0]?.quantity)
                    : 0,
                unit:
                  singlePackageData.length > 0
                    ? singlePackageData[0]?.unit
                    : 'kg',
                price:
                  singlePackageData.length > 0
                    ? Number(singlePackageData?.[0].price)
                    : 0,
                // price: packageInfo[0]?.price || packageAllInfo[0]?.price || 0,
                per_kg_price:
                  singlePackageData.length > 0
                    ? Number(Number(singleAvgPriceKg.toFixed(2)))
                    : undefined,
              },
              bulk_package: {
                size:
                  Number(singlePackageData[0]?.quantity) ||
                  Number(bulkPackageData[0]?.quantity) ||
                  0,
                unit:
                  singlePackageData[0]?.unit ||
                  bulkPackageData[0]?.unit ||
                  'kg',
                price:
                  bulkPackageData.length > 1
                    ? Number(bulkPackageData?.[0].price)
                    : undefined,
                bulk_number: Number(bulk_number),
                per_kg_price:
                  bulkPackageData.length > 1
                    ? Number(Number(bulkAvgPriceKg.toFixed(2)))
                    : undefined,
                single_package_orderable:
                  packageAllInfo.length > 1
                    ? packageInfo[0]?.orderable ||
                      packageAllInfo[0]?.orderable ||
                      false
                    : false,
              },
              is_active: true,
            },
          ];
        }

        console.log("element['category']", element?.['category']);
        const categoryData = [];
        if (element?.['category']) {
          const categoryData1 = await this.masterDataModel
            .findOne(
              {
                key: 'ingredient_category',
                'value.key': { $regex: element?.['category'], $options: 'i' },
              },
              { _id: 1 },
            )
            .exec();
          if (categoryData1?._id) {
            categoryData.push(categoryData1?._id.toString());
          }
        }
        console.log('categoryData', categoryData);

        const list = {
          name: element['name (required)'],
          name_of_customers: element['name (required)'],
          category: categoryData,
          storage_location: element['storage instructions'],
          shelf_life: 0,
          shelf_life_unit: 'Days',
          waste: element['waste %'],
          unit_of_measurement:
            packageInfo[0]?.unit || packageAllInfo[0]?.unit || 'kg',
          is_weighted:
            parseInt(
              packageInfo[0]?.weighted || packageAllInfo[0]?.weighted || '0',
              10,
            ) === 1
              ? true
              : false,
          is_piece:
            parseInt(
              packageInfo[0]?.piece || packageAllInfo[0]?.piece || '0',
              10,
            ) === 1
              ? true
              : false,
          package_type:
            packageInfo[0]?.['package type'] ||
            packageAllInfo[0]?.['package type'] ||
            '',
          nutrition: {
            kcal:
              4 *
                (element['protein (g)'] ||
                  0 + element['carbohydrate (g)'] ||
                  0) +
              9 * (element['fat (g)'] || 0),
            protein: element['protein (g)'] || 0,
            carb: element['carbohydrate (g)'] || 0,
            fat: element['fat (g)'] || 0,
          },
          is_active: true,
          supplier_details: supplier_details,
          diet_type: dietTypeArr,
          allergens: allergensArr,
          // diet_type: [],
          // allergens: [],
        };
        ingredintsData.push(list);
        // console.log('list', list);
        await this.ingredientModel.create(list);
      }
    }
    console.log('Found', count, Bulkcount);
    // const ingredientData =
    // await this.ingredientService.importIngredient(ingredintsData);
    console.log('ingredintsData', ingredintsData);
    // const createdIngredient =
    //   await this.ingredientModel.insertMany(ingredintsData);
    return {
      message: message.ingredient.INGREDIENT_LIST,
      data: ingredintsData,
      status: true,
    };
  }
}
