import {
  IsArray,
  IsBoolean,
  IsBooleanString,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { Type } from 'class-transformer';

export class GetDriversDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsBooleanString()
  active?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class GetHelpersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBooleanString()
  active?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

export class DriverPersonalDetailsDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsString()
  @IsNotEmpty()
  section: string;

  @IsArray()
  time_slot: any[];

  @IsString()
  @IsNotEmpty()
  scanner_pin: string;

  @IsOptional()
  helper?: any;

  @IsOptional()
  helper_id?: any;

  @IsString()
  @IsNotEmpty()
  vehicle: string;

  @IsNotEmpty()
  max_deliveries: any;
}

export class SelectedAreaDto {
  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  area: string;
}

export class CreateDriverDto {
  @ValidateNested()
  @Type(() => DriverPersonalDetailsDto)
  personal_details: DriverPersonalDetailsDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedAreaDto)
  selected_area: SelectedAreaDto[];
}


export class EditDriverPersonalDetailsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsArray()
  time_slot?: any[];

  @IsOptional()
  @IsString()
  scanner_pin?: string;

  @IsOptional()
  helper?: any;

  @IsOptional()
  helper_id?: any;

  @IsOptional()
  @IsString()
  vehicle?: string;

  @IsOptional()
  max_deliveries?: any;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class EditDriverDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => EditDriverPersonalDetailsDto)
  personal_details?: EditDriverPersonalDetailsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SelectedAreaDto)
  selected_area?: SelectedAreaDto[];
}

export class EditDriverDetailsDto {
  @IsBoolean()
  active: boolean;
}

export class EditActiveDriverDto {
  @ValidateNested()
  @Type(() => EditDriverDetailsDto)
  details: EditDriverDetailsDto;
}

export class CreateHelperDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  mobile: string;

  @IsString()
  @IsNotEmpty()
  scanner_pin: string;
}

export class EditHelperDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  scanner_pin?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

import { IsIn } from 'class-validator';

export class AllocateDriversDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['MP', 'NDD', 'mp', 'ndd', 'bag_pick'])
  phase: string;

  @IsOptional()
  @IsBoolean()
  forceContinue?: boolean;
}

export class CheckAllocationDto {
  @IsString()
  @IsNotEmpty()
  date: string;
}

export class GetDeliveriesAllocationDetailsDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsIn(['MP', 'NDD', 'mp', 'ndd', 'bag_pick'])
  phase: string;

  @IsString()
  @IsNotEmpty()
  section: string;
}

export class AssignDeliveryItemDto {
  @IsString()
  @IsNotEmpty()
  delivery_id: string;

  @IsOptional()
  @IsString()
  driver_id?: string | null;
}

export class UnassignedToAssignDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignDeliveryItemDto)
  items: AssignDeliveryItemDto[];
}

export class CompleteAllocationDto {
  @IsString()
  @IsNotEmpty()
  date: string;
}

export class GetOwnDeliveryForDriversDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsIn(['MP', 'NDD', 'mp', 'ndd', 'bag_pick'])
  phase: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsArray()
  driver_ids?: string[];
}