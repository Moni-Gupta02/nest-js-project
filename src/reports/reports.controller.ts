import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpException,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Response as NestResponse } from 'express'; // Import Response from NestJS
import { message } from 'src/common/assets';
import { Permissions } from 'src/common/decorators/permission.decorator';
import { handleUnexpectedError } from 'src/common/utils/utils';
import { SurveyReportDto } from './dto/create-report.dto';
import {
  ArabyAdsCSVDto,
  ArabyAdsDto,
  DishRatingDto,
  DishReportDto,
  IngredientWeeklyReportDto,
  OverallRatingDto,
} from './dto/reports.dto';
import { ReportsService } from './reports.service';

@ApiBearerAuth('access-token')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Permissions({ resource: 'dish_rating', actions: 'read' })
  @Post('dish-rating')
  async dishRating(
    @Body() dishRatingDto: DishRatingDto,
    @Res() res: NestResponse,
  ): Promise<any> {
    try {
      const buffer: any = await this.reportsService.dishRating(dishRatingDto);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="RatingReport.xlsx"',
      );

      res.send(buffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'dish_cost', actions: 'read' })
  @Post('dish-cost-report-csv')
  async dishReport(
    @Res() res: NestResponse,
    @Body() dishReportDto: DishReportDto,
  ): Promise<any> {
    try {
      const buffer = await this.reportsService.dishCostReport(dishReportDto);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="Weekly Cost Report.xlsx"',
      );

      res.send(buffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Permissions({ resource: 'breakdown_cost', actions: 'read' })
  @Post('breakdown-cost-report-csv')
  async costReport(
    @Res() res: NestResponse,
    @Body() dishReportDto: DishReportDto,
  ): Promise<any> {
    try {
      const buffer =
        await this.reportsService.breakdownCostReport(dishReportDto);

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="Details Cost Report.xlsx"',
      );

      res.send(buffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }
  @Permissions({ resource: 'ingredient_report', actions: 'read' })
  @Post('ingredient-report-csv')
  async ingredientWeeklyReport(
    @Res() res: NestResponse,
    @Body() ingredientWeeklyReportDto: IngredientWeeklyReportDto,
  ): Promise<any> {
    const buffer = await this.reportsService.ingredientWeeklyReport(
      ingredientWeeklyReportDto,
    );
    // return {
    //   message: message.kitchen_app.UPDATE_KITCHEN_PORTINING,
    //   data: buffer,
    //   status: true,
    // };
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Ingredient Production Report.xlsx"',
    );

    res.send(buffer);
  }

  @Permissions({ resource: 'survey_report', actions: 'read' })
  @Post('survey-report-csv')
  async surveyReport(
    @Res() res: NestResponse,
    @Body() body: SurveyReportDto,
  ): Promise<any> {
    try {
      const { buffer, filename } = await this.reportsService.getSurveyReport(
        body.surveyId,
      );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      res.send(buffer);
      res.end(); // Ensure response ends properly
    } catch (error) {
      if (error instanceof BadRequestException) {
        const response: any = error.getResponse();
        res.status(error.getStatus()).json({
          status: false,
          message: response.message || 'Bad Request',
        });
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'survey_report', actions: 'read' })
  @Get('survey-list')
  async surveyList(): Promise<any> {
    const surveyData = await this.reportsService.surveyList();
    return {
      message: message.survey.SURVEY_LIST,
      data: surveyData,
      status: true,
    };
  }
  @Permissions({ resource: 'survey_report', actions: 'read' })
  @Post('survey-data')
  async surveyResponseData(@Body() body: SurveyReportDto): Promise<any> {
    const surveyData = await this.reportsService.surveyResponseData(
      body.surveyId,
    );
    return {
      message: message.survey.SURVEY_DATA,
      data: surveyData,
      status: true,
    };
  }

  @Permissions({ resource: 'recipe_wise_ingredient_report', actions: 'read' })
  @Post('recipe-wise-ingredient-report-csv')
  async recipeWiseIngredientWeeklyReport(
    @Res() res: NestResponse,
    @Body() ingredientWeeklyReportDto: IngredientWeeklyReportDto,
  ): Promise<any> {
    const buffer = await this.reportsService.recipeWiseIngredientWeeklyReport(
      ingredientWeeklyReportDto,
    );
    // return {
    //   message: message.kitchen_app.UPDATE_KITCHEN_PORTINING,
    //   data: buffer,
    //   status: true,
    // };
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Recipe Wise Ingredient Production Report.xlsx"',
    );

    res.send(buffer);
  }

  @Permissions({ resource: 'araby_ads', actions: 'read' }, { resource: 'dcm', actions: 'read' },{ resource: 'growthnity', actions: 'read' })
  @Post('araby-ads')
  async arabyAdsCampaign(
    @Body() arabyAdsDto: ArabyAdsDto,
    @Query('campaign_name') campaign_name?: string,
  ): Promise<any> {
    try {
      const response: any = await this.reportsService.arabyAdsData(
        arabyAdsDto,
        campaign_name,
      );

      return {
        message: message.arabyads.ARABYADSDATA,
        data: response,
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

  @Permissions({ resource: 'araby_ads', actions: 'read' }, { resource: 'dcm', actions: 'read' })
  @Post('araby-ads-csv')
  async arabyAdsCampaignCsv(
    @Res() res: NestResponse,
    @Body() arabyAdsCsvDto: ArabyAdsCSVDto,
    @Query('campaign_name') campaign_name?: string,
  ): Promise<any> {
    try {
      const { buffer, filename } =
        await this.reportsService.getArabyAdsReportCsv(
          arabyAdsCsvDto,
          campaign_name,
        );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      res.send(buffer);
      res.end(); // Ensure response ends properly
    } catch (error) {
      if (error instanceof BadRequestException) {
        const response: any = error.getResponse();
        res.status(error.getStatus()).json({
          status: false,
          message: response.message || 'Bad Request',
        });
      } else {
        handleUnexpectedError(error);
      }
    }
  }

  @Permissions({ resource: 'overall_rating', actions: 'read' })
  @Post('overall-rating-csv')
  async overallRatingReport(
    @Res() res: NestResponse,
    @Body() overallRatingDto: OverallRatingDto,
  ): Promise<any> {
    try {
      const buffer = await this.reportsService.overallRatingReport(
        overallRatingDto.start_date,
        overallRatingDto.end_date,
      );

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="Overall Rating Report.xlsx"',
      );

      res.send(buffer);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        handleUnexpectedError(error);
      }
    }
  }

}
