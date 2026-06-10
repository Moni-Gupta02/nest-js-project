import { IsString, IsArray, IsOptional } from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateMetaScriptDto {
  @ApiProperty({
    example: 'homepage',
    description: 'The key for the meta script',
  })
  @IsString()
  @IsOptional()
  key?: string;

  @ApiProperty({
    example: ['<script>...</script>'],
    description: 'Array of meta scripts',
  })
  @IsArray()
  @IsString({ each: true })
  meta_script: string[];
}

export class UpdateMetaScriptDto extends PartialType(CreateMetaScriptDto) {}
