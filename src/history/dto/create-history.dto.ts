import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateHistoryDTO {
  @ApiProperty({ example: 'User Name/Email', description: 'Name of the user' })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name cannot be empty' })
  user_id: string;

  @ApiProperty({
    example: 'Recipe Model',
    description: 'Name of the model where keys updated',
  })
  @IsString({ message: 'Model name must be a string' })
  @IsNotEmpty({ message: 'Model name cannot be empty' })
  model_name: string;

  @ApiProperty({
    example: 'Update',
    description: 'Action create/edit etc.',
  })
  @IsString({ message: 'Action name must be a string' })
  @IsNotEmpty({ message: 'Action name cannot be empty' })
  action: string;

  @ApiProperty({
    example: '{ key : value }',
    description: 'Values before the changes.',
  })
  @IsObject()
  @IsOptional() // if this field is optional
  before_changes: object;

  @ApiProperty({
    example: '{ key : value }',
    description: 'Values after the changes.',
  })
  @IsObject()
  @IsOptional() // if this field is optional
  current_changes: object;

  @ApiProperty({
    example: '{ key : value }',
    description: 'Values after/before the changes.',
  })
  @IsObject()
  @IsOptional() // if this field is optional
  changes: object;

  @ApiProperty({
    example: '/api/recipes/create',
    description: 'endpoint of api calling!',
  })
  @IsOptional()
  @IsString({ message: 'End Point must be a string' })
  end_point: string;
}
