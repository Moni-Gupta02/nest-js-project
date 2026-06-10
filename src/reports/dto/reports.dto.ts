import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class DishRatingDto {
  @IsString()
  @ApiProperty({
    example: '2024/12/08',
    description: 'Start Date',
    required: true,
  })
  start_date: Date;

  @IsString()
  @ApiProperty({
    example: '2024/12/08',
    description: 'End Date',
    required: true,
  })
  end_date: Date;
}

export class DishReportDto {
  @IsString()
  @ApiProperty({
    example: '12/02/2024',
    required: true,
  })
  start_date: string;

  @IsString()
  @ApiProperty({
    example: '12/07/2024',
    required: true,
  })
  end_date: string;
}

export class IngredientWeeklyReportDto {
  @IsString()
  @ApiProperty({
    example: '12/02/2024',
    required: true,
  })
  start_date: string;

  @IsString()
  @ApiProperty({
    example: '12/07/2024',
    required: true,
  })
  end_date: string;
}

export class ArabyAdsDto {
  @IsString()
  @ApiProperty({
    example: '2024/12/08',
    description: 'Start Date',
    required: true,
  })
  start_date: Date;

  @IsString()
  @ApiProperty({
    example: '2024/12/08',
    description: 'End Date',
    required: true,
  })
  end_date: Date;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: 'Search',
    description: 'Search',
  })
  search: string;

  @IsNumber()
  @ApiProperty({
    example: 1,
    description: 'Page Number',
  })
  page: number;

  @IsNumber()
  @ApiProperty({
    example: 10,
    description: 'Limit',
  })
  limit: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    example: 30,
    description: 'Churn Days',
  })
  churn_days: number;
}

export class ArabyAdsCSVDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({
    example: 30,
    description: 'Churn Days',
  })
  churn_days: number;
}

export class OverallRatingDto {
  @IsString()
  @ApiProperty({
    example: '2024/12/08',
    description: 'Start Date',
    required: true,
  })
  start_date: string;

  @IsString()
  @ApiProperty({
    example: '2024/12/08',
    description: 'End Date',
    required: true,
  })
  end_date: string;
}
