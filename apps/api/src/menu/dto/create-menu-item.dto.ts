import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  categoryId: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Smallest currency unit (cents), matching schema.prisma's Int field.
  @IsInt()
  @Min(0)
  price: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
