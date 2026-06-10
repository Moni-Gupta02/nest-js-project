import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecipeMenuService } from './recipe_menu.service';
import { RecipeMenuSchema } from './Schemas/recipe_menu.schema';
import { RecipeMenuController } from './recipe_menu.controller';
import { RecipeSchema } from 'src/recipes/schemas/recipe.schema';
import { DumpRecipesSchema } from 'src/common/schema/dump_recipes';
import { SubscriptionSchema } from 'src/subscription/schemas/subscription.schema';
import { DeliverySchema } from 'src/delivery/schemas/delivery.schema';
import { CustomerSchema } from 'src/customer/schemas/customer.schema';
import { NotificationMasterService } from 'src/notification_master/notification_master.service';
import { NotificationHistorySchema } from 'src/notification_history/schemas/notification_history.schema';
import { NotificationMasterSchema } from 'src/notification_master/schemas/notification_master.schemas';
import { HistoryService } from 'src/history/history.service';
import { HistorySchema } from 'src/history/Schemas/history.schema';
import { MasterDataSchema } from 'src/masterdata/Schemas/masterdata.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Recipe_Menu', schema: RecipeMenuSchema },
      { name: 'Recipes_Detail', schema: RecipeSchema },
      { name: 'Dump_Recipes', schema: DumpRecipesSchema },
      { name: 'Deliveries', schema: DeliverySchema },
      { name: 'Subscriptions', schema: SubscriptionSchema },
      { name: 'Customers', schema: CustomerSchema },
      { name: 'Notification_Histories', schema: NotificationHistorySchema },
      { name: 'Notification_Masters', schema: NotificationMasterSchema },
      { name: 'History', schema: HistorySchema },
      { name: 'MasterDataKMS', schema: MasterDataSchema },
    ]),
  ],
  controllers: [RecipeMenuController],
  providers: [RecipeMenuService, NotificationMasterService, HistoryService],
  exports: [RecipeMenuService],
})
export class RecipeMenuModule {}
