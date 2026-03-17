import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FxService } from './fx.service';

@ApiTags('FX')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fx')
export class FxController {
  constructor(private readonly fxService: FxService) {}

  @Get('rates')
  @ApiOperation({ summary: 'Get current FX rates (USD base)' })
  getRates() {
    return this.fxService.getRates();
  }
}