import { MessagingConfig } from '../messaging/messaging.config';
import { HelloController } from './hello.controller';

describe('HelloController', () => {
  it('publica hello.requested na fila de entrada com nova saga', async () => {
    const publish = jest.fn().mockResolvedValue(undefined);
    const controller = new HelloController(
      { publish },
      new MessagingConfig({ MESSAGING_INBOUND_QUEUE: 'svc.commands' }),
    );

    const res = await controller.hello({ name: 'Ana' });

    expect(publish).toHaveBeenCalledWith(
      'svc.commands',
      expect.objectContaining({
        type: 'hello.requested',
        sagaId: res.sagaId,
        correlationId: res.sagaId,
        payload: { name: 'Ana' },
      }),
    );
  });
});
