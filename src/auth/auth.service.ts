import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { Otp } from './otp.entity';
import { RegisterDto } from './dtos/register.dto';
import { VerifyOtpDto } from './dtos/verify-otp.dto';
import { LoginDto } from './dtos/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @InjectRepository(Otp) private readonly otpRepo: Repository<Otp>,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create(dto.email, passwordHash);

    const code      = Math.floor(100_000 + Math.random() * 900_000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1_000); // 10 min
    await this.otpRepo.save(this.otpRepo.create({ userId: user.id, code, expiresAt }));

    // TODO: inject MailService and send `code` to dto.email
    // Development: query DB → SELECT code FROM otps ORDER BY created_at DESC LIMIT 1;
    console.log(`[DEV ONLY] OTP for ${dto.email}: ${code}`);

    return { message: 'Registration successful. Check your email for your OTP.' };
  }




  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.isVerified) {
      throw new BadRequestException('Account is already verified. Please log in.');
    }

    const otp = await this.otpRepo.findOne({
      where: { userId: user.id, code: dto.code, isUsed: false },
    });

    if (!otp || otp.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    await this.otpRepo.update(otp.id, { isUsed: true });
    await this.usersService.markVerified(user.id);

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });
    return { accessToken };
  }




  
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid email or password');

    if (!user.isVerified) {
      throw new ForbiddenException('Please verify your email before logging in');
    }

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });
    return { accessToken };
  }
}