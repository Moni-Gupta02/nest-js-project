import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ChefAllocationController } from './chef_allocation.controller';
import { ChefAllocationService } from './chef_allocation.service';
import { ChefAllocationSchema } from './Schemas/chef_allocation.schema';
import { RecipeMenuSchema } from 'src/recipe-menu/Schemas/recipe_menu.schema';
import { RecipeSchema } from 'src/recipes/schemas/recipe.schema';
import { UserSchema } from 'src/auth/Schemas/auth.schema';
import { KitchenAppService } from 'src/kitchen-app/kitchen-app.service';
import { DumpRecipesSchema } from 'src/common/schema/dump_recipes';
import { KitchenAppRecipeSchema } from 'src/kitchen-app/Schemas/kitchen-app.entity';
import { ComponentSchema } from 'src/component/Schemas/component.schema';
import { IngredientSchema } from 'src/ingredient/schemas/ingredient.schema';
import { DeliverySchema } from 'src/delivery/schemas/delivery.schema';
import { supplierSchema } from 'src/supplier/schemas/supplier.schemas';
import { RecipeRatingSchema } from 'src/recipe-rating/schemas/recipe-rating.schema';
import { NotificationMasterService } from 'src/notification_master/notification_master.service';
import { NotificationHistorySchema } from 'src/notification_history/schemas/notification_history.schema';
import { NotificationMasterSchema } from 'src/notification_master/schemas/notification_master.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Chef_allocation', schema: ChefAllocationSchema },
      { name: 'Recipe_Menu', schema: RecipeMenuSchema },
      { name: 'Recipes_Detail', schema: RecipeSchema },
      { name: 'userKMS', schema: UserSchema },
      { name: 'Kitchen_Recipe_portining', schema: KitchenAppRecipeSchema },
      { name: 'Dump_Recipes', schema: DumpRecipesSchema },
      { name: 'Component', schema: ComponentSchema },
      { name: 'Ingredient', schema: IngredientSchema },
      { name: 'Deliveries', schema: DeliverySchema },
      { name: 'Dump_Recipes', schema: DumpRecipesSchema },
      { name: 'Supplier', schema: supplierSchema },
      { name: 'Rating', schema: RecipeRatingSchema },
      { name: 'Notification_Histories', schema: NotificationHistorySchema },
      { name: 'Notification_Masters', schema: NotificationMasterSchema },
    ]),
  ],
  controllers: [ChefAllocationController],
  providers: [
    ChefAllocationService,
    KitchenAppService,
    NotificationMasterService,
  ],
  exports: [ChefAllocationService, KitchenAppService],
})
export class ChefAllocationModule {}
