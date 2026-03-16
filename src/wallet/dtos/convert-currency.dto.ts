import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsPositive,
  Min,
  Max,
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
    const dto = args.object as ConvertCurrencyDto;
    return dto.fromCurrency !== toCurrency;
  }

  defaultMessage() {
    return 'fromCurrency and toCurrency must be different';
  }
}

export class ConvertCurrencyDto {
  @ApiProperty({ enum: Currency, example: Currency.USD })
  @IsEnum(Currency)
  fromCurrency!: Currency;

  @ApiProperty({ enum: Currency, example: Currency.EUR })
  @IsEnum(Currency)
  @Validate(CurrenciesDifferent)
  toCurrency!: Currency;

  @ApiProperty({ example: 200 })
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 4 })
  @IsPositive()
  @Min(0.0001)
  @Max(1_000_000)
  amount!: number;
}