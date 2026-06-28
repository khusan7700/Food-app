import { UserRole } from '@food-delivery/types';
import { IsEnum, IsString } from 'class-validator';

export class KakaoAuthDto {
  @IsString()
  kakaoAccessToken!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}
