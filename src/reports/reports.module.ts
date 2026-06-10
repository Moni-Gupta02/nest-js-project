import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { DumpRecipesSchema } from 'src/common/schema/dump_recipes';
import { SurveySchema } from 'src/common/schema/survey';
import { SurveyResponseSchema } from 'src/common/schema/survey_response';
import { ComponentSchema } from 'src/component/Schemas/component.schema';
import { CouponSchema } from 'src/coupon-engine/schemas/coupon-engine.schema';
import { CustomerSchema } from 'src/customer/schemas/customer.schema';
import { DeliverySchema } from 'src/delivery/schemas/delivery.schema';
import { IngredientSchema } from 'src/ingredient/schemas/ingredient.schema';
import { KitchenAppService } from 'src/kitchen-app/kitchen-app.service';
import { KitchenAppRecipeSchema } from 'src/kitchen-app/Schemas/kitchen-app.entity';
import { NotificationMasterModule } from 'src/notification_master/notification_master.module';
import { OrderSchema } from 'src/order/schemas/order.schema';
import { RecipeRatingSchema } from 'src/recipe-rating/schemas/recipe-rating.schema';
import { RecipeSchema } from 'src/recipes/schemas/recipe.schema';
import { supplierSchema } from 'src/supplier/schemas/supplier.schemas';
import { ReportsController } from './reports.controller';
import { ReportsScheduler } from './reports.scheduler';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Rating', schema: RecipeRatingSchema },
      { name: 'Recipes_Detail', schema: RecipeSchema },
      { name: 'Component', schema: ComponentSchema },
      { name: 'Ingredient', schema: IngredientSchema },
      { name: 'Deliveries', schema: DeliverySchema },
      { name: 'Dump_Recipes', schema: DumpRecipesSchema },
      { name: 'Kitchen_Recipe_portining', schema: KitchenAppRecipeSchema },
      { name: 'Supplier', schema: supplierSchema },
      { name: 'Survey_responses', schema: SurveyResponseSchema },
      { name: 'Survey', schema: SurveySchema },
      { name: 'Customers', schema: CustomerSchema },
      { name: 'Coupons', schema: CouponSchema },
      { name: 'Orders', schema: OrderSchema },
    ]),
    HttpModule,
    NotificationMasterModule,
    ScheduleModule.forRoot(), // ✅ required — add once at root or here
  ],
  controllers: [ReportsController],
  providers: [ReportsService, KitchenAppService,ReportsScheduler],
})
export class ReportsModule {}
