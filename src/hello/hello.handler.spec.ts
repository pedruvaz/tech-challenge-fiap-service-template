import { createEnvelope } from '../messaging/message-envelope';
import { InMemoryOutboxStore } from '../messaging/outbox/outbox.store';
import { HelloHandler } from './hello.handler';

describe('HelloHandler', () => {
  it('grava hello.replied no outbox propagando saga e correlação', async () => {
    const outbox = new InMemoryOutboxStore();
    const handler = new HelloHandler(outbox);
    await handler.handle(
      createEnvelope(
        'hello.requested',
        { name: 'Ana' },
        { sagaId: 's', correlationId: 'c' },
      ),
    );
    const [rec] = await outbox.pullPending(10);
    expect(rec.destination).toBe('orchestrator.replies');
    expect(rec.envelope).toMatchObject({
      type: 'hello.replied',
      sagaId: 's',
      correlationId: 'c',
      payload: { greeting: 'Olá, Ana' },
    });
  });
});
