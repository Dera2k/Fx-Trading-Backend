import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
  Check,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Currency } from '../common/enums/currency.enum';

@Entity('wallets')
@Unique(['userId', 'currency'])
@Check(`"balance" >= 0`)
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'enum', enum: Currency })
  currency!: Currency;

  @Column({ type: 'decimal', precision: 18, scale: 4, default: '0.0000' })
  balance!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  // @ManyToOne(() => User, (u) => u.wallets, { onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'userId' })
  user!: User;
}