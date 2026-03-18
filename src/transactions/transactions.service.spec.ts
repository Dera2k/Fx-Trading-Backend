import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { Transaction } from './transaction.entity';
import { Currency } from '../common/enums/currency.enum';
import { TransactionType } from '../common/enums/transaction-type.enum';
import { TransactionStatus } from '../common/enums/transaction-status.enum';

const mockTxRepo = {
  find:   jest.fn(),
  create: jest.fn(),
  save:   jest.fn(),
};




describe('TransactionsService', () => {
  let service: TransactionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: getRepositoryToken(Transaction), useValue: mockTxRepo },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
    jest.clearAllMocks();
  });

  //record 

  describe('record', () => {
    it('stores amount with 4 decimal places', async () => {
      mockTxRepo.create.mockReturnValue({});
      mockTxRepo.save.mockResolvedValue({});

      await service.record({
        userId:     'u1',
        type:       TransactionType.FUND,
        toCurrency: Currency.NGN,
        amount:     5000,
      });

      expect(mockTxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '5000.0000' }),
      );
    });

    it('stores rateUsed with 6 decimal places', async () => {
      mockTxRepo.create.mockReturnValue({});
      mockTxRepo.save.mockResolvedValue({});

      await service.record({
        userId:       'u1',
        type:         TransactionType.CONVERT,
        fromCurrency: Currency.NGN,
        toCurrency:   Currency.USD,
        amount:       1000,
        rateUsed:     0.000624,
      });

      expect(mockTxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ rateUsed: '0.000624' }),
      );
    });

    it('sets rateUsed to null for FUND transactions', async () => {
      mockTxRepo.create.mockReturnValue({});
      mockTxRepo.save.mockResolvedValue({});

      await service.record({
        userId:     'u1',
        type:       TransactionType.FUND,
        toCurrency: Currency.NGN,
        amount:     5000,
      });

      expect(mockTxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ rateUsed: null }),
      );
    });

    it('sets fromCurrency to null for FUND transactions', async () => {
      mockTxRepo.create.mockReturnValue({});
      mockTxRepo.save.mockResolvedValue({});

      await service.record({
        userId:     'u1',
        type:       TransactionType.FUND,
        toCurrency: Currency.NGN,
        amount:     5000,
      });

      expect(mockTxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ fromCurrency: null }),
      );
    });

    it('defaults status to COMPLETED when not provided', async () => {
      mockTxRepo.create.mockReturnValue({});
      mockTxRepo.save.mockResolvedValue({});

      await service.record({
        userId:     'u1',
        type:       TransactionType.TRADE,
        toCurrency: Currency.USD,
        amount:     100,
      });

      expect(mockTxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: TransactionStatus.COMPLETED }),
      );
    });

    it('accepts explicit FAILED status', async () => {
      mockTxRepo.create.mockReturnValue({});
      mockTxRepo.save.mockResolvedValue({});

      await service.record({
        userId:     'u1',
        type:       TransactionType.TRADE,
        toCurrency: Currency.USD,
        amount:     100,
        status:     TransactionStatus.FAILED,
      });

      expect(mockTxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: TransactionStatus.FAILED }),
      );
    });

    it('accepts explicit PENDING status', async () => {
      mockTxRepo.create.mockReturnValue({});
      mockTxRepo.save.mockResolvedValue({});

      await service.record({
        userId:     'u1',
        type:       TransactionType.TRADE,
        toCurrency: Currency.USD,
        amount:     100,
        status:     TransactionStatus.PENDING,
      });

      expect(mockTxRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: TransactionStatus.PENDING }),
      );
    });
  });

  //find All For User 

  describe('findAllForUser', () => {
    it('queries by userId and orders by createdAt DESC', async () => {
      mockTxRepo.find.mockResolvedValue([]);
      await service.findAllForUser('u1');

      expect(mockTxRepo.find).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        order: { createdAt: 'DESC' },
      });
    });

    it('returns empty array when user has no transactions', async () => {
      mockTxRepo.find.mockResolvedValue([]);
      const result = await service.findAllForUser('u1');
      expect(result).toEqual([]);
    });

    it('returns transactions when they exist', async () => {
      const txs = [
        { id: 'tx1', userId: 'u1', type: TransactionType.FUND, amount: '5000.0000' },
        { id: 'tx2', userId: 'u1', type: TransactionType.TRADE, amount: '1000.0000' },
      ];
      mockTxRepo.find.mockResolvedValue(txs);
      const result = await service.findAllForUser('u1');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('tx1');
    });
  });
});