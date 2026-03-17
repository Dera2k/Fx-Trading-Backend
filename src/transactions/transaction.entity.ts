import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Currency } from '../common/enums/currency.enum';
import { TransactionType } from '../common/enums/transaction-type.enum';
import { TransactionStatus } from '../common/enums/transaction-status.enum';

@Entity('transactions')
@Check(`"amount" > 0`)
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'enum', enum: TransactionType })
  type!: TransactionType;

  @Column({ type: 'enum', enum: Currency, nullable: true })
  fromCurrency!: Currency | null;

  @Column({ type: 'enum', enum: Currency })
  toCurrency!: Currency;

  @Column({ type: 'decimal', precision: 18, scale: 4 })
  amount!: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  rateUsed!: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  fee!: string | null;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status!: TransactionStatus;

  @Column({ type: 'text', nullable: true })
  failureReason!: string | null;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true })
  reference!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  createdAt!: Date;

//   @ManyToOne(() => User, (u) => u.transactions, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'userId' })
  user!: User;
}