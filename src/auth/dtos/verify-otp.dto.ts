import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  Length,
  IsNotEmpty,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class VerifyOtpDto {
  @ApiProperty({ example: 'trader@example.com' })
  @IsNotEmpty({ message: 'An Email is required' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @ApiProperty({ example: '482910' })
  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^[0-9]{6}$/, { message: 'OTP must contain digits only' })
  code!: string;
}