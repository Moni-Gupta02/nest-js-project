import { Module, ValidationPipe } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { RecipesModule } from './recipes/recipes.module';
import { IngredientModule } from './ingredient/ingredient.module';
import { AuthModule } from './auth/auth.module';
import * as dotenv from 'dotenv';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { MasterdataModule } from './masterdata/masterdata.module';
import { RolesModule } from './roles/roles.module';
import { SupplierModule } from './supplier/supplier.module';
import { HistoryModule } from './history/history.module';
import { MediaModule } from './media/media.module';
import { PackagingMaterialModule } from './packaging-material/packaging-material.module';
import { ComponentModule } from './component/component.module';
import { KitchenAppModule } from './kitchen-app/kitchen-app.module';
import { PermissionsGuard } from './common/guards/permission.guard';
import { CommonModule } from './common/common.module';
import { RecipeMenuModule } from './recipe-menu/recipe_menu.module';
// import { AuthGuard } from './auth/guards/auth.guard';
import { DeliveryModule } from './delivery/delivery.module';
import { CustomerModule } from './customer/customer.module';
import { OrderModule } from './order/order.module';
import { AddressModule } from './address/address.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { NotificationMasterModule } from './notification_master/notification_master.module';
import { NotificationHistoryModule } from './notification_history/notification_history.module';
import { CartModule } from './cart/cart.module';
import { LeadsModule } from './leads/leads.module';
import { DriverModule } from './driver/driver.module';
import { BlogsModule } from './blogs/blogs.module';
import { WebstoriesModule } from './webstories/webstories.module';
import { FoodRecipeModule } from './food-recipe/food-recipe.module';
import { PageContentModule } from './page-content/page-content.module';
import { FaqModule } from './faq/faq.module';
import { SitemapModule } from './sitemap/sitemap.module';
import { TranslationModule } from './translation/translation.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { LoggerModule } from './logger/logger.module';
import { CouponEngineModule } from './coupon-engine/coupon-engine.module';
import { BagManagementModule } from './bag-management/bag-management.module';
import { AuthorModule } from './author/author.module';
import { RewardModule } from './reward/reward.module';
import { ReportsModule } from './reports/reports.module';
import { DeliverySlotModule } from './delivery-slot/delivery-slot.module';
import { PickupOrdersModule } from './pickup-orders/pickup-orders.module';
import { AdminHistoryModule } from './admin-history/admin-history.module';
import mongoose from 'mongoose';
import { ConfigModule } from '@nestjs/config';
import { LanguageTranslatorModule } from './language-translator/language-translator.module';
import { ChefAllocationModule } from './chef_allocation/chef_allocation.module';
import { ContentModule } from './content/content.module';
import { DeliverFinanceReportsModule } from './deliver-finance-reports/deliver-finance-reports.module';
import { ActivityRuleModule } from './activity-rule/activity-rule.module';
import { ManualOperationModule } from './manual-operation/manual-operation.module';
import { VendorKitchenModule } from './vendor-kitchen/vendor-kitchen.module';
import { TranscorpReportModule } from './transcorp-report/transcorp-report.module';
import { DeliveryDriverModule } from './delivery-driver-panel/delivery-driver.module';
import { BarcodeReportModule } from './barcode-report/barcode-report.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { MoltRecipeMenuModule } from './molt-recipe-menu/molt-recipe-menu.module';
import { ReportCalenderModule } from './report-calender/report-calender.module';
dotenv.config();
const { MONGO_URL }: any = process.env;
@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(MONGO_URL),
    CommonModule,
    RecipesModule,
    IngredientModule,
    AuthModule,
    MasterdataModule,
    RolesModule,
    SupplierModule,
    HistoryModule,
    MediaModule,
    PackagingMaterialModule,
    ComponentModule,
    KitchenAppModule,
    RecipeMenuModule,
    DeliveryModule,
    CustomerModule,
    OrderModule,
    AddressModule,
    SubscriptionModule,
    NotificationMasterModule,
    NotificationHistoryModule,
    CartModule,
    LeadsModule,
    DriverModule,
    BlogsModule,
    WebstoriesModule,
    FoodRecipeModule,
    PageContentModule,
    FaqModule,
    SitemapModule,
    TranslationModule,
    NewsletterModule,
    LoggerModule,
    CouponEngineModule,
    BagManagementModule,
    AuthorModule,
    RewardModule,
    ReportsModule,
    DeliverySlotModule,
    PickupOrdersModule,
    AdminHistoryModule,
    LanguageTranslatorModule,
    ChefAllocationModule,
    ContentModule,
    DeliverFinanceReportsModule,
    ActivityRuleModule,
    CouponEngineModule,
    ManualOperationModule,
    VendorKitchenModule,
    TranscorpReportModule,
    DeliveryDriverModule,
    BarcodeReportModule,
    DashboardModule,
    MoltRecipeMenuModule,
    ReportCalenderModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule {
  constructor() {
    mongoose.set('strictPopulate', false); // Set strictPopulate to false here
  }
}
