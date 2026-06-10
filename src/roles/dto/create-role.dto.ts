import { ApiProperty } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'sub_recipes' })
  resource: string;

  @ApiProperty({ example: 1 })
  index: number;

  @ApiProperty({
    example: ['create', 'update', 'delete', 'list'],
    type: [String],
  })
  actions: string[];

  @ApiProperty({ example: 'recipe' })
  group: string;

  @ApiProperty({ example: 1 })
  group_index: number;
}
