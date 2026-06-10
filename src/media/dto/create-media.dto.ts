import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

// export class CreateMediaDto {
//   @ApiProperty()
//   @IsNotEmpty()
//   @IsString()
//   model_name: string;

//   @ApiProperty({ type: 'string', format: 'binary', isArray: true })
//   files: any[]; // Use `any[]` or `Express.Multer.File[]` for file array
// }
export class ThumbnailConfigDto {
  @Transform(({ value }) => parseInt(value))
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(500)
  width: number;

  @Transform(({ value }) => parseInt(value))
  @Type(() => Number)
  @IsInt()
  @Min(50)
  @Max(500)
  height: number;

  @IsString()
  @IsOptional()
  name?: string; // Optional name for the thumbnail size (e.g., 'small', 'medium', 'large')
}

export class CreateMediaDto {
  @IsString()
  model_name: string;

  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return false; // fallback: treat anything not 'true' as false
  })
  @IsBoolean()
  generateThumbnail: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(100)
  compressionQuality: number = 80;

  // REMOVED: thumbnailSize (backward compatibility removed as requested)

  // Multiple thumbnail configurations
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ThumbnailConfigDto)
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed)
          ? parsed.map((config) => ({
              width: parseInt(config.width),
              height: parseInt(config.height),
              name: config.name || `${config.width}x${config.height}`,
            }))
          : [];
      } catch (error) {
        console.error('Error parsing thumbnailConfigs:', error);
        return [];
      }
    }
    if (Array.isArray(value)) {
      return value.map((config) => ({
        width: parseInt(config.width),
        height: parseInt(config.height),
        name: config.name || `${config.width}x${config.height}`,
      }));
    }
    return [];
  })
  thumbnailConfigs?: ThumbnailConfigDto[] = [];

  @IsString()
  @IsIn(['cover', 'contain', 'fill', 'inside', 'outside'])
  @IsOptional()
  thumbnailFit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside' = 'contain';

  @IsString()
  @IsOptional()
  thumbnailBackground?: string = 'white';

  @IsString()
  @IsIn([
    'center',
    'top',
    'bottom',
    'left',
    'right',
    'left top',
    'right top',
    'left bottom',
    'right bottom',
  ])
  @IsOptional()
  thumbnailPosition?: string = 'center';

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(100)
  @IsOptional()
  thumbnailQuality?: number = 85;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((s) => s.trim());
    }
    return value || [];
  })
  thumbnailPresets?: string[] = [];
}
export class UpdateMediaDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  model_name: string;

  @ApiProperty({ type: 'string', format: 'binary', isArray: true })
  @IsOptional()
  files: any[]; // Use `any[]` or `Express.Multer.File[]` for file array

  @ApiProperty()
  @IsOptional()
  @IsString()
  file_name: string;
}
