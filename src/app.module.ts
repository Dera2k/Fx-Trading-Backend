import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WalletModule } from './wallet/wallet.module';
import { TransactionsModule } from './transactions/transactions.module';
import { FxModule } from './fx/fx.module';

@Module({
  imports: [AuthModule, UsersModule, WalletModule, TransactionsModule, FxModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
