import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { FxService } from './fx.service';
import { Currency } from '../common/enums/currency.enum';

const mockHttpService = {
  get: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'FX_API_KEY') return 'test-api-key';
    if (key === 'FX_API_URL') return 'https://v6.exchangerate-api.com/v6';
    return null;
  }),
};

describe('FxService', () => {
  let service: FxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FxService,
        { provide: HttpService,    useValue: mockHttpService },
        { provide: ConfigService,  useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<FxService>(FxService);
    jest.clearAllMocks();

    (service as any).cache = null;
  });

  //getRates 

  describe('getRates', () => {
    it('fetches rates from provider on first call', async () => {
      mockHttpService.get.mockReturnValue(
        of({ data: { conversion_rates: { EUR: 0.8706, NGN: 1364.24, GBP: 0.7517 } } }),
      );

      const result = await service.getRates();

      expect(result.base).toBe(Currency.USD);
      expect(result.rates.EUR).toBe(0.8706);
      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
    });

    it('returns cached rates without calling provider again within TTL', async () => {
      mockHttpService.get.mockReturnValue(
        of({ data: { conversion_rates: { EUR: 0.8706 } } }),
      );

      await service.getRates();
      await service.getRates(); //thissecond call should use cache

      expect(mockHttpService.get).toHaveBeenCalledTimes(1);
    });

    it('returns stale cache when provider fails', async () => {
      
      //prime the cache first
      mockHttpService.get.mockReturnValue(
        of({ data: { conversion_rates: { EUR: 0.8706 } } }),
      );
      await service.getRates();

      //expire the cache manually
      (service as any).cache.fetchedAt = Date.now() - 120_000;

      //provider now fails
      mockHttpService.get.mockReturnValue(throwError(() => new Error('Network error')));

      const result = await service.getRates();
      expect(result.rates.EUR).toBe(0.8706); // stale cache returned
    });

    it('throws InternalServerErrorException when provider fails and no cache exists', async () => {
      mockHttpService.get.mockReturnValue(throwError(() => new Error('Network error')));

      await expect(service.getRates()).rejects.toThrow(InternalServerErrorException);
    });
  });




  //getRate 
  describe('getRate', () => {
    beforeEach(() => {
      mockHttpService.get.mockReturnValue(
        of({
          data: {
            conversion_rates: {
              EUR: 0.8706,
              GBP: 0.7517,
              NGN: 1364.24,
            },
          },
        }),
      );
    });

    it('returns 1 for USD to USD', async () => {
      const rate = await service.getRate(Currency.USD, Currency.USD);
      expect(rate).toBe(1);
    });

    it('returns direct rate for USD to EUR', async () => {
      const rate = await service.getRate(Currency.USD, Currency.EUR);
      expect(rate).toBeCloseTo(0.8706, 4);
    });

    it('returns inverse rate for EUR to USD', async () => {
      const rate = await service.getRate(Currency.EUR, Currency.USD);
      expect(rate).toBeCloseTo(1 / 0.8706, 4);
    });

    it('derives correct cross-rate for NGN to USD', async () => {
      const rate = await service.getRate(Currency.NGN, Currency.USD);
      expect(rate).toBeCloseTo(1 / 1364.24, 6);
    });

    it('derives correct cross-rate between two non-USD currencies', async () => {
      // NGN → GBP: GBP_rate / NGN_rate
      const rate = await service.getRate(Currency.NGN, Currency.GBP);
      expect(rate).toBeCloseTo(0.7517 / 1364.24, 6);
    });

    it('derives correct cross-rate for EUR to GBP', async () => {
      const rate = await service.getRate(Currency.EUR, Currency.GBP);
      expect(rate).toBeCloseTo(0.7517 / 0.8706, 4);
    });
  });
});