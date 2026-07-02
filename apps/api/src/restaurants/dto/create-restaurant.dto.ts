import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsString()
  @MinLength(2)
  address!: string;

  @IsString()
  @MinLength(2)
  cuisineType!: string;

  // No location-picker UI yet — defaults to 0,0 in the service when omitted.
  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;
}
