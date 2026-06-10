import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
export class CreateSubscriptionDto {}

class EditDetails {
  @IsNumber()
  price: number; // Mandatory

  @IsString()
  type: string; // Mandatory

  @IsArray()
  @IsNumber({}, { each: true })
  deliveries: number[]; // Mandatory

  [key: string]: any; // Allows additional optional keys
}

export class PartialSubscriptionCancelDto {
  @ApiProperty({
    description: 'Subscription ID',
    example: '675c2a73c38f1153d80c9bb2',
  })
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @ApiProperty({
    description: 'Order ID',
    example: '675c2a15c38f1153d80c9b98',
  })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    example: '19/12/2024',
    description: 'Pick-up date in DD/MM/YYYY format',
  })
  @IsNotEmpty()
  @IsString()
  startDate: string;

  @ApiProperty({
    description: 'Name of the person initiating the cancellation',
    example: 'Vikas',
  })
  @IsString()
  @IsNotEmpty()
  cancelled_by_name: string;

  @ApiProperty({
    description: 'Email of the person initiating the cancellation',
    example: 'vikas@xyz.com',
  })
  @IsString()
  @IsNotEmpty()
  cancelled_by_email: string;

  @ApiProperty({
    description: 'Reason for the cancellation',
    example: 'Leaving the country',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({
    description: 'Refund amount for the cancellation',
    example: 2,
  })
  @IsNumber()
  @IsNotEmpty()
  refund: number;

  @ApiProperty({
    description: 'Additional details about the cancellation',
    example: '12',
  })
  @IsString()
  @IsNotEmpty()
  details: string;

  @IsObject()
  @ValidateNested()
  @Type(() => EditDetails)
  editDetails: EditDetails;

  @IsString()
  @IsOptional()
  customer_id?: string;
}
