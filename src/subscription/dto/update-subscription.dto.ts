import { PartialType } from '@nestjs/swagger';
import { CreateSubscriptionDto } from './create-subscription.dto';
import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {}

export class UpdateSubscriptionPriceDto {
  @IsOptional()
  @IsString()
  number_of_meal?: string;

  @IsOptional()
  @IsString()
  meal_type?: string;

  @IsOptional()
  @IsString()
  meal_tag?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsNumber()
  price_type?: number;

  @IsOptional()
  @IsNumber()
  refundable_deposite?: number;

  @IsOptional()
  @IsBoolean()
  is_mandatory?: boolean;

  @IsOptional()
  @IsNumber()
  box_deposite_monthly?: number;

  @IsOptional()
  @IsNumber()
  box_deposite_trial?: number;

  @IsOptional()
  @IsNumber()
  day_1?: number;

  @IsOptional()
  @IsNumber()
  day_5?: number;

  @IsOptional()
  @IsNumber()
  day_6?: number;

  @IsOptional()
  @IsNumber()
  day_10?: number;

  @IsOptional()
  @IsNumber()
  day_12?: number;

  @IsOptional()
  @IsNumber()
  day_20?: number;

  @IsOptional()
  @IsNumber()
  day_24?: number;

  @IsOptional()
  @IsNumber()
  day_40?: number;

  @IsOptional()
  @IsNumber()
  day_48?: number;

  @IsOptional()
  @IsNumber()
  day_60?: number;

  @IsOptional()
  @IsNumber()
  day_72?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;
}

export class UpdateSubscriptionFixPriceDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  breakfast?: string;

  @IsOptional()
  @IsString()
  evening_snack?: string;

  @IsOptional()
  @IsString()
  morning_snack?: string;

  @IsOptional()
  @IsString({ each: true })
  upselling_offers?: string[];
}

export class EditAvoidIngredientsDto {
  @ApiProperty({
    example: '6756ce1a5347dbbde9757e55',
    description: 'Subscription ID',
  })
  @IsString()
  subscription_id: string;

  @ApiProperty({
    example: ['Peanuts', 'Shellfish'],
    description: 'Array of ingredients to avoid',
  })
  @IsArray()
  avoid_ingredients: string[];
}
