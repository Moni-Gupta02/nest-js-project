import { ApiProperty } from '@nestjs/swagger';

export class FoodRecipeDto {
  @ApiProperty({ example: 'Recipe Name' })
  recipe_name: string;

  @ApiProperty({ example: 'https://example.com/image.jpg' })
  image: string;

  @ApiProperty({ example: 'https://example.com/thumbnail.jpg' })
  thumbnail_image: string;

  @ApiProperty({ example: 'A tasty and nutritious recipe...' })
  about: string;

  @ApiProperty({ example: 'Ingredients of the recipe' })
  ingredients: string;

  @ApiProperty({ example: 'Dressing details' })
  dressings: string;

  @ApiProperty({ type: () => [ProteinChoiceDto] })
  choice_of_protein: ProteinChoiceDto[];

  @ApiProperty({ type: () => [NutritionalInfoDto] })
  nutritional_info: NutritionalInfoDto[];

  @ApiProperty({ type: () => [VitaminsAndMineralsDto] })
  vitamins_and_minerals: VitaminsAndMineralsDto[];

  @ApiProperty({ example: 'Step-by-step instructions' })
  instructions: string;

  @ApiProperty({ example: 'Description for whom it is best suited' })
  best_suited_for_description: string;

  @ApiProperty({ example: 'When to eat this dish' })
  when_to_eat_description: string;

  @ApiProperty({ type: () => [BestSuitedForContentDto] })
  best_suited_for_content: BestSuitedForContentDto[];

  @ApiProperty({ example: 'Best time to eat' })
  when_to_eat: string;

  @ApiProperty({ example: 'Comments from foodies' })
  foodies_say: string;

  @ApiProperty({ example: 'Conclusion about the recipe' })
  conclusion: string;

  @ApiProperty({ type: () => [FaqDto] })
  faqs: FaqDto[];

  @ApiProperty({ example: 'Calories in kcal' })
  kcal: string;

  @ApiProperty({ example: 'Carbohydrate content' })
  carb: string;

  @ApiProperty({ example: 'Protein content' })
  protein: string;

  @ApiProperty({ example: 'Fat content' })
  fat: string;

  @ApiProperty({ example: 'Cuisine type' })
  cuisine: string;

  @ApiProperty({ example: 'Cooking time' })
  cooking_time: string;

  @ApiProperty({ example: 'SEO meta title' })
  meta_title: string;

  @ApiProperty({ example: 'SEO meta description' })
  meta_description: string;

  @ApiProperty({ example: 'URL-friendly slug' })
  slug: string;
}

export class ProteinChoiceDto {
  @ApiProperty({ example: 'Protein ID' })
  _id: string;

  @ApiProperty({ example: 'Protein Title' })
  title: string;

  @ApiProperty({ example: 'Protein Description' })
  description: string;
}

export class NutritionalInfoDto {
  @ApiProperty({ example: 'Info ID' })
  _id: string;

  @ApiProperty({ example: 'Key Nutrient' })
  key: string;

  @ApiProperty({ example: 'Value' })
  value: string;
}

export class VitaminsAndMineralsDto {
  @ApiProperty({ example: 'Vitamin ID' })
  _id: string;

  @ApiProperty({ example: 'Key Vitamin/Mineral' })
  key: string;

  @ApiProperty({ example: 'Value' })
  value: string;
}

export class BestSuitedForContentDto {
  @ApiProperty({ example: 'Content ID' })
  _id: string;

  @ApiProperty({ example: 'Title' })
  title: string;

  @ApiProperty({ example: 'Description' })
  description: string;
}

export class FaqDto {
  @ApiProperty({ example: 'FAQ ID' })
  _id: string;

  @ApiProperty({ example: 'FAQ Question' })
  question: string;

  @ApiProperty({ example: 'FAQ Answer' })
  answer: string;
}

export class OptionalListFilterDto {
  @ApiProperty({ example: 'search-term', required: false })
  search?: string;

  @ApiProperty({ example: 1, required: false })
  page?: number;

  @ApiProperty({ example: 10, required: false })
  limit?: number;
}
