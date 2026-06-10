import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class RecipeMenuDumpDto {
  @IsArray()
  @ArrayNotEmpty() // Ensures the array is not empty
  @ArrayMinSize(1) // Ensures there is at least one date
  @ApiProperty({
    example: ['07/02/2024', '07/04/2024'],
    description: 'An array of dates in ISO 8601 string format',
    required: true,
  })
  dates: string[];

  @ApiProperty({
    example: '66828660a623464b0adb150b',
    description: 'The ObjectId of the associated recipe in string format',
    required: false,
  })
  menu_id: string;
}

export class RecipeMenuLiveDto {
  @IsArray()
  @ArrayNotEmpty() // Ensures the array is not empty
  @ArrayMinSize(1) // Ensures there is at least one date
  @ApiProperty({
    example: ['07/02/2024', '07/04/2024'],
    description: 'An array of dates in ISO 8601 string format',
    required: true,
  })
  dates: string[];

  @ApiProperty({
    example: false,
    description: 'The ObjectId of the associated recipe in string format',
    required: false,
  })
  re_run: boolean;
}

export class MenuDeliveryRecipeDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ApiProperty({
    example: ['07/02/2024', '07/04/2024'],
    description: 'An array of dates in ISO 8601 string format',
    required: true,
  })
  dates: string[];
}

export class ProgressNotificationDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  @ApiProperty({
    example: ['07/02/2024', '07/04/2024'],
    description: 'An array of dates in ISO 8601 string format',
    required: true,
  })
  dates: string[];

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '07/02/2024',
    description: 'Date on which notification is sent!',
    required: true,
  })
  current_date: string;
}

export class mealRecipeCountDto {
  @IsString()
  @IsNotEmpty() // Ensures the array is not empty
  @ApiProperty({
    example: '2024-07-01T00:00:00+05:30',
    description: 'Start date of calender month',
    required: true,
  })
  startDate: string;

  @IsString()
  @IsNotEmpty() // Ensures the array is not empty
  @ApiProperty({
    example: '2024-08-11T00:00:00+05:30',
    description: 'End date of calender month',
    required: true,
  })
  endDate: string;
}
