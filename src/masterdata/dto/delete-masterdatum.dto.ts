import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

export class DeleteMasterdatumDto {
  @ApiProperty({
    type: 'array',
    description: 'Value of Perticular Master Data',
    example: '[]',
  })
  @IsArray({ message: 'Value must be array type' })
  value: string[];
}
