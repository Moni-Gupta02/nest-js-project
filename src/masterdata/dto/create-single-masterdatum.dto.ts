import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

/** Accepts ISO strings or MongoDB extended JSON `{ "$date": "..." }`. */
export function normalizeIsoDateString({ value }: { value: unknown }): unknown {
  if (value == null) return value;
  if (typeof value === 'string') return value;
  if (
    typeof value === 'object' &&
    '$date' in (value as Record<string, unknown>)
  ) {
    return (value as { $date: string }).$date;
  }
  return value;
}

// Nested classes for coupon value
export class ColorsDto {
  @ApiProperty({ example: '#FF5733' })
  @IsString()
  cardBackground: string;

  @ApiProperty({ example: '#333333' })
  @IsString()
  closeBtnBackground: string;

  @ApiProperty({ example: '#00FF00' })
  @IsString()
  thankYouCardBackground: string;
}

export class OfferScreenDto {
  @ApiProperty({ example: 'Special Offer' })
  @IsString()
  subtitle: string;

  @ApiProperty({ example: '10% OFF' })
  @IsString()
  discountText: string;

  @ApiProperty({ example: 'Renew and Save' })
  @IsString()
  renewalText: string;

  @ApiProperty({ example: 'Min order $50' })
  @IsString()
  minimumText: string;

  @ApiProperty({ example: 'Apply Now' })
  @IsString()
  buttonText: string;

  @ApiPropertyOptional({ example: 'Thankyou for joining delicut' })
  @IsString()
  @IsOptional()
  headerTextWeb?: string;

  @ApiProperty({ example: '26%' })
  @IsString()
  discountWeb: string;

  @ApiPropertyOptional({ example: 'Chovatiya' })
  @IsString()
  @IsOptional()
  footerTextWeb?: string;

  @ApiPropertyOptional({ example: 'Mitul' })
  @IsString()
  @IsOptional()
  subTextWeb?: string;

  @ApiPropertyOptional({ example: 'Limited time offer' })
  @IsString()
  @IsOptional()
  offerTypeTextWeb?: string;
}

export class ThankYouScreenDto {
  @ApiProperty({ example: 'Thank You!' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Your coupon has been applied' })
  @IsString()
  subtitle: string;
}

export enum CustomerType {
  NEW = 'new',
  RENEW = 're-new',
}

export class CouponValueDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  discountCode: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  is_default: boolean;

  @ApiProperty({ type: ColorsDto })
  @ValidateNested()
  @Type(() => ColorsDto)
  colors: ColorsDto;

  @ApiProperty({ type: OfferScreenDto })
  @ValidateNested()
  @Type(() => OfferScreenDto)
  offerScreen: OfferScreenDto;

  @ApiProperty({ type: ThankYouScreenDto })
  @ValidateNested()
  @Type(() => ThankYouScreenDto)
  thankYouScreen: ThankYouScreenDto;

  @ApiPropertyOptional({ example: '2026-01-05T00:00:00.000Z' })
  @Transform(normalizeIsoDateString)
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-02-05T23:59:59.000Z' })
  @Transform(normalizeIsoDateString)
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ enum: CustomerType, example: 'new' })
  @IsEnum(CustomerType)
  type_of_customer: CustomerType;

  @ApiProperty({ example: 'email', required: false })
  @IsString()
  @IsOptional()
  channel?: string;

  @ApiProperty({ example: 'Summer Sale 2026', required: false })
  @IsString()
  @IsOptional()
  campaignName?: string;

  @ApiProperty({ example: 'CMP-2026-001', required: false })
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiProperty({ example: 'promotional', required: false })
  @IsString()
  @IsOptional()
  category?: string;
}

// Flat DTO for frontend (accepts flat format)
export class CreateMasterdataCouponDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  discountCode: string;

  @ApiProperty({ example: 'email', required: false })
  @IsString()
  @IsOptional()
  channel?: string;

  @ApiProperty({ example: 'Summer Sale 2026', required: false })
  @IsString()
  @IsOptional()
  campaignName?: string;

  @ApiProperty({ example: 'CMP-2026-001', required: false })
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiProperty({ example: 'promotional', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;

  @ApiProperty({ type: ColorsDto })
  @ValidateNested()
  @Type(() => ColorsDto)
  colors: ColorsDto;

  @ApiProperty({ type: OfferScreenDto })
  @ValidateNested()
  @Type(() => OfferScreenDto)
  offerScreen: OfferScreenDto;

  @ApiProperty({ type: ThankYouScreenDto })
  @ValidateNested()
  @Type(() => ThankYouScreenDto)
  thankYouScreen: ThankYouScreenDto;

  @ApiPropertyOptional({ example: '2026-01-05T00:00:00.000Z' })
  @Transform(normalizeIsoDateString)
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-02-05T23:59:59.000Z' })
  @Transform(normalizeIsoDateString)
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ enum: CustomerType, example: 'new' })
  @IsEnum(CustomerType)
  type_of_customer: CustomerType;
}

// Update DTOs - all fields optional
export class UpdateColorsDto {
  @ApiProperty({ example: '#FF5733' })
  @IsString()
  cardBackground: string;

  @ApiProperty({ example: '#333333' })
  @IsString()
  closeBtnBackground: string;

  @ApiProperty({ example: '#00FF00' })
  @IsString()
  thankYouCardBackground: string;
}

export class UpdateOfferScreenDto {
  @ApiProperty({ example: 'Special Offer' })
  @IsString()
  subtitle: string;

  @ApiProperty({ example: '10% OFF' })
  @IsString()
  discountText: string;

  @ApiProperty({ example: 'Renew and Save' })
  @IsString()
  renewalText: string;

  @ApiProperty({ example: 'Min order $50' })
  @IsString()
  minimumText: string;

  @ApiProperty({ example: 'Apply Now' })
  @IsString()
  buttonText: string;

  @ApiPropertyOptional({ example: 'Thankyou for joining delicut' })
  @IsString()
  @IsOptional()
  headerTextWeb?: string;

  @ApiProperty({ example: '26%' })
  @IsString()
  discountWeb: string;

  @ApiPropertyOptional({ example: 'Chovatiya' })
  @IsString()
  @IsOptional()
  footerTextWeb?: string;

  @ApiPropertyOptional({ example: 'Mitul' })
  @IsString()
  @IsOptional()
  subTextWeb?: string;

  @ApiPropertyOptional({ example: 'Limited time offer' })
  @IsString()
  @IsOptional()
  offerTypeTextWeb?: string;
}

export class UpdateThankYouScreenDto {
  @ApiProperty({ example: 'Thank You!' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Your coupon has been applied' })
  @IsString()
  subtitle: string;
}

export class UpdateCouponValueDto {
  @ApiPropertyOptional({ example: 'WELCOME10' })
  @IsString()
  @IsOptional()
  discountCode?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;

  @ApiPropertyOptional({ type: UpdateColorsDto })
  @ValidateNested()
  @Type(() => UpdateColorsDto)
  @IsOptional()
  colors?: UpdateColorsDto;

  @ApiPropertyOptional({ type: UpdateOfferScreenDto })
  @ValidateNested()
  @Type(() => UpdateOfferScreenDto)
  @IsOptional()
  offerScreen?: UpdateOfferScreenDto;

  @ApiPropertyOptional({ type: UpdateThankYouScreenDto })
  @ValidateNested()
  @Type(() => UpdateThankYouScreenDto)
  @IsOptional()
  thankYouScreen?: UpdateThankYouScreenDto;

  @ApiPropertyOptional({ example: '2026-01-05T00:00:00.000Z' })
  @Transform(normalizeIsoDateString)
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-02-05T23:59:59.000Z' })
  @Transform(normalizeIsoDateString)
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ enum: CustomerType, example: 'new' })
  @IsEnum(CustomerType)
  @IsOptional()
  type_of_customer?: CustomerType;

  @ApiPropertyOptional({ example: 'email' })
  @IsString()
  @IsOptional()
  channel?: string;

  @ApiPropertyOptional({ example: 'Summer Sale 2026' })
  @IsString()
  @IsOptional()
  campaignName?: string;

  @ApiPropertyOptional({ example: 'CMP-2026-001' })
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiPropertyOptional({ example: 'promotional' })
  @IsString()
  @IsOptional()
  category?: string;
}

// Flat DTO for update (accepts flat format)
export class UpdateMasterdataCouponDto {
  @ApiProperty({ example: 'WELCOME10' })
  @IsString()
  discountCode: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  is_default?: boolean;

  @ApiProperty({ type: UpdateColorsDto })
  @ValidateNested()
  @Type(() => UpdateColorsDto)
  colors: UpdateColorsDto;

  @ApiProperty({ type: UpdateOfferScreenDto })
  @ValidateNested()
  @Type(() => UpdateOfferScreenDto)
  offerScreen: UpdateOfferScreenDto;

  @ApiProperty({ type: UpdateThankYouScreenDto })
  @ValidateNested()
  @Type(() => UpdateThankYouScreenDto)
  thankYouScreen: UpdateThankYouScreenDto;

  @ApiPropertyOptional({ example: '2026-01-05T00:00:00.000Z' })
  @Transform(normalizeIsoDateString)
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-02-05T23:59:59.000Z' })
  @Transform(normalizeIsoDateString)
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ enum: CustomerType, example: 'new' })
  @IsEnum(CustomerType)
  type_of_customer: CustomerType;

  @ApiPropertyOptional({ example: 'email' })
  @IsString()
  @IsOptional()
  channel?: string;

  @ApiPropertyOptional({ example: 'Summer Sale 2026' })
  @IsString()
  @IsOptional()
  campaignName?: string;

  @ApiPropertyOptional({ example: 'CMP-2026-001' })
  @IsString()
  @IsOptional()
  campaignId?: string;

  @ApiPropertyOptional({ example: 'promotional' })
  @IsString()
  @IsOptional()
  category?: string;
}
