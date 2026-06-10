import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateRewardDto {
  @ApiProperty({
    description: 'Customer ID of the reward removal',
    type: String,
  })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'The reward amount to be removed',
    type: Number,
  })
  @IsNumber()
  addedRewards: number;

  @ApiProperty({
    description: 'loyaltyBenefits for add the reward',
    type: String,
  })
  @IsString()
  loyaltyBenefits: string;
}

export class RewardHistoryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class RemoveRewardDto {
  @ApiProperty({
    description: 'Customer ID of the reward removal',
    type: String,
  })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: 'The reward amount to be removed',
    type: Number,
  })
  @IsNumber()
  removedReward: number;

  @ApiProperty({
    description: 'Reason for removing the reward',
    type: String,
  })
  @IsString()
  reason: string;
}
