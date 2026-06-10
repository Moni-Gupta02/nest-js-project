import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PdfController } from './pdf.controller';
import { ReportCalenderController } from './report-calender.controller';
import { ReportCalenderService } from './report-calender.service';
import { KitchenSummaryReportRepository } from './report-calender.repository';
import { DeliverySchema } from '../delivery/schemas/delivery.schema';
import { DumpRecipesSchema } from '../common/schema/dump_recipes';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: 'Delivery',
        schema: DeliverySchema,
      },
      {
        name: 'Dump_Recipes',
        schema: DumpRecipesSchema,
      },
    ]),
  ],
  controllers: [ReportCalenderController, PdfController],
  providers: [ReportCalenderService, KitchenSummaryReportRepository],
  exports: [ReportCalenderService],
})
export class ReportCalenderModule { }