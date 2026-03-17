import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsPositive,
  Min,
  Max,
  IsOptional,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Currency } from '../../common/enums/currency.enum';

@ValidatorConstraint({ name: 'currenciesDifferent', async: false })
class CurrenciesDifferent implements ValidatorConstraintInterface {
  validate(toCurrency: Currency, args: ValidationArguments) {
    const dto = args.object as TradeDto;
    return dto.fromCurrency !== toCurrency;
  }

  defaultMessage() {
    return 'fromCurrency and toCurrency must be different';
  }
}

export class TradeDto {
  @ApiProperty({ enum: Currency, example: Currency.USD })
  @IsEnum(Currency)
  fromCurrency!: Currency;


  
  @ApiProperty({ enum: Currency, example: Currency.GBP })
  @IsEnum(Currency)
  @Validate(CurrenciesDifferent)
  toCurrency!: Currency;



  @ApiProperty({ example: 1000 })
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  @Min(0.0001)
  @Max(1_000_000)
  amount!: number;



  @ApiPropertyOptional({ example: 0.78 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber({ maxDecimalPlaces: 6 })
  @IsPositive()
  limitRate?: number;
}