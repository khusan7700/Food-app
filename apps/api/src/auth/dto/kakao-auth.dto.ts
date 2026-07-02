import { UserRole } from '@order-eats/types';
import { IsEnum, IsString } from 'class-validator';

export class KakaoAuthDto {
  @IsString()
  kakaoAccessToken!: string;

  @IsEnum(UserRole)
  role!: UserRole;
}
