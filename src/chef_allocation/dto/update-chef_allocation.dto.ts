import { PartialType } from '@nestjs/swagger';
import { CreateChefAllocationDto } from './create-chef_allocation.dto';

export class UpdateChefAllocationDto extends PartialType(CreateChefAllocationDto) {}
