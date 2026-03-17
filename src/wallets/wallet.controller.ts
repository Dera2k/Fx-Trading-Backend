import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';

import { User } from '../users/user.entity';
import { WalletService } from './wallet.service';
import { FundWalletDto } from './dtos/fund-wallet.dto';
import { ConvertCurrencyDto } from './dtos/convert-currency.dto';
import { TradeDto } from './dtos/trade.dto';


@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get all wallet balances for the current user' })
  getWallets(@CurrentUser() user: User) {
    return this.walletService.getWallets(user.id);
  }

  @Post('fund')
  @ApiOperation({ summary: 'Fund a currency wallet' })
  fund(@CurrentUser() user: User, @Body() dto: FundWalletDto) {
    return this.walletService.fund(user.id, dto);
  }

  @Post('convert')
  @ApiOperation({ summary: 'Convert between currencies within the same account' })
  convert(@CurrentUser() user: User, @Body() dto: ConvertCurrencyDto) {
    return this.walletService.convert(user.id, dto);
  }

  @Post('trade')
  @ApiOperation({ summary: 'Execute an FX trade at the current market rate' })
  trade(@CurrentUser() user: User, @Body() dto: TradeDto) {
    return this.walletService.trade(user.id, dto);
  }
}