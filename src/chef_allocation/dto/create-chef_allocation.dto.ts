import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class CreateChefAllocationDto {
  @ApiProperty({
    example: '2025-01-20',
    description: 'Date',
    required: true,
  })
  @IsString()
  @IsNotEmpty() // Ensures the array is not empty
  date: string;

  @ApiProperty({
    example: '672b18710600bfcbdb6e54be',
    description: 'menu_id',
    required: true,
  })
  @IsString()
  @IsNotEmpty() // Ensures the array is not empty
  menu_id: string;
}
export class CheckChefAllocationDto {
  @ApiProperty({
    example: '2025-01-20',
    description: 'Date',
    required: true,
  })
  @IsString()
  @IsNotEmpty() // Ensures the array is not empty
  date: string;
}
export class ChefAllocationListDto {
  @ApiProperty({
    example: '2025-01-20',
    description: 'Date',
    required: true,
  })
  @IsString()
  @IsNotEmpty() // Ensures the array is not empty
  date: string;

  @ApiProperty({
    example: 'subscription',
    description: 'delivery_type',
    required: true,
  })
  @IsString()
  @IsNotEmpty() // Ensures the array is not empty
  delivery_type: string;
}
export class ChefRecipeAllocationDto {
  @ApiProperty({
    example: '66fe47a7e40943f46bec4fd7',
    description: 'Chef ID',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  chef_id: string;

  @ApiProperty({
    example: ['67611a4abb6d997dbf29f090', '67611a4abb6d997dbf29f091'],
    description: 'Array of Recipe IDs',
    required: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true }) // Ensures each element in the array is a string
  recipe_id: string[];
}
export class WeeklyChefAllocationsDto {
  @ApiProperty({
    example: [
      {
        chef_id: '66fe47a7e40943f46bec4fd7',
        recipe_id: ['67611a4abb6d997dbf29f090', '67611a4abb6d997dbf29f091'],
      },
      {
        chef_id: '67611a4abb6d997dbf29f092',
        recipe_id: ['67611a4abb6d997dbf29f093'],
      },
    ],
    description: 'Array of chef allocations with multiple recipes',
    required: true,
  })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true }) // Validates each item in the array
  @Type(() => ChefRecipeAllocationDto) // Enables transformation and validation
  allocations: ChefRecipeAllocationDto[];

  @ApiProperty({
    example: '2025-01-20',
    description: 'Date',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({
    example: true,
    description: 'Indicates if the allocation is for the whole week',
    required: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  whole_week: boolean;
}
export class ChefAllocatedRecipeListDto {
  @ApiProperty({
    example: '65c4f2bd29fc272a83e90662',
    description: 'chef id',
    required: true,
  })
  @IsString()
  @IsNotEmpty() // Ensures the array is not empty
  chef_id: string;

  @ApiProperty({
    example: '2025-01-20',
    description: 'Date',
    required: true,
  })
  @IsString()
  @IsNotEmpty() // Ensures the array is not empty
  date: string;
}

export class GetUserlistDto {
  @ApiProperty({
    required: false,
    example: 'name', // Example search query
  })
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiProperty({
    required: false,
    example: 1, // Example page number
    description: 'Page number',
  })
  @IsOptional()
  @IsIn(['1', '-1'], { message: 'Order must be 1 or -1' })
  order?: number;

  @ApiProperty({
    required: false,
    example: 'partner_kitchen', // Example search query
  })
  @IsString()
  role?: string;

  // @ApiProperty({
  //   required: false,
  //   example: 1, // Example page number
  //   description: 'Page number',
  // })
  // @IsOptional()
  // page: number;

  // @ApiProperty({
  //   required: false,
  //   example: 10, // Example limit
  //   description: 'Number of items per page',
  // })
  // @IsOptional()
  // limit: number;
}
