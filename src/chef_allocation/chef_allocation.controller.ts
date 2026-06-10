import {
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ChefAllocationService } from './chef_allocation.service';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  CheckChefAllocationDto,
  ChefAllocatedRecipeListDto,
  ChefAllocationListDto,
  CreateChefAllocationDto,
  GetUserlistDto,
  WeeklyChefAllocationsDto,
} from './dto/create-chef_allocation.dto';
import * as fs from 'fs';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { message } from 'src/common/assets';
import { ValidationError } from 'class-validator';
import { GetRecipePortionDto } from 'src/kitchen-app/dto/get-kitchen-app.dto';
import { KitchenAppService } from 'src/kitchen-app/kitchen-app.service';
import { Response } from 'express';
@Controller('chef-allocation')
@ApiBearerAuth('access-token')
export class ChefAllocationController {
  constructor(
    private readonly chefAllocationService: ChefAllocationService,
    private readonly kitchenAppService: KitchenAppService,
  ) {}

  @Post('create-from-menu')
  @Permissions({ resource: 'recipe_allocation', actions: 'create' })
  @ApiOperation({ summary: 'Chef-Allocation create-from-menu' })
  async getChefAllocationFromRecipeMenu(
    @Body() createChefAllocationDto: CreateChefAllocationDto,
  ): Promise<any> {
    try {
      const createdRecipe =
        await this.chefAllocationService.chefAllocationFromRecipeMenu(
          createChefAllocationDto.date,
          createChefAllocationDto.menu_id,
        );

      return {
        message: createdRecipe,
        ...createdRecipe,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Post('check-menu')
  @Permissions({ resource: 'recipe_allocation', actions: 'create' })
  @ApiOperation({ summary: 'Chef-Allocation check-menu' })
  async getChefAllocationMenu(
    @Body() checkChefAllocationDto: CheckChefAllocationDto,
  ): Promise<any> {
    try {
      const createdRecipe =
        await this.chefAllocationService.getChefAllocationMenu(
          checkChefAllocationDto.date,
        );

      return {
        message: createdRecipe,
        ...createdRecipe,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Post('weekly_chef_allocations')
  @Permissions({ resource: 'recipe_allocation', actions: 'create' })
  @ApiOperation({ summary: 'weekly_chef_allocations' })
  async getWeeklyChefAllocations(
    @Body() weeklyChefAllocationsDto: WeeklyChefAllocationsDto,
  ): Promise<any> {
    try {
      // Loop through each chef allocation
      const createdRecipes = await Promise.all(
        weeklyChefAllocationsDto.allocations.map(async (allocation) => {
          return await this.chefAllocationService.weeklyChefAllocations(
            weeklyChefAllocationsDto.date,
            allocation.chef_id,
            allocation.recipe_id, // Now an array
            weeklyChefAllocationsDto.whole_week,
          );
        }),
      );

      return {
        message: message.chef_allocation.CHEF_ALLOCATION_FROM_MENU,
        data: createdRecipes,
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

  @Post('get_weekly_allocations')
  @Permissions({ resource: 'recipe_allocation', actions: 'create' })
  @ApiOperation({ summary: 'get_weekly_allocations' })
  async getWeeklyAllocations(
    @Body() checkChefAllocationDto: CheckChefAllocationDto,
  ): Promise<any> {
    try {
      const chefList = await this.chefAllocationService.getWeeklyAllocations(
        checkChefAllocationDto.date,
      );

      return {
        message: message.chef_allocation.CHEF_ALLOCATION_CHEF_LIST,
        data: chefList,
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

  @Post('notifications')
  @Permissions({ resource: 'recipe_allocation', actions: 'create' })
  @ApiOperation({ summary: 'notifications' })
  async getWeeklyAllocationsNotification(
    @Body() checkChefAllocationDto: CheckChefAllocationDto,
  ): Promise<any> {
    try {
      const chefList =
        await this.chefAllocationService.getWeeklyAllocationsNotification(
          checkChefAllocationDto.date,
        );

      return {
        message: message.chef_allocation.CHEF_ALLOCATION_NOTIFICATION,
        data: chefList,
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
  @Get('get_user_list')
  @Permissions({ resource: 'recipe_allocation', actions: 'create' })
  @ApiOperation({ summary: 'get_user_list' })
  async geChefList(@Query() getUserlistDto: GetUserlistDto): Promise<any> {
    try {
      const chefList =
        await this.chefAllocationService.chefList(getUserlistDto);

      return {
        message: message.chef_allocation.CHEF_ALLOCATION_CHEF_LIST,
        data: chefList,
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

  @Post('recipe-list')
  @Permissions({ resource: 'recipe_allocation', actions: 'create' })
  @ApiOperation({ summary: 'recipe-list' })
  async getChefAllocationList(
    @Body() chefAllocationListDto: ChefAllocationListDto,
  ): Promise<any> {
    try {
      const createdRecipe = await this.chefAllocationService.chefAllocationList(
        chefAllocationListDto.date,
        chefAllocationListDto.delivery_type,
      );

      return {
        message: message.chef_allocation.CHEF_ALLOCATION_FROM_MENU,
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

  @Post('chef-allocated-recipe-list')
  @Permissions({ resource: 'partner_kitchen_allocation', actions: 'read' })
  @ApiOperation({ summary: 'chef-allocated-recipe-list' })
  async getChefAllocatedRecipeList(
    @Body() chefAllocatedRecipeListDto: ChefAllocatedRecipeListDto,
  ): Promise<any> {
    try {
      const createdRecipe =
        await this.chefAllocationService.chefAllocatedRecipeList(
          chefAllocatedRecipeListDto.date,
          chefAllocatedRecipeListDto.chef_id,
        );

      return {
        message: message.chef_allocation.CHEF_ALLOCATION_FROM_MENU,
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

  @Post('generate-pdf')
  @Permissions({ resource: 'partner_kitchen_allocation', actions: 'read' })
  @ApiOperation({ summary: 'Generate PDF' })
  @ApiResponse({
    status: 200,
    description: 'The generated PDF file',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async generatePdf(
    @Req() request: Request, // Ensure `req` is available
    @Res() res: Response,
    @Body() getRecipePortionDto: GetRecipePortionDto,
  ) {
    try {
      const user = request['user'];
      console.log('User from token:', user);
      const pdfFilePath = await this.kitchenAppService.createPdf(
        getRecipePortionDto,
        user,
      );
      // Sanitize filename: replace spaces with underscores and remove any characters that could break HTTP headers
      const sanitizedFileName = pdfFilePath.filename
        .replace(/\s+/g, '_')
        .replace(/[^\w\-_.]/g, '_'); // Replace any non-alphanumeric chars (except - _ .) with underscore
      
      // console.log(pdfFilePath);
      res.set({
        'Content-Type': 'application/pdf',
        // Properly quote the filename to handle special characters
        'Content-Disposition': `attachment; filename="${sanitizedFileName}"`,
      });

      const fileStream = fs.createReadStream(pdfFilePath.pdfFilePath);
      fileStream.pipe(res);

      fileStream.on('close', () => {
        fs.unlink(pdfFilePath.pdfFilePath, (err) => {
          if (err) {
            console.error(`Error deleting temp file: ${err.message}`);
          }
        });
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        handleValidationError(error);
      } else {
        handleUnexpectedError(error);
      }
    }
  }
}
