import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './transaction.entity';
import { Currency } from '../common/enums/currency.enum';
import { TransactionType } from '../common/enums/transaction-type.enum';
import { TransactionStatus } from '../common/enums/transaction-status.enum';

@Injectable()
export class TransactionsService {
  constructor(
    // txRepo is transfer reporitory 
    @InjectRepository(Transaction) private readonly txRepo: Repository<Transaction>,
  ) {}

  findAllForUser(userId: string): Promise<Transaction[]> {
    return this.txRepo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

/**
 * Records a transaction in the system.
 *
 * What this does:
 * - takes raw transaction input 
 * - normalizes optional fields so the DB gets consistent values
 * - formats numeric values (amount, rate) to match db
 * - applies sensible defaults (eg COMPLETED status)
 * - persists the   transaction to the database
 */


  record(params: {
    userId: string;
    type: TransactionType;
    toCurrency: Currency;
    amount: number;
    fromCurrency?: Currency;
    rateUsed?: number;
    status?: TransactionStatus;
  }): Promise<Transaction> {
    const tx = this.txRepo.create({
      ...params,
      fromCurrency: params.fromCurrency ?? null,
      amount: params.amount.toFixed(4),
      rateUsed: params.rateUsed != null ? params.rateUsed.toFixed(6) : null,
      status: params.status ?? TransactionStatus.COMPLETED,
    });
    return this.txRepo.save(tx);
  }
}