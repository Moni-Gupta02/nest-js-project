import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { KitchenAppService } from './kitchen-app.service';
import {
  ApiBearerAuth,
  // ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators';
import { ValidationError } from 'class-validator';
import {
  handleUnexpectedError,
  handleValidationError,
} from 'src/common/utils/utils';
import { message } from 'src/common/assets';

import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  GetKitchenRecipeListDietTypeWiseDto,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  GetKitchenRecipeListDto,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getKitchenRecipeRating,
  GetRecipePortionDto,
} from './dto/get-kitchen-app.dto';
import { Response } from 'express';
import * as fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CreateRecipePortionDto } from './dto/create-kitchen-app.dto';
import { Permissions } from 'src/common/decorators/permission.decorator';
// import * as path from 'path';
// import * as os from 'os';
// @ApiBearerAuth('access-token')
@ApiTags('kitchen-app')
@Controller('kitchen-app')
export class KitchenAppController {
  constructor(private readonly kitchenAppService: KitchenAppService) {}

  @Get('/recipes/:id/protein-types')
  @Public()
  async getUniqueProteinTypes(@Param('id') id: string): Promise<any> {
    try {
      const getProteinType =
        await this.kitchenAppService.getUniqueProteinTypes(id);
      // console.log(getProteinType);

      return {
        message: message.kitchen_app.GET_PROTEIN_TYPE,
        data: getProteinType,
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

  @ApiBearerAuth('access-token')
  @Permissions({ resource: 'recipes', actions: 'read' })
  @Post('generate-pdf')
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

  @Post('generate-report')
  @Public()
  async getRecipeReport(@Body() getRecipePortionDto: GetRecipePortionDto) {
    try {
      const getProteinType = await this.kitchenAppService.getRecipeReport(
        getRecipePortionDto.recipe_id,
        getRecipePortionDto.date,
      );
      return {
        message: message.kitchen_app.GET_PROTEIN_TYPE,
        data: getProteinType,
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
  @Post('save-portioning')
  @Public()
  async getRecipePortioningSave(
    @Body() CreateRecipePortionDto: CreateRecipePortionDto,
  ) {
    try {
      await this.kitchenAppService.getRecipePortioningSaveReport(
        CreateRecipePortionDto,
      );
      return {
        message: message.kitchen_app.GET_KITCHEN_PORTINING,
        data: message.kitchen_app.GET_KITCHEN_PORTINING,
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

  @Post('get-portioning')
  @Public()
  async getRecipePortioningData(
    @Body() GetRecipePortionDto: GetRecipePortionDto,
  ) {
    try {
      let getportining = await this.kitchenAppService.getDeliveryOrderCountNew(
        GetRecipePortionDto.date,
        GetRecipePortionDto.recipe_id,
      );
      console.log('getportining', getportining);
      if (!getportining) {
        getportining = await this.kitchenAppService.KitchenAppRecipePortioning(
          GetRecipePortionDto.recipe_id,
          GetRecipePortionDto.date,
        );
      }
      return {
        message: message.kitchen_app.UPDATE_KITCHEN_PORTINING,
        data: getportining || null,
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

  @Get('get-recipe-list')
  @Permissions({ resource: 'kitchen-cost-details', actions: 'read' })
  async getKitchenRecipeList(
    @Query() GetKitchenRecipeListDto: GetKitchenRecipeListDto,
  ) {
    try {
      const kitchenRecipeListData =
        await this.kitchenAppService.getKitchenRecipeListData(
          GetKitchenRecipeListDto.startDate,
          GetKitchenRecipeListDto.endDate,
          GetKitchenRecipeListDto.filter,
          // GetKitchenRecipeListDto.search,
          GetKitchenRecipeListDto.page,
          GetKitchenRecipeListDto.limit,
          GetKitchenRecipeListDto.sort,
          GetKitchenRecipeListDto.order,
          GetKitchenRecipeListDto.meal_category,
          // GetKitchenRecipeListDto.recipe_id,
        );

      return {
        message: message.kitchen_app.GET_KITCHEN_RECIPE_LIST,
        data: kitchenRecipeListData || null,
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

  @Get('get-recipe-list-without-cost')
  @Permissions({ resource: 'kitchen', actions: 'read' })
  async getKitchenRecipeListWithoutCost(
    @Query() GetKitchenRecipeListDto: GetKitchenRecipeListDto,
  ) {
    try {
      const kitchenRecipeListData =
        await this.kitchenAppService.getKitchenRecipeListWithoutCost(
          GetKitchenRecipeListDto.startDate,
          GetKitchenRecipeListDto.endDate,
          GetKitchenRecipeListDto.filter,
          // GetKitchenRecipeListDto.search,
          GetKitchenRecipeListDto.page,
          GetKitchenRecipeListDto.limit,
          GetKitchenRecipeListDto.sort,
          GetKitchenRecipeListDto.order,
          GetKitchenRecipeListDto.meal_category,
          // GetKitchenRecipeListDto.recipe_id,
        );

      return {
        message: message.kitchen_app.GET_KITCHEN_RECIPE_LIST,
        data: kitchenRecipeListData || null,
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

  @Get('get-recipe-with-details')
  @Permissions({ resource: 'kitchen', actions: 'read' })
  async getKitchenDietTypeWiseRecipeList(
    @Query()
    GetKitchenRecipeListDietTypeWiseDto: GetKitchenRecipeListDietTypeWiseDto,
  ) {
    try {
      const kitchenRecipeListData =
        await this.kitchenAppService.getKitchenDietTypeWiseRecipeList(
          GetKitchenRecipeListDietTypeWiseDto.startDate,
          GetKitchenRecipeListDietTypeWiseDto.endDate,
          GetKitchenRecipeListDietTypeWiseDto.filter,
          // GetKitchenRecipeListDietTypeWiseDto.search,
          GetKitchenRecipeListDietTypeWiseDto.page,
          GetKitchenRecipeListDietTypeWiseDto.limit,
          GetKitchenRecipeListDietTypeWiseDto.sort,
          GetKitchenRecipeListDietTypeWiseDto.order,
          // GetKitchenRecipeListDietTypeWiseDto.meal_category,
          GetKitchenRecipeListDietTypeWiseDto.recipe_id,
          GetKitchenRecipeListDietTypeWiseDto.protein_category,
        );

      return {
        message: message.kitchen_app.GET_KITCHEN_RECIPE_LIST,
        data: kitchenRecipeListData || null,
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

  @Get('get-recipe-wise-rating')
  @Permissions({ resource: 'kitchen', actions: 'read' })
  async getKitchenRecipeRating(
    @Query()
    getKitchenRecipeRating: getKitchenRecipeRating,
  ) {
    try {
      const kitchenRecipeListData =
        await this.kitchenAppService.getKitchenRecipeRating(
          getKitchenRecipeRating.startDate,
          getKitchenRecipeRating.endDate,
          // getKitchenRecipeRating.search,
          getKitchenRecipeRating.page,
          getKitchenRecipeRating.limit,
          getKitchenRecipeRating.sort,
          getKitchenRecipeRating.order,
          getKitchenRecipeRating.diet_type,
          getKitchenRecipeRating.protein_option,
          getKitchenRecipeRating.recipe_id,
          getKitchenRecipeRating.rating,
          getKitchenRecipeRating.review,
          getKitchenRecipeRating.comment,
          getKitchenRecipeRating.meal_category,
        );

      return {
        message: message.kitchen_app.GET_KITCHEN_RECIPE_LIST,
        data: kitchenRecipeListData || null,
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

  @Get('get-customer-wise-recipe-rating')
  @Permissions({ resource: 'kitchen', actions: 'read' })
  async getCustomerWiseKitchenRecipeRating(
    @Query()
    getKitchenRecipeRating: getKitchenRecipeRating,
  ) {
    try {
      const kitchenRecipeListData =
        await this.kitchenAppService.getCustomerWiseKitchenRecipeRating(
          getKitchenRecipeRating.startDate,
          getKitchenRecipeRating.endDate,
          // getKitchenRecipeRating.filter,
          getKitchenRecipeRating.search,
          getKitchenRecipeRating.page,
          getKitchenRecipeRating.limit,
          getKitchenRecipeRating.sort,
          getKitchenRecipeRating.order,
          getKitchenRecipeRating.meal_category,
          getKitchenRecipeRating.diet_type,
          getKitchenRecipeRating.variant,
          getKitchenRecipeRating.customer_id,
        );

      return {
        message: message.kitchen_app.GET_KITCHEN_RECIPE_LIST,
        data: kitchenRecipeListData || null,
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
}
