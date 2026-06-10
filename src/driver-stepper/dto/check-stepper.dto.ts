import { IsDateString } from 'class-validator';

export class CheckStepperDto {
  @IsDateString()
  date: string;
}