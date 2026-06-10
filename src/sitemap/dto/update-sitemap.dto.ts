import { IsString, IsOptional } from 'class-validator';

export class UpdateSiteMapDto {
  @IsOptional()
  @IsString()
  readonly url?: string;
}
