import { createEnvelope } from '../message-envelope';
import { OutboxRelay } from './outbox-relay';
import { InMemoryOutboxStore } from './outbox.store';

const opts = { sagaId: 's', correlationId: 'c' };

describe('OutboxRelay', () => {
  let store: InMemoryOutboxStore;
  let publish: jest.Mock;
  let relay: OutboxRelay;

  beforeEach(() => {
    store = new InMemoryOutboxStore();
    publish = jest.fn().mockResolvedValue(undefined);
    relay = new OutboxRelay(store, { publish });
  });

  it('publica pendentes na ordem e marca como publicados', async () => {
    const a = createEnvelope('a', {}, opts);
    const b = createEnvelope('b', {}, opts);
    await store.add('q1', a);
    await store.add('q2', b);
    await relay.flush();
    expect(publish.mock.calls).toEqual([
      ['q1', a],
      ['q2', b],
    ]);
    expect(await store.pullPending(10)).toEqual([]);
  });

  it('mantém o pendente quando a publicação falha e tenta de novo', async () => {
    const a = createEnvelope('a', {}, opts);
    await store.add('q1', a);
    publish.mockRejectedValueOnce(new Error('sqs fora'));
    await relay.flush();
    expect(await store.pullPending(10)).toHaveLength(1);
    await relay.flush();
    expect(await store.pullPending(10)).toHaveLength(0);
  });

  it('drena periodicamente e para no destroy', async () => {
    jest.useFakeTimers();
    try {
      await store.add('q1', createEnvelope('a', {}, opts));
      relay.onModuleInit();
      await jest.advanceTimersByTimeAsync(1000);
      expect(publish).toHaveBeenCalledTimes(1);
      await relay.onModuleDestroy();
      await store.add('q1', createEnvelope('b', {}, opts));
      await jest.advanceTimersByTimeAsync(5000);
      expect(publish).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('flush concorrente espera o em andamento', async () => {
    await store.add('q1', createEnvelope('a', {}, opts));
    await Promise.all([relay.flush(), relay.flush()]);
    expect(publish).toHaveBeenCalledTimes(1);
  });
});
