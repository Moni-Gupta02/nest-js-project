import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  registerDecorator,
  Validate,
  ValidateIf,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as moment from 'moment';

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

// function IsValidPartialStartDate(validationOptions?: ValidationOptions) {
//   return (object: any, propertyName: string) => {
//     registerDecorator({
//       name: 'isValidPartialStartDate',
//       target: object.constructor,
//       propertyName,
//       options: validationOptions,
//       validator: {
//         validate(value: string, args: ValidationArguments) {
//           if (!value) return false;

//           // Calculate Dubai time manually (UTC+4)
//           const now = moment().utcOffset(240); // Add 4 hours to get Dubai time
//           const targetDate = moment(value, 'YYYY-MM-DD', true); // Parse input date

//           // Determine expected date based on Dubai time
//           const expectedDate =
//             now.hour() < 12
//               ? now.add(2, 'days').startOf('day')
//               : now.add(3, 'days').startOf('day');

//           // Check if the input date is greater than or equal to the expected date
//           return targetDate.isSameOrAfter(expectedDate, 'day');
//         },
//         defaultMessage(args: ValidationArguments) {
//           const now = moment().utcOffset(240); // Add 4 hours to get Dubai time
//           const expectedDate =
//             now.hour() < 12
//               ? now.add(2, 'days').format('YYYY-MM-DD')
//               : now.add(3, 'days').format('YYYY-MM-DD');
//           return `partialStartDate should be on or after ${expectedDate} based on Dubai time`;
//         },
//       },
//     });
//   };
// }

export class PartialSubscriptionCancelDto {
  @ApiProperty({ example: 'John Doe' })
  cancelled_by_name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  cancelled_by_email: string;

  @ApiProperty({ example: 'Reason for cancellation' })
  reason: string;

  @ApiProperty({ example: 100.5 })
  refund: number;

  @ApiProperty({ example: 'Details about the cancellation' })
  details: string;
}
// DTO (Data Transfer Object)
export class InitiateBagRefundDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  customer_id: string;
}

export class CompleteSubscriptionCancelDto {
  @ApiProperty({
    description: 'Subscription ID',
    example: '675c2a73c38f1153d80c9bb2',
  })
  @IsString()
  @IsNotEmpty()
  subscriptionId: string;

  @ApiProperty({ description: 'Order ID', example: '675c2a15c38f1153d80c9b98' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({
    description: 'Name of the person canceling',
    example: 'Vikas',
  })
  @IsString()
  @IsNotEmpty()
  cancelled_by_name: string;

  @ApiProperty({
    description: 'Email of the person canceling',
    example: 'vikas@xyz.com',
  })
  @IsString()
  @IsNotEmpty()
  cancelled_by_email: string;

  @ApiProperty({
    description: 'Reason for cancellation',
    example: 'Leaving the country',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ description: 'Refund amount', example: 20 })
  @IsNumber()
  refund: number;

  @ApiProperty({ description: 'Details of the cancellation', example: 'atest' })
  @IsString()
  @IsNotEmpty()
  details: string;

  @IsObject()
  @ValidateNested()
  @Type(() => EditDetails)
  editDetails: EditDetails;

  @IsString()
  @IsOptional()
  customer_id: string;
}

export class AutoSelectionForParticularDto {
  @ApiProperty({
    example: '60c72b2f9b1e8b3f8c8f8b3e',
    description: 'Customer ID',
  })
  @IsString()
  customer_id: string;

  @ApiProperty({ example: '60c72b2f9b1e8b3f8c8f8b3e', description: 'Order ID' })
  @IsString()
  order_id: string;

  @ApiProperty({
    example: '60c72b2f9b1e8b3f8c8f8b3e',
    description: 'Subscription ID',
  })
  @IsString()
  subscription_id: string;

  @ApiProperty({
    example: '2024-12-01',
    description: 'Start Date (YYYY-MM-DD)',
  })
  @IsString()
  startDate: string;

  @ApiProperty({ example: '2024-12-31', description: 'End Date (YYYY-MM-DD)' })
  @IsString()
  endDate: string;
}

export class ChangeCategoryDto {
  @ApiProperty({
    example: '6756cddb5347dbbde9757798',
    description: 'Order ID',
  })
  @IsString()
  @IsNotEmpty()
  order_id: string;

  @IsString()
  order_number: string;

  @ApiProperty({
    example: '6756ce1a5347dbbde9757e55',
    description: 'Subscription ID',
  })
  @IsString()
  @IsNotEmpty()
  subscription_id: string;

  @IsString()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({
    example: 'HIGH',
    description: 'Protein Category',
  })
  @IsString()
  protein_category: string;

  @ApiProperty({ example: 'Medium', description: 'Calorie Range' })
  @IsString()
  @IsNotEmpty()
  kcal_range: string;

  @ApiProperty({ example: '550 - 600 Kcal', description: 'Calorie Value' })
  @IsString()
  @IsNotEmpty()
  kcal: string;

  @ApiProperty({
    example: '12/12/2024',
    description: 'Start date for changes',
  })
  @IsString()
  startDate: string;

  @ApiProperty({
    example: '12/12/2024',
    description: 'End date for changes',
  })
  @IsString()
  endDate: string;

  @IsObject()
  @ValidateNested()
  @Type(() => EditDetails)
  editDetails: EditDetails;
}

@ValidatorConstraint({ name: 'ContainsMealType', async: false })
class ContainsMealTypeConstraint implements ValidatorConstraintInterface {
  validate(
    selectedMeal: { value: string; label: string }[],
    args: ValidationArguments,
  ) {
    if (!Array.isArray(selectedMeal)) return false;

    // Check if the array contains 'lunch' or 'dinner' in the `value` field
    return selectedMeal.some(
      (item) => item.value === 'lunch' || item.value === 'dinner',
    );
  }

  defaultMessage(args: ValidationArguments) {
    return `Minimum 1 main meal should be selected.`;
  }
}

export class ChangeMealTypeSubscriptionDto {
  @ApiProperty({
    example: '6756ce905347dbbde9758291',
    description: 'ID of the subscription',
  })
  @IsString()
  @IsNotEmpty()
  subscription_id: string;

  @ApiProperty({
    example: [
      { value: 'lunch', label: 'lunch' },
      { value: 'morning_snack', label: 'morning_snack' },
    ],
    description: 'Array of selected meals',
  })
  @IsArray()
  @Validate(ContainsMealTypeConstraint)
  selectedMeal: { value: string; label: string }[];

  @ApiProperty({
    example: '550 - 600 Kcal',
    description: 'Calorie range for the subscription',
  })
  @IsString()
  kcalData: string;

  @ApiProperty({
    example: '2025-01-03T00:00:00.000Z',
    description: 'Start date for partial subscription',
  })
  @IsString()
  partialStartDate: string;

  @IsString()
  @IsNotEmpty()
  order_id: string;

  @IsString()
  @IsNotEmpty()
  customer_id?: string;

  @IsString()
  order_number?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => EditDetails)
  editDetails: EditDetails;
}

export class CalculatedMealPriceDto {
  @ApiProperty({
    example: 'meal_edit',
    description: 'Type of price calculation (e.g., meal_edit)',
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: '67839a318fd356d757813d35',
    description: 'order_id',
  })
  @IsString()
  @IsMongoId()
  @IsNotEmpty()
  order_id: string;

  @ApiProperty({
    example: '67839a318fd356d757813d35',
    description: 'subscription_id',
  })
  @IsString()
  @IsMongoId()
  @IsNotEmpty()
  subscription_id: string;

  @ApiProperty({
    example: '67839a318fd356d757813d35',
    description: '  ',
  })
  @IsString()
  @IsMongoId()
  @IsNotEmpty()
  customer_id: string;

  @ApiProperty({
    example: [{ value: 'lunch', label: 'lunch' }],
    description:
      'Selected meals for upgradation/degradation (required if type is meal_edit)',
  })
  @ValidateIf((obj) => obj.type === 'meal_edit') // Validation applies only if type is 'meal_edit'
  @IsArray()
  @IsNotEmpty({ each: true }) // Ensures the array is not empty and doesn't contain empty values
  selected_meal?: string[];

  @ApiProperty({
    example: 'Jan 20, 2025',
    description: 'Partial Start Date (calculated based on Dubai time)',
  })
  @ValidateIf((obj) => obj.type === 'meal_edit') // Applies only if type is 'meal_edit'
  @IsString()
  @IsNotEmpty() // Ensures the value is not empty
  // @IsValidPartialStartDate({
  //   message: 'Invalid start date',
  // }) // Custom validation for Dubai time
  partialStartDate?: string;

  @ApiProperty({
    example: 'balance',
    description: 'Diet Type of Meal Plan',
  })
  @ValidateIf((obj) => obj.type === 'diet_edit') // Validation applies only if type is 'diet_edit'
  @IsString()
  @IsNotEmpty()
  protein_category: string;

  @ApiProperty({
    example: 'Small',
    description: 'Size of Meal Plan',
  })
  @ValidateIf((obj) => obj.type === 'diet_edit')
  @IsString()
  @IsNotEmpty()
  kcal_range: string;

  @ApiProperty({
    example: 'date',
    description: 'start date for cancellation',
  })
  @ValidateIf(
    (obj) => obj.type === 'cancel_edit' && obj.cancellation_type === 'partial',
  )
  @IsString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    example: 'complete',
    description: 'Type of cancellation',
  })
  @ValidateIf((obj) => obj.type === 'cancel_edit')
  @IsString()
  @IsNotEmpty()
  cancellation_type: string;

  @ApiProperty({
    example: false,
    description: 'Charges of cancellation',
  })
  @ValidateIf((obj) => obj.type === 'cancel_edit')
  @IsBoolean()
  @IsNotEmpty()
  charges: boolean;

  @ApiProperty({
    example: false,
    description: 'Use discount in case of degradation?',
  })
  @ValidateIf((obj) => obj.type === 'diet_edit')
  @IsBoolean()
  @IsNotEmpty()
  apply_discount: boolean;
}
