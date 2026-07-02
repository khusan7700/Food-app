import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload, UserRole } from '@order-eats/types';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { KakaoAuthDto } from './dto/kakao-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface KakaoUserResponse {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
    };
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) throw new ConflictException('Email already in use');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        role: dto.role,
        // Drivers need a Driver row to go online and receive assignments —
        // created empty here, filled in once they toggle online / broadcast GPS.
        ...(dto.role === UserRole.DRIVER
          ? { driverProfile: { create: {} } }
          : {}),
      },
    });

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  async kakaoLogin(dto: KakaoAuthDto) {
    const kakaoUser = await this.fetchKakaoUser(dto.kakaoAccessToken);
    const kakaoId = String(kakaoUser.id);

    let user = await this.prisma.user.findUnique({ where: { kakaoId } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          kakaoId,
          name: kakaoUser.kakao_account?.profile?.nickname ?? 'Kakao User',
          email: kakaoUser.kakao_account?.email,
          role: dto.role,
          ...(dto.role === UserRole.DRIVER
            ? { driverProfile: { create: {} } }
            : {}),
        },
      });
    }

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user),
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new UnauthorizedException('User not found');

    return this.sanitizeUser(user);
  }

  async updateProfile(
    userId: string,
    dto: { name?: string; avatarUrl?: string },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
    });
    return this.sanitizeUser(user);
  }

  private async fetchKakaoUser(
    accessToken: string,
  ): Promise<KakaoUserResponse> {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException('Invalid Kakao access token');
    }

    return response.json() as Promise<KakaoUserResponse>;
  }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email ?? '',
      role: user.role as UserRole,
    };
    return this.jwtService.sign(payload);
  }

  private sanitizeUser(user: User) {
    const { password, ...safeUser } = user;
    void password;
    return safeUser;
  }
}
