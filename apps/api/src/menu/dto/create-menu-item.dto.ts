import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateMenuItemDto {
  @IsUUID()
  categoryId!: string;

  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  // Stored in the smallest currency unit (cents).
  @IsInt()
  @Min(0)
  price!: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
