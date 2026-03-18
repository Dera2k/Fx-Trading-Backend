import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { WalletService } from './wallet.service';
import { Wallet } from './wallet.entity';
import { FxService } from '../fx/fx.service';
import { TransactionsService } from '../transactions/transactions.service';
import { Currency } from '../common/enums/currency.enum';
import { TransactionType } from '../common/enums/transaction-type.enum';
import { TransactionStatus } from '../common/enums/transaction-status.enum';

const mockWalletRepo = {
  findOne: jest.fn(),
  find:    jest.fn(),
  save:    jest.fn(),
  create:  jest.fn(),
};

const mockFxService = {
  getRate: jest.fn(),
};

const mockTransactionsService = {
  record: jest.fn(),
};

const mockQueryRunner = {
  findOne: jest.fn(),
  save:    jest.fn(),
  create:  jest.fn(),
};

const mockDataSource = {
  transaction: jest.fn((cb) => cb(mockQueryRunner)),
};

describe('WalletService', () => {
  let service: WalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        { provide: getRepositoryToken(Wallet), useValue: mockWalletRepo },
        { provide: FxService,                  useValue: mockFxService },
        { provide: TransactionsService,        useValue: mockTransactionsService },
        { provide: DataSource,                 useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    jest.clearAllMocks();
  });

  //fund 

  describe('fund', () => {
    it('credits an existing wallet and records a FUND transaction', async () => {
      const wallet = { id: '1', userId: 'u1', currency: Currency.NGN, balance: '5000.0000' };
      mockWalletRepo.findOne.mockResolvedValue(wallet);
      mockWalletRepo.save.mockResolvedValue({ ...wallet, balance: '10000.0000' });
      mockTransactionsService.record.mockResolvedValue({});

      const result = await service.fund('u1', { currency: Currency.NGN, amount: 5000 });

      expect(result.balance).toBe('10000.0000');
      expect(mockTransactionsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type:       TransactionType.FUND,
          toCurrency: Currency.NGN,
          amount:     5000,
          status:     TransactionStatus.COMPLETED,
        }),
      );
    });

    it('creates a new wallet when none exists then funds it', async () => {
      mockWalletRepo.findOne.mockResolvedValue(null);
      mockWalletRepo.create.mockReturnValue({ userId: 'u1', currency: Currency.USD, balance: '0.0000' });
      mockWalletRepo.save
        .mockResolvedValueOnce({ userId: 'u1', currency: Currency.USD, balance: '0.0000' })
        .mockResolvedValueOnce({ userId: 'u1', currency: Currency.USD, balance: '200.0000' });
      mockTransactionsService.record.mockResolvedValue({});

      const result = await service.fund('u1', { currency: Currency.USD, amount: 200 });
      expect(result.balance).toBe('200.0000');
    });
  });



  //has Sufficient Balance testin

  describe('hasSufficientBalance', () => {
    it('returns true when balance covers the amount exactly', () => {
      const wallet = { balance: '1000.0000' } as Wallet;
      expect(service.hasSufficientBalance(wallet, 1000)).toBe(true);
    });

    it('returns true when balance exceeds amount', () => {
      const wallet = { balance: '5000.0000' } as Wallet;
      expect(service.hasSufficientBalance(wallet, 100)).toBe(true);
    });

    it('returns false when balance is less than amount', () => {
      const wallet = { balance: '50.0000' } as Wallet;
      expect(service.hasSufficientBalance(wallet, 100)).toBe(false);
    });

    it('returns false for zero balance', () => {
      const wallet = { balance: '0.0000' } as Wallet;
      expect(service.hasSufficientBalance(wallet, 1)).toBe(false);
    });
  });

  // ── convert ────────────────────────────────────────────────────────────────

  describe('convert', () => {
    it('throws NotFoundException when source wallet does not exist', async () => {
      mockQueryRunner.findOne.mockResolvedValue(null);
      mockFxService.getRate.mockResolvedValue(0.00062);

      await expect(
        service.convert('u1', {
          fromCurrency: Currency.NGN,
          toCurrency:   Currency.USD,
          amount:       1000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when balance is insufficient', async () => {
      const fromWallet = { id: '1', userId: 'u1', currency: Currency.NGN, balance: '100.0000' };
      mockQueryRunner.findOne.mockResolvedValue(fromWallet);
      mockFxService.getRate.mockResolvedValue(0.00062);

      await expect(
        service.convert('u1', {
          fromCurrency: Currency.NGN,
          toCurrency:   Currency.USD,
          amount:       1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('records a CONVERT transaction after successful conversion', async () => {
      const fromWallet = { id: '1', userId: 'u1', currency: Currency.NGN, balance: '5000.0000' };
      const toWallet   = { id: '2', userId: 'u1', currency: Currency.USD, balance: '0.0000' };

      mockFxService.getRate.mockResolvedValue(0.00062);
      mockQueryRunner.findOne
        .mockResolvedValueOnce(fromWallet)
        .mockResolvedValueOnce(toWallet);
      mockQueryRunner.save.mockResolvedValue({});
      mockTransactionsService.record.mockResolvedValue({});

      await service.convert('u1', {
        fromCurrency: Currency.NGN,
        toCurrency:   Currency.USD,
        amount:       1000,
      });

      expect(mockTransactionsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type:         TransactionType.CONVERT,
          fromCurrency: Currency.NGN,
          toCurrency:   Currency.USD,
          rateUsed:     0.00062,
        }),
      );
    });
  });

  // ── trade ──────────────────────────────────────────────────────────────────

  describe('trade', () => {
    it('rejects when live rate is below limitRate', async () => {
      mockFxService.getRate.mockResolvedValue(0.00050);

      await expect(
        service.trade('u1', {
          fromCurrency: Currency.NGN,
          toCurrency:   Currency.USD,
          amount:       1000,
          limitRate:    0.00062,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('executes trade and records TRADE transaction when rate is acceptable', async () => {
      const fromWallet = { id: '1', userId: 'u1', currency: Currency.NGN, balance: '5000.0000' };
      const toWallet   = { id: '2', userId: 'u1', currency: Currency.USD, balance: '0.0000' };

      mockFxService.getRate.mockResolvedValue(0.00062);
      mockQueryRunner.findOne
        .mockResolvedValueOnce(fromWallet)
        .mockResolvedValueOnce(toWallet);
      mockQueryRunner.save.mockResolvedValue({});
      mockTransactionsService.record.mockResolvedValue({});

      await service.trade('u1', {
        fromCurrency: Currency.NGN,
        toCurrency:   Currency.USD,
        amount:       1000,
      });

      expect(mockTransactionsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ type: TransactionType.TRADE }),
      );
    });
  });
});