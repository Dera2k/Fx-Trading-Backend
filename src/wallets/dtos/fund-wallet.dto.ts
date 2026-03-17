import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsNotEmpty,
  Max,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Currency } from 'src/common/enums/currency.enum';

export class FundWalletDto {
  @ApiProperty({
    enum: Currency,
    example: Currency.USD,
    description: 'The currency to fund',
  })
  @IsNotEmpty({ message: 'Currency is required' })
  @IsEnum(Currency, {
    message: `Currency must be one of: ${Object.values(Currency).join(', ')}`,
  })
  currency!: Currency;

  @ApiProperty({
    example: 500.00,
    description: 'Amount to fund — must be positive, max 4 decimal places',
    minimum: 0.0001,
    maximum: 1000000,
  })
  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'Amount must be a number with at most 4 decimal places' })
  @IsPositive({ message: 'Amount must be greater than zero' })
  @Min(0.0001, { message: 'Minimum fundable amount is 0.0001' })
  @Max(1_000_000, { message: 'Maximum single fund amount is 1,000,000' })
  @Transform(({ value }) => parseFloat(value))
  amount!: number;
}