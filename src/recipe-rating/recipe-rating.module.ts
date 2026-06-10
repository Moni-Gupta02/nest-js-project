import { Module } from '@nestjs/common';
import { RecipeRatingService } from './recipe-rating.service';
import { RecipeRatingController } from './recipe-rating.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { RecipeRatingSchema } from './schemas/recipe-rating.schema';
import { DeliverySchema } from 'src/delivery/schemas/delivery.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Rating', schema: RecipeRatingSchema },
      { name: 'Delivery', schema: DeliverySchema },
    ]),
  ],
  controllers: [RecipeRatingController],
  providers: [RecipeRatingService],
})
export class RecipeRatingModule {}
