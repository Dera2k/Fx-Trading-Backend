import {  Injectable, InternalServerErrorException, Logger,} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Currency } from '../common/enums/currency.enum';

const CACHE_TTL_MS = 60_000; //60 seconds

@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private cache: { rates: Record<string, number>; fetchedAt: number } | null = null;

  constructor(private readonly httpService: HttpService) {}

  async getRates(): Promise<{ base: Currency; rates: Record<string, number>; fetchedAt: string }> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return {
        base: Currency.USD,
        rates: this.cache.rates,
        fetchedAt: new Date(this.cache.fetchedAt).toISOString(),
      };
    }

    const apiKey = process.env.FX_API_KEY;
    console.log('FX_API_KEY value:', apiKey);  //to debug 
    if (!apiKey) {
      throw new InternalServerErrorException('FX Api key is not configured');
    }

    try {
      const baseUrl = process.env.FX_API_URL ?? 'https://v6.exchangerate-api.com/v6';
      const url = `${baseUrl}/${apiKey}/latest/USD`;

      const response = await firstValueFrom(this.httpService.get(url));
      const rates = response.data.conversion_rates as Record<string, number>;

      this.cache = { rates, fetchedAt: Date.now() };

      return {
        base: Currency.USD,
        rates,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to fetch FX rates from provider', error);

      if (this.cache) {
        this.logger.warn('Returning stale cached rates as fallback');
        return {
          base: Currency.USD,
          rates: this.cache.rates,
          fetchedAt: new Date(this.cache.fetchedAt).toISOString(),
        };
      }

      throw new InternalServerErrorException(
        'FX rates unavailable. Please try again shortly.',
      );
    }
  }

  async getRate(from: Currency, to: Currency): Promise<number> {
    const { rates } = await this.getRates();

    const fromRate = from === Currency.USD ? 1 : rates[from];
    const toRate = to === Currency.USD ? 1 : rates[to];

    if (!fromRate || !toRate) {
      throw new InternalServerErrorException(
        `Rate not available for ${from} or ${to}`,
      );
    }

    return toRate / fromRate;
  }
}