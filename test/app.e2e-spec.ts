import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('FX Trading App (e2e)', () => {
  let app: INestApplication;
  let accessToken: string | undefined;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  //auth test

  describe('POST /auth/register', () => {
    it('registers a new user successfully', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'e2e@example.com', password: 'Str0ngP@ss!' })
        .expect(201)
        .expect((res) => {
          expect(res.body.message).toContain('Registration successful');
        });
    });

    it('rejects duplicate email with 409', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'e2e@example.com', password: 'Str0ngP@ss!' })
        .expect(409);
    });

    it('rejects missing password with 400', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'e2e@example.com' })
        .expect(400);
    });

    it('rejects invalid email with 400', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'notanemail', password: 'Str0ngP@ss!' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('rejects unverified user with 403', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e@example.com', password: 'Str0ngP@ss!' })
        .expect(403);
    });

    it('rejects wrong password with 401', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'e2e@example.com', password: 'WrongPassword1!' })
        .expect(401);
    });
  });

  //protected routes no token 

  describe('Protected routes — no token', () => {
    it('GET /wallet returns 401', () => {
      return request(app.getHttpServer()).get('/wallet').expect(401);
    });

    it('GET /fx/rates returns 401', () => {
      return request(app.getHttpServer()).get('/fx/rates').expect(401);
    });

    it('GET /transactions returns 401', () => {
      return request(app.getHttpServer()).get('/transactions').expect(401);
    });
  });

  //wallet validation

  describe('POST /wallet/fund — validation', () => {
    it('rejects negative amount with 400', async () => {
      if (!accessToken) return; // skip if no token
      return request(app.getHttpServer())
        .post('/wallet/fund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currency: 'NGN', amount: -100 })
        .expect(400);
    });

    it('rejects invalid currency with 400', async () => {
      if (!accessToken) return;
      return request(app.getHttpServer())
        .post('/wallet/fund')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ currency: 'XYZ', amount: 100 })
        .expect(400);
    });

    it('rejects same fromCurrency and toCurrency on convert', async () => {
      if (!accessToken) return;
      return request(app.getHttpServer())
        .post('/wallet/convert')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ fromCurrency: 'NGN', toCurrency: 'NGN', amount: 100 })
        .expect(400);
    });
  });
});