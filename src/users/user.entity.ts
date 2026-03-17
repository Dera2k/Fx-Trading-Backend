import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Wallet } from 'src/wallets/wallet.entity';
import { Transaction } from 'src/transactions/transaction.entity';
import { Otp } from '../auth/otp.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar' })
  @Exclude()
  passwordHash!: string;

  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

//   @OneToMany(() => Wallet, (w) => w.user)
//   wallets!: Wallet[];

//   @OneToMany(() => Transaction, (t) => t.user)
//   transactions!: Transaction[];

  @OneToMany(() => Otp, (o) => o.user)
  otps!: Otp[];
}