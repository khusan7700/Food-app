import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtPayload } from '@food-delivery/types';
import { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { KakaoAuthDto } from './dto/kakao-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('kakao')
  kakao(@Body() dto: KakaoAuthDto) {
    return this.authService.kakaoLogin(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Request() req: ExpressRequest & { user: JwtPayload }) {
    return this.authService.getProfile(req.user.sub);
  }
}
