import { IsString } from 'class-validator';

export class CreateSiteMapDto {
  @IsString()
  readonly url: string;
}
