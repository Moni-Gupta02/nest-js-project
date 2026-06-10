import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateWhoWeServeDto {
  @ApiProperty({ example: 'People Group' })
  @IsString()
  people: string;

  @ApiProperty({ example: 'Header Content' })
  @IsString()
  header: string;

  @ApiProperty({ example: 'Title' })
  @IsString()
  testimonial_title: string;

  @ApiProperty({ example: 'Description' })
  @IsString()
  testimonial_description: string;

  @ApiProperty({ example: 'By John Doe' })
  @IsString()
  testimonial_by: string;

  @ApiProperty({ example: 'Card Title' })
  @IsString()
  card_title: string;

  @ApiProperty({ example: 'Card Description' })
  @IsString()
  card_description: string;

  @ApiProperty()
  faqs: Array<{ question: string; answer: string }>;

  @ApiProperty({ example: 'slug-for-location' })
  @IsString()
  slug: string;
}

export class UpdateWhoWeServeDto extends CreateWhoWeServeDto {}

export class OptionalListFilterDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, default: 10 })
  @IsOptional()
  limit?: number;
}
