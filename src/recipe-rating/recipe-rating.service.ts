import { Injectable } from '@nestjs/common';
import { CreateRecipeRatingDto } from './dto/create-recipe-rating.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RecipeRatingDocument } from './schemas/recipe-rating.schema';
import { DeliveryDocument } from 'src/delivery/schemas/delivery.schema';
@Injectable()
export class RecipeRatingService {
  constructor(
    @InjectModel('Rating')
    private readonly recipeRatingModel: Model<RecipeRatingDocument>,
    @InjectModel('Delivery')
    private readonly deliveryModel: Model<DeliveryDocument>,
  ) {}

  async create(user, createRecipeRatingDto: CreateRecipeRatingDto) {
    const { recipe_id, rating, comment, delivery_id } = createRecipeRatingDto;
    const customerId = new Types.ObjectId(user._id);
    const recipeId = new Types.ObjectId(recipe_id);
    const deliveryId = new Types.ObjectId(delivery_id);
    // const deliveryData = await this.deliveryModel
    //   .findById(deliveryId)
    //   .select('delivery_date');
    // Check if the user has already rated this recipe
    const existingRating = await this.recipeRatingModel.findOne({
      customer_id: customerId,
      recipe_id: recipeId,
      delivery_id: deliveryId,
      // delivery_date: deliveryData.delivery_date,
    });

    if (existingRating) {
      // Update the existing rating
      existingRating.rating = rating;
      existingRating.comment = comment;
      return await existingRating.save();
    } else {
      // Create a new rating
      const newRating = new this.recipeRatingModel({
        customer_id: customerId,
        recipe_id: recipeId,
        rating,
        comment,
      });
      return await newRating.save();
    }
  }
}
