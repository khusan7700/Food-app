import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';

export class FindRestaurantsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
