import {  BadRequestException, Injectable, NotFoundException,} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Wallet } from './wallet.entity';
import { Currency } from '../common/enums/currency.enum';
import { TransactionType } from '../common/enums/transaction-type.enum';
import { TransactionStatus } from '../common/enums/transaction-status.enum';
import { FxService } from '../fx/fx.service';
import { TransactionsService } from '../transactions/transactions.service';
import { FundWalletDto } from './dtos/fund-wallet.dto';
import { ConvertCurrencyDto } from './dtos/convert-currency.dto';
import { TradeDto } from './dtos/trade.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    private readonly fxService: FxService,
    private readonly transactionsService: TransactionsService,
    private readonly dataSource: DataSource,
  ) {}

  getWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepo.find({ where: { userId } });
  }

  async fund(userId: string, dto: FundWalletDto): Promise<Wallet> {
    const wallet = await this.findOrCreate(userId, dto.currency);
    wallet.balance = (parseFloat(wallet.balance) + dto.amount).toFixed(4);
    const saved = await this.walletRepo.save(wallet);

    await this.transactionsService.record({
      userId,
      type: TransactionType.FUND,
      toCurrency: dto.currency,
      amount: dto.amount,
      status: TransactionStatus.COMPLETED,
    });

    return saved;
  }

  async convert(userId: string, dto: ConvertCurrencyDto): Promise<{ message: string }> {
    const rate = await this.fxService.getRate(dto.fromCurrency, dto.toCurrency);

    // run debit + credit inside a single db transaction - atomic
    await this.dataSource.transaction(async (manager) => {
      const fromWallet = await manager.findOne(Wallet, {
        where: { userId, currency: dto.fromCurrency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!fromWallet) {
        throw new NotFoundException(`No ${dto.fromCurrency} wallet found`);
      }
      if (!this.hasSufficientBalance(fromWallet, dto.amount)) {
        throw new BadRequestException(
          `Insufficient ${dto.fromCurrency} balance. Available: ${fromWallet.balance}`,
        );
      }

      const toWallet = await this.findOrCreateInManager(manager, userId, dto.toCurrency);
      const convertedAmount = dto.amount * rate;

      fromWallet.balance = (parseFloat(fromWallet.balance) - dto.amount).toFixed(4);
      toWallet.balance   = (parseFloat(toWallet.balance) + convertedAmount).toFixed(4);

      await manager.save(fromWallet);
      await manager.save(toWallet);
    });

    await this.transactionsService.record({
      userId,
      type: TransactionType.CONVERT,
      fromCurrency: dto.fromCurrency,
      toCurrency: dto.toCurrency,
      amount: dto.amount,
      rateUsed: rate,
      status: TransactionStatus.COMPLETED,
    });

    return { message: `Converted ${dto.amount} ${dto.fromCurrency} to ${dto.toCurrency} at rate ${rate.toFixed(6)}` };
  }




  async trade(userId: string, dto: TradeDto): Promise<{ message: string }> {
    const rate = await this.fxService.getRate(dto.fromCurrency, dto.toCurrency);

    // Optional limit rate check - reject if live rate is worse than user's floor
    if (dto.limitRate && rate < dto.limitRate) {
      throw new BadRequestException(
        `Live rate ${rate.toFixed(6)} is below your limit rate ${dto.limitRate}`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      const fromWallet = await manager.findOne(Wallet, {
        where: { userId, currency: dto.fromCurrency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!fromWallet) {
        throw new NotFoundException(`No ${dto.fromCurrency} wallet found`);
      }
      if (!this.hasSufficientBalance(fromWallet, dto.amount)) {
        throw new BadRequestException(
          `Insufficient ${dto.fromCurrency} balance. Available: ${fromWallet.balance}`,
        );
      }

      const toWallet = await this.findOrCreateInManager(manager, userId, dto.toCurrency);
      const receivedAmount = dto.amount * rate;

      fromWallet.balance = (parseFloat(fromWallet.balance) - dto.amount).toFixed(4);
      toWallet.balance   = (parseFloat(toWallet.balance) + receivedAmount).toFixed(4);

      await manager.save(fromWallet);
      await manager.save(toWallet);
    });

    await this.transactionsService.record({
      userId,
      type: TransactionType.TRADE,
      fromCurrency: dto.fromCurrency,
      toCurrency: dto.toCurrency,
      amount: dto.amount,
      rateUsed: rate,
      status: TransactionStatus.COMPLETED,
    });

    return { message: `Traded ${dto.amount} ${dto.fromCurrency} → ${dto.toCurrency} at rate ${rate.toFixed(6)}` };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  async findOrCreate(userId: string, currency: Currency): Promise<Wallet> {
    const existing = await this.walletRepo.findOne({ where: { userId, currency } });
    if (existing) return existing;
    return this.walletRepo.save(this.walletRepo.create({ userId, currency }));
  }

  async findOneOrFail(userId: string, currency: Currency): Promise<Wallet> {
    const wallet = await this.walletRepo.findOne({ where: { userId, currency } });
    if (!wallet) throw new NotFoundException(`No ${currency} wallet found`);
    return wallet;
  }

  hasSufficientBalance(wallet: Wallet, amount: number): boolean {
    return parseFloat(wallet.balance) >= amount;
  }


  
  // used inside db transactions where we need the transactional EntityManager
  private async findOrCreateInManager(
    manager: any,
    userId: string,
    currency: Currency,
  ): Promise<Wallet> {
    const existing = await manager.findOne(Wallet, { where: { userId, currency } });
    if (existing) return existing;
    const wallet = manager.create(Wallet, { userId, currency, balance: '0.0000' });
    return manager.save(wallet);
  }
}