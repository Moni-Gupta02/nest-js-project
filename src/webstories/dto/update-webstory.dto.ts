import { PartialType } from '@nestjs/swagger';
import { CreateWebStoriesCategoryDto } from './webstory-category.dto';

export class UpdateWebstoryDto extends PartialType(
  CreateWebStoriesCategoryDto,
) {}
