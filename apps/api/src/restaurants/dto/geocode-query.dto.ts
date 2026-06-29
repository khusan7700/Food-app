import { IsString, MinLength } from 'class-validator';

export class GeocodeQueryDto {
  @IsString()
  @MinLength(2)
  address!: string;
}
