import { InMemoryProcessedMessageStore } from '../../idempotency/processed-message.store';
import { MessageDispatcher } from '../../message-dispatcher';
import { createEnvelope } from '../../message-envelope';
import { MessagingConfig } from '../../messaging.config';
import { InMemoryMessageBus } from './in-memory-message-bus';

const opts = { sagaId: 's', correlationId: 'c' };

describe('InMemoryMessageBus', () => {
  let dispatcher: MessageDispatcher;
  let bus: InMemoryMessageBus;
  const handle = jest.fn();

  beforeEach(() => {
    handle.mockReset().mockResolvedValue(undefined);
    dispatcher = new MessageDispatcher(new InMemoryProcessedMessageStore());
    dispatcher.register({ type: 'in', handle });
    bus = new InMemoryMessageBus(
      dispatcher,
      new MessagingConfig({ MESSAGING_INBOUND_QUEUE: 'svc.commands' }),
    );
  });

  it('entrega ao dispatcher quando o destino é a fila de entrada', async () => {
    const env = createEnvelope('in', {}, opts);
    await bus.publish('svc.commands', env);
    expect(handle).toHaveBeenCalledWith(env);
    expect(bus.published).toEqual([
      { destination: 'svc.commands', envelope: env },
    ]);
  });

  it('só guarda quando o destino é outra fila', async () => {
    await bus.publish('billing.commands', createEnvelope('in', {}, opts));
    expect(handle).not.toHaveBeenCalled();
    expect(bus.published).toHaveLength(1);
  });

  it('não propaga erro do handler', async () => {
    handle.mockRejectedValue(new Error('x'));
    await expect(
      bus.publish('svc.commands', createEnvelope('in', {}, opts)),
    ).resolves.toBeUndefined();
  });
});
