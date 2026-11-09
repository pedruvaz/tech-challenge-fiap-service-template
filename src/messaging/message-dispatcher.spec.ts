import { InMemoryProcessedMessageStore } from './idempotency/processed-message.store';
import { MessageDispatcher } from './message-dispatcher';
import { createEnvelope } from './message-envelope';
import type { MessageHandler } from './message-handler';
import { currentSagaContext } from '../saga-context/saga-context';

const opts = { sagaId: 'saga-1', correlationId: 'corr-1' };

describe('MessageDispatcher', () => {
  let dispatcher: MessageDispatcher;
  let handler: MessageHandler & { handle: jest.Mock };

  beforeEach(() => {
    dispatcher = new MessageDispatcher(new InMemoryProcessedMessageStore());
    handler = { type: 'a.b', handle: jest.fn().mockResolvedValue(undefined) };
    dispatcher.register(handler);
  });

  it('chama o handler dentro do SagaContext', async () => {
    let ctx;
    handler.handle.mockImplementation(() => {
      ctx = currentSagaContext();
      return Promise.resolve();
    });
    await dispatcher.dispatch(createEnvelope('a.b', {}, opts));
    expect(ctx).toEqual(opts);
    expect(currentSagaContext()).toBeUndefined();
  });

  it('ignora mensagem já processada', async () => {
    const env = createEnvelope('a.b', {}, opts);
    await dispatcher.dispatch(env);
    await dispatcher.dispatch(env);
    expect(handler.handle).toHaveBeenCalledTimes(1);
  });

  it('descarta tipo sem handler sem lançar erro', async () => {
    await expect(
      dispatcher.dispatch(createEnvelope('desconhecido', {}, opts)),
    ).resolves.toBeUndefined();
    expect(handler.handle).not.toHaveBeenCalled();
  });

  it('propaga erro do handler e não marca como processada', async () => {
    const env = createEnvelope('a.b', {}, opts);
    handler.handle.mockRejectedValueOnce(new Error('boom'));
    await expect(dispatcher.dispatch(env)).rejects.toThrow('boom');
    await dispatcher.dispatch(env);
    expect(handler.handle).toHaveBeenCalledTimes(2);
  });

  it('rejeita handler duplicado', () => {
    expect(() => dispatcher.register(handler)).toThrow('Já existe handler');
  });
});
