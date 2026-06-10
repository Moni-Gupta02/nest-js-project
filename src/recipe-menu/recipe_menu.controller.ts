import {
  Controller,
  Post,
  Body,
  Put,
  Param,
  Get,
  HttpException,
  Delete,
  Req,
  Res,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RecipeMenuService } from './recipe_menu.service';
import { message } from 'src/common/assets';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { UpdateRecipeMenuDto } from './dto/update-recipe-menu.dto';
import { CreateRecipeMenuDto } from './dto/create-recipe-menu.dto';
import { Public } from 'src/common/decorators';
import {
  mealRecipeCountDto,
  ProgressNotificationDto,
  RecipeMenuDumpDto,
  RecipeMenuLiveDto,
} from './dto/recipe-menu-live.dto';
import { HistoryService } from 'src/history/history.service';
import { Response as NestResponse } from 'express'; // Import Response from NestJS

@ApiTags('Recipe-menu')
// @ApiBearerAuth('access-token')
@Public()
@Controller('recipe-menu')
export class RecipeMenuController {
  constructor(
    private readonly recipeMenu: RecipeMenuService,
    private readonly historyService: HistoryService,
  ) {}

  @Post('create')
  @Permissions({ resource: 'menu_live', actions: 'create' })
  @ApiOperation({ summary: 'Create a new Menu' })
  async createRecipeMenu(
    @Req() request: Request,
    @Body() createRecipeMenuDto: CreateRecipeMenuDto,
  ) {
    try {
      const user = request['user'];

      const createdRecipe =
        await this.recipeMenu.createRecipeMenu(createRecipeMenuDto);
      await this.historyService.createHistory(
        user?._id,
        createdRecipe?._id,
        'RecipeMenu',
        message.history.HISTORY_CREATED,
        null,
        createRecipeMenuDto,
      );
      return {
        message: message.recipe_menu.RECIPE_CREATED,
        data: createdRecipe,
        status: true,
      };
    } catch (error) {
      console.log(error);
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Put('update/:id')
  @Permissions({ resource: 'menu_live', actions: 'update' })
  @ApiOperation({ summary: 'Update a menu' })
  async updateRecipeMenu(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() updateRecipeMenuDto: UpdateRecipeMenuDto,
  ) {
    try {
      const user = request['user'];
      console.log(user, '--user');
      const updateRecipeData = await this.recipeMenu.updateRecipeMenu(
        user?._id,
        id,
        updateRecipeMenuDto,
      );
      return {
        message: message.recipe_menu.RECIPE_UPDATED,
        data: updateRecipeData,
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

  @Get('list')
  @Permissions({ resource: 'public', actions: 'read' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'search', required: false, example: 'Pasta' })
  async getAllRecipeMenus(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    try {
      const result = await this.recipeMenu.getAllRecipeMenu(
        page,
        limit,
        search,
      );

      return {
        message: message.recipe_menu.RECIPE_LIST,
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

  @Get(':id')
  @Permissions({ resource: 'public', actions: 'read' })
  @ApiOperation({ summary: 'Get Menu by Id ' })
  async getRecipeMenu(@Param('id') id: string) {
    try {
      const result = await this.recipeMenu.getRecipeMenu(id);
      return {
        message: message.recipe_menu.RECIPE_LIST,
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

  @Post('/duplicate/:id')
  @Permissions({ resource: 'menu_live', actions: 'update' })
  @ApiOperation({ summary: 'Duplicate a menu' })
  async duplicateMenu(@Param('id') id: string) {
    try {
      await this.recipeMenu.duplicateRecipeMenu(id);
      return {
        message: message.recipe_menu.RECIPE_DUPLICATE,
        data: null,
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

  @Delete(':id')
  @Permissions({ resource: 'menu_live', actions: 'delete' })
  @ApiOperation({ summary: 'Get Menu Delete' })
  async getRecipeMenuDelete(@Param('id') id: string) {
    try {
      await this.recipeMenu.getRecipeMenuDelete(id);
      return {
        message: message.recipe_menu.RECIPE_DELETE,
        data: null,
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

  /////////////////////////Menu Live////////////////////////////////
  @Post('dump')
  @Permissions({ resource: 'menu_live', actions: 'create' })
  @ApiOperation({ summary: 'Menu live for week' })
  async recipeMenuLive(
    @Body() recipeMenuDumpDto: RecipeMenuDumpDto,
  ): Promise<any> {
    try {
      const createdRecipe = await this.recipeMenu.recipeMenuLive(
        recipeMenuDumpDto.dates,
        recipeMenuDumpDto.menu_id,
      );

      console.log('created recipe finally', createdRecipe);

      return {
        message: createdRecipe?.message,
        data: createdRecipe?.data,
        status: createdRecipe?.status,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Post('auto-selection')
  @Permissions({ resource: 'menu_live', actions: 'create' })
  @ApiOperation({ summary: 'Menu live for week' })
  async recipeMenuAutoSelection(@Body() recipeMenuLiveDto: RecipeMenuLiveDto) {
    try {
      const createdRecipe = await this.recipeMenu.recipeMenuAutoSelection(
        recipeMenuLiveDto.dates,
        recipeMenuLiveDto.re_run,
      );

      return {
        message: message.recipe_menu.RECIPE_AUTO_SEL,
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

  @Post('notification-send')
  @Permissions({ resource: 'menu_live', actions: 'create' })
  @ApiOperation({ summary: 'Menu live for week' })
  async recipeMenuLiveAndNotificationSend(
    @Body() RecipeMenuLiveDto: RecipeMenuLiveDto,
  ) {
    try {
      const createdRecipe =
        await this.recipeMenu.recipeMenuLiveAndNotificationSend(
          RecipeMenuLiveDto.dates,
        );

      return {
        message: message.recipe_menu.RECIPE_NOTIFICATION,
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

  @Post('meal-plan-recipe-count')
  @Permissions({ resource: 'menu_live', actions: 'list' })
  @ApiOperation({
    summary: 'Get Data for Delivery Item , Meal Plan, And Recipe Count',
  })
  async getMealPlanRecipeCount(@Body() mealPlanDto: mealRecipeCountDto) {
    try {
      const result = await this.recipeMenu.getMealPlanRecipeCount(mealPlanDto);
      return {
        message: message.recipe_menu.RECIPE_MRD_COUNT,
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

  @Post('auto-selection-progress-bar')
  @Permissions({ resource: 'menu_live', actions: 'list' })
  @ApiOperation({
    summary: 'Get Progess report that how much autoselection done!',
  })
  async getProcessBarForAutoSelection(@Body() mealPlanDto: RecipeMenuLiveDto) {
    try {
      const result =
        await this.recipeMenu.getProcessBarForAutoSelection(mealPlanDto);
      return {
        message: message.recipe_menu.RECIPE_AUTO_SEL_PROGRESS,
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

  @Post('notification-progress-bar')
  @Permissions({ resource: 'menu_live', actions: 'list' })
  @ApiOperation({
    summary: 'Get Progess report that how much notification sent!',
  })
  async getProcessBarForNotification(
    @Body() mealPlanDto: ProgressNotificationDto,
  ) {
    try {
      const result =
        await this.recipeMenu.getProcessBarForNotification(mealPlanDto);
      return {
        message: message.recipe_menu.RECIPE_NOTIFICATION_PROGRESS,
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

  @Post('save-stepper-for-auto-selection-process')
  @Permissions({ resource: 'menu_live', actions: 'list' })
  @ApiOperation({
    summary: 'Get All Date is all the steps is completed or not!',
  })
  async getSaveStepperForAutoSelection(@Body() mealPlanDto: RecipeMenuLiveDto) {
    try {
      const result =
        await this.recipeMenu.getSaveStepperForAutoSelection(mealPlanDto);
      return {
        message: message.recipe_menu.RECIPE_STEPPERS,
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

  @Post('auto-selection-report')
  @Permissions({ resource: 'menu_live', actions: 'list' })
  @ApiOperation({
    summary: 'Report for autoselection',
  })
  async getReportForAutoSelection(@Body() mealPlanDto: RecipeMenuLiveDto) {
    try {
      const result =
        await this.recipeMenu.getReportForAutoSelection(mealPlanDto);
      return {
        message: message.recipe_menu.RECIPE_REPORTS,
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

  @Post('auto-selection-report-csv')
  async downloadCsv(
    @Res() res: NestResponse,
    @Body() mealPlanDto: RecipeMenuLiveDto,
  ): Promise<any> {
    try {
      const buffer = await this.recipeMenu.generateCsv(mealPlanDto);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="AutoSelection_Report.xlsx"',
      );

      res.send(buffer);
      res.end();
    } catch (error) {
      console.error('auto-selection-report-csv error:', error);
      if (error instanceof HttpException) {
        res.status(error.getStatus()).json({
          status: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          status: false,
          message: error?.message || 'Internal server error',
        });
      }
    }
  }
}
