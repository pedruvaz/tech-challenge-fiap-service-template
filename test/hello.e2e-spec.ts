import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { InMemoryMessageBus } from '../src/messaging/adapters/in-memory/in-memory-message-bus';
import { OutboxRelay } from '../src/messaging/outbox/outbox-relay';
import type { MessageEnvelope } from '../src/messaging/message-envelope';

describe('hello (e2e, driver memory)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    process.env.MESSAGING_DRIVER = 'memory';
    process.env.OUTBOX_POLL_INTERVAL_MS = '60000'; // o teste dá flush à mão
    process.env.LOG_LEVEL = 'silent';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /hello resulta em hello.replied em orchestrator.replies com o mesmo sagaId', async () => {
    const res = await request(app.getHttpServer())
      .post('/hello')
      .send({ name: 'Mundo' })
      .expect(201);
    const { sagaId } = res.body as { sagaId: string };

    await app.get(OutboxRelay).flush();

    const bus = app.get(InMemoryMessageBus);
    const reply = bus.published.find(
      (m) => m.destination === 'orchestrator.replies',
    );
    expect(reply).toBeDefined();
    const envelope = reply!.envelope as MessageEnvelope<{ greeting: string }>;
    expect(envelope.type).toBe('hello.replied');
    expect(envelope.sagaId).toBe(sagaId);
    expect(envelope.correlationId).toBe(sagaId);
    expect(envelope.payload.greeting).toBe('Olá, Mundo');
  });

  it('POST /hello rejeita payload inválido', async () => {
    await request(app.getHttpServer()).post('/hello').send({}).expect(400);
  });

  it('GET /health/ready informa o driver', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);
    expect((res.body as { info: unknown }).info).toMatchObject({
      messaging: { driver: 'memory' },
    });
  });
});
