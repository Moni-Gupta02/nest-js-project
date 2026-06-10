import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBody,
} from '@nestjs/swagger';
import { ValidationError } from 'class-validator';
import { message } from 'src/common/assets';
import { CronJob } from 'cron';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { GetRecipeWiseRatingDto, ListRecipeDto } from './dto/list-recipe.dto';
import { UpdateRecipePortioningDto } from './dto/update-recipe-portioning.dto';
import { DuplicateRecipeDTO, UpdateRecipeDto } from './dto/update-recipe.dto';
import { BatchMigratePackagingMaterialDto } from './dto/batch-migrate-packaging-material.dto';
import { RecipesService } from './recipes.service';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { UniqueNameService } from 'src/common/utils/uniqueNameService';
import { UniqueComponentIdValidatorService } from './decorators/unique-component-id-validator';
import { Public } from 'src/common/decorators';
import { HistoryService } from 'src/history/history.service';
import { AdminHistoryService } from 'src/admin-history/admin-history.service';
@ApiTags('Recipes')
@ApiBearerAuth('access-token')
@Controller('recipes')
// @UsePipes(new ValidationPipe({ transform: true })) // Apply validation pipe
export class RecipesController {
  constructor(
    private readonly recipesService: RecipesService,
    private readonly uniqueNameService: UniqueNameService,
    private readonly historyService: HistoryService,
    private readonly adminHistoryService: AdminHistoryService,
    private readonly uniqueComponentIdValidatorService: UniqueComponentIdValidatorService,
  ) {}
  initScheduledJobs = () => {
    const scheduledJobFunction = new CronJob('0 1 * * 6', async () => {
      console.log('Scheduled job is running to make recipes live weekly...');
      await this.recipesService.makeWeeklyLiveRecipe();
    });

    scheduledJobFunction.start();
  };
  onModuleInit() {
    this.initScheduledJobs();
  }
  @Permissions({ resource: 'recipes', actions: 'create' })
  @Post('create')
  // @ApiConsumes('multipart/form-data')
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async create(
    @Req() request: Request,
    @Body() createRecipeDto: CreateRecipeDto,
  ) {
    try {
      const user = request['user'];

      console.log('Creating', createRecipeDto);
      const isUnique = await this.uniqueNameService.isNameUnique(
        'recipe',
        'dish_name',
        createRecipeDto.dish_name.trim(),
      );
      if (!isUnique) {
        throw new HttpException(
          {
            message: `Recipe '${createRecipeDto.dish_name.trim()}' already exists!`,
            status: false,
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate component IDs and names uniqueness

      const createdRecipe = await this.recipesService.create(createRecipeDto);
      await this.historyService.createHistory(
        user._id,
        createdRecipe?._id,
        'recipe',
        message.history.HISTORY_CREATED,
        null,
        createRecipeDto,
      );
      return {
        message: message.recipe.RECIPE_CREATED,
        data: createdRecipe,
        status: true,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  // @Permissions({ resource: 'public', actions: 'read' })
  @Public()
  @Get('list')
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async findAll(@Query() listRecipeDto: ListRecipeDto) {
    try {
      const recipeData = await this.recipesService.findAll(
        listRecipeDto.dish_name,
        listRecipeDto.category_type,
        listRecipeDto.meal_category,
        listRecipeDto.protein_size,
        listRecipeDto.protein_category,
        listRecipeDto.page,
        listRecipeDto.limit,
        listRecipeDto.sort,
        listRecipeDto.order,
        listRecipeDto.is_live,
      );
      return {
        message: message.recipe.RECIPE_LIST,
        data: recipeData,
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

  @Permissions({ resource: 'public', actions: 'read' })
  @Get('list-new')
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async findAllRecipeList(@Query() listRecipeDto: ListRecipeDto) {
    try {
      console.log('listRecipe call===>', listRecipeDto);
      const recipeData = await this.recipesService.findAllRecipeList(
        listRecipeDto.dish_name,
        listRecipeDto.category_type,
        listRecipeDto.meal_category,
        listRecipeDto.protein_size,
        listRecipeDto.protein_category,
        listRecipeDto.page,
        listRecipeDto.limit,
        listRecipeDto.sort,
        listRecipeDto.order,
        listRecipeDto.is_live,
      );
      return {
        message: message.recipe.RECIPE_LIST,
        data: recipeData,
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

  @Permissions({ resource: 'recipes', actions: 'update' })
  @UsePipes(new ValidationPipe({ transform: true })) // Apply validation pipe
  @Put('update/:id')
  async update(
    @Req() request: Request,
    @Param('id') recipeId: string,
    @Body() updateRecipe: UpdateRecipeDto,
  ) {
    try {
      const user = request['user'];

      const areComponentsUnique =
        await this.uniqueComponentIdValidatorService.areComponentsUnique(
          updateRecipe,
        );

      if (!areComponentsUnique) {
        throw new HttpException(
          {
            message: 'Duplicate Sub-recipes are not allowed.',
            status: false,
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate that each component has either component_id or component_name
      if (updateRecipe?.composition?.length > 0) {
        for (const comp of updateRecipe.composition) {
          const component = comp as any; // Runtime structure differs from DTO
          const hasComponentId =
            component.component_id &&
            component.component_id.toString().trim() !== '';
          const hasComponentName =
            component.component_name &&
            component.component_name.toString().trim() !== '';

          if (!hasComponentId && !hasComponentName) {
            throw new HttpException(
              {
                message:
                  'Each component must have either component_id or component_name.',
                status: false,
                data: null,
              },
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      }

      const updateIngredient = await this.recipesService.update(
        user._id,
        recipeId,
        updateRecipe,
      );
      return {
        message: updateIngredient?.message,
        data: updateIngredient?.data,
        status: updateIngredient?.status,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Permissions({ resource: 'recipes', actions: 'update' })
  @UsePipes(new ValidationPipe({ transform: true })) // Apply validation pipe
  @Put('update-portioning')
  @ApiOperation({
    summary: 'Update recipe portioning',
    description:
      'Updates the portioning balance for recipe compositions. This endpoint allows updating portioning details including price, nutritional values (kcal, carb, fat, protein), and finalization status.',
  })
  @ApiBody({
    type: UpdateRecipePortioningDto,
    description: 'Recipe portioning update data',
    examples: {
      example1: {
        summary: 'Update portioning with composition details',
        value: {
          recipe_id: '663f12ad0dc759494fcc156a',
          protein_type: 'chicken',
          is_finalized: false,
          composition: [
            {
              component_id: '663f136e0dc759494fcc1575',
              portioning_balance: [
                {
                  type: 'small',
                  protein_type: 'chicken',
                  price: 200,
                  carb: 200,
                  kcal: 200,
                  fat: 200,
                  protein: 200,
                  is_finalized: false,
                },
              ],
            },
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Recipe portioning updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Recipe updated successfully',
        },
        data: {
          type: 'object',
          description: 'Updated recipe document',
        },
        status: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid data provided',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Invalid recipe ID or composition data',
        },
        status: {
          type: 'boolean',
          example: false,
        },
        data: {
          type: 'null',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Recipe not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Recipe not found',
        },
        status: {
          type: 'boolean',
          example: false,
        },
        data: {
          type: 'null',
        },
      },
    },
  })
  async updatePortioning(
    @Req() request: Request,
    @Body() updateRecipePortioningDto: UpdateRecipePortioningDto,
  ) {
    try {
      const user = request['user'];

      const updateRecipe = await this.recipesService.updatePortioning(
        updateRecipePortioningDto.composition,
        updateRecipePortioningDto.recipe_id,
        user,
      );

      // Log admin history for portioning update - only changed fields
      await this.adminHistoryService.createAdminHistory(
        'RECIPE_PORTIONING_UPDATE',
        user,
        null,
        updateRecipe.before_changes,
        updateRecipe.current_changes,
      );

      return {
        message: message.recipe.RECIPE_UPDATED,
        data: updateRecipe.data,
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

  @Permissions({ resource: 'recipes', actions: 'delete' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const response = await this.recipesService.remove(id);
      return {
        message: message.recipe.RECIPE_DELETE,
        data: response,
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

  @Permissions({ resource: 'recipes', actions: 'duplicate' })
  @Post('duplicate')
  // @ApiConsumes('multipart/form-data')
  @ApiBadRequestResponse({ description: 'Invalid data provided.' })
  async duplicate(
    // @Param('id') recipeId: string
    @Body(ValidationPipe) duplicateRecipeDTO: DuplicateRecipeDTO,
  ) {
    try {
      const createdDuplicateRecipe =
        await this.recipesService.duplicate(duplicateRecipeDTO);

      if (createdDuplicateRecipe) {
        return {
          message: message.recipe.RECIPE_DUPLICATE_CREATED,
          data: createdDuplicateRecipe,
          status: true,
        };
      } else {
        return {
          message: message.recipe.RECIPE_DUPLICATE_ERROR,
          data: {},
          status: false,
        };
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'recipes', actions: 'read' })
  @Get('rating')
  async getRecipeWiseRating(
    @Query() getRecipeWiseRatingDto: GetRecipeWiseRatingDto,
    @Req() request: Request,
  ) {
    try {
      const user = request['user'];
      console.log('User from token:', user);
      const result = await this.recipesService.getRecipeWiseRating(
        getRecipeWiseRatingDto.startDate,
        getRecipeWiseRatingDto.endDate,
        // getRecipeWiseRatingDto.search,
        getRecipeWiseRatingDto.page,
        getRecipeWiseRatingDto.limit,
        getRecipeWiseRatingDto.sort,
        getRecipeWiseRatingDto.order,
        getRecipeWiseRatingDto.diet_type,
        getRecipeWiseRatingDto.variant,
        getRecipeWiseRatingDto.recipe_id,
        getRecipeWiseRatingDto.rating,
        getRecipeWiseRatingDto.review,
        getRecipeWiseRatingDto.comment,
      );
      return {
        message: message.GET_DETAILS,
        data: result,
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
  @Permissions({ resource: 'recipes', actions: 'update' })
  @Post('migrate-packaging-material/:recipeId')
  @ApiOperation({
    summary: 'Migrate packaging material to portioning balance',
    description:
      'Migrates packaging material, description, and instruction from composition level to portioning_balance for a recipe. This is a data migration endpoint that should be run once per recipe.',
  })
  @ApiParam({
    name: 'recipeId',
    type: String,
    description: 'MongoDB ObjectId of the recipe to migrate',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiOkResponse({
    description: 'Migration completed successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Packaging material migration completed successfully',
        },
        data: {
          type: 'object',
          properties: {
            recipe_id: {
              type: 'string',
              example: '507f1f77bcf86cd799439011',
            },
            recipe_name: {
              type: 'string',
              example: 'Chicken Curry',
            },
            total_compositions: {
              type: 'number',
              example: 5,
            },
            total_portioning_balance: {
              type: 'number',
              example: 20,
            },
            updated_portioning_balance: {
              type: 'number',
              example: 15,
            },
            skipped: {
              type: 'number',
              example: 5,
            },
          },
        },
        status: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid recipe ID provided',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Invalid recipe ID provided',
        },
        status: {
          type: 'boolean',
          example: false,
        },
        data: {
          type: 'null',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Recipe not found',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Recipe not found',
        },
        status: {
          type: 'boolean',
          example: false,
        },
        data: {
          type: 'null',
        },
      },
    },
  })
  async migratePackagingMaterial(@Param('recipeId') recipeId: string) {
    try {
      const result =
        await this.recipesService.migratePackagingMaterialToPortioningBalance(
          recipeId,
        );
      return result;
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'recipes', actions: 'update' })
  @Post('batch-migrate-packaging-material')
  @ApiOperation({
    summary: 'Batch migrate packaging material to portioning balance',
    description:
      'Migrates packaging material, description, instruction, is_main, is_inside, is_separate, and material from composition level to portioning_balance for multiple recipes. This is a one-time migration script that processes recipes sequentially.',
  })
  @ApiBody({
    type: BatchMigratePackagingMaterialDto,
    description: 'Array of recipe IDs to migrate',
    examples: {
      example1: {
        summary: 'Example with 3 recipe IDs',
        value: {
          recipe_ids: [
            '507f1f77bcf86cd799439011',
            '507f1f77bcf86cd799439012',
            '507f1f77bcf86cd799439013',
          ],
        },
      },
      example2: {
        summary: 'Example with 100 recipe IDs',
        description: 'You can pass any number of recipe IDs (100, 500, etc.)',
        value: {
          recipe_ids: [
            '507f1f77bcf86cd799439011',
            '507f1f77bcf86cd799439012',
            // ... more IDs
          ],
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Batch migration completed',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Batch migration completed. 95 successful, 5 failed out of 100 recipes',
        },
        data: {
          type: 'object',
          properties: {
            total: {
              type: 'number',
              example: 100,
            },
            successful: {
              type: 'number',
              example: 95,
            },
            failed: {
              type: 'number',
              example: 5,
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  recipe_id: {
                    type: 'string',
                    example: '507f1f77bcf86cd799439011',
                  },
                  status: {
                    type: 'string',
                    enum: ['success', 'failed'],
                    example: 'success',
                  },
                  recipe_name: {
                    type: 'string',
                    example: 'Chicken Curry',
                  },
                  total_compositions: {
                    type: 'number',
                    example: 5,
                  },
                  total_portioning_balance: {
                    type: 'number',
                    example: 20,
                  },
                  updated_portioning_balance: {
                    type: 'number',
                    example: 20,
                  },
                  skipped: {
                    type: 'number',
                    example: 0,
                  },
                  error: {
                    type: 'string',
                    example: 'Recipe not found',
                  },
                },
              },
            },
          },
        },
        status: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid request - missing or invalid recipe IDs',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Please provide an array of recipe IDs',
        },
        status: {
          type: 'boolean',
          example: false,
        },
        data: {
          type: 'null',
        },
      },
    },
  })
  async batchMigratePackagingMaterial(
    @Body() batchMigrateDto: BatchMigratePackagingMaterialDto,
  ) {
    try {
      const result =
        await this.recipesService.batchMigratePackagingMaterialToPortioningBalance(
          batchMigrateDto.recipe_ids,
        );
      return result;
    } catch (error) {
      if (Array.isArray(error) && error[0] instanceof ValidationError) {
        handleValidationError(error as any);
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'public', actions: 'read' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const recipeData = await this.recipesService.findOne(id);
      return {
        message: message.recipe.RECIPE_LIST,
        data: recipeData,
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
}
