import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  type SQSClient,
} from '@aws-sdk/client-sqs';
import { createEnvelope } from '../../message-envelope';
import type { MessageDispatcher } from '../../message-dispatcher';
import { MessagingConfig } from '../../messaging.config';
import { SqsConsumer } from './sqs-consumer';

const config = new MessagingConfig({
  MESSAGING_DRIVER: 'sqs',
  MESSAGING_INBOUND_QUEUE_URL: 'https://sqs/in',
});
const env = createEnvelope('a', {}, { sagaId: 's', correlationId: 'c' });

describe('SqsConsumer', () => {
  let send: jest.Mock;
  let dispatch: jest.Mock;
  let consumer: SqsConsumer;

  const build = () =>
    new SqsConsumer(
      { send } as unknown as SQSClient,
      { dispatch } as unknown as MessageDispatcher,
      config,
    );

  beforeEach(() => {
    send = jest.fn();
    dispatch = jest.fn().mockResolvedValue(undefined);
    consumer = build();
  });

  it('faz long polling e apaga a mensagem após o sucesso', async () => {
    send
      .mockResolvedValueOnce({
        Messages: [
          { MessageId: '1', Body: JSON.stringify(env), ReceiptHandle: 'rh' },
        ],
      })
      .mockResolvedValueOnce({});
    await consumer.pollOnce();

    const [receive] = send.mock.calls[0] as [ReceiveMessageCommand];
    expect(receive.input).toMatchObject({
      QueueUrl: 'https://sqs/in',
      WaitTimeSeconds: 20,
    });
    expect(dispatch).toHaveBeenCalledWith(env);
    const [del] = send.mock.calls[1] as [DeleteMessageCommand];
    expect(del).toBeInstanceOf(DeleteMessageCommand);
    expect(del.input.ReceiptHandle).toBe('rh');
  });

  it('não apaga quando o handler falha (redrive para a DLQ)', async () => {
    dispatch.mockRejectedValue(new Error('boom'));
    send.mockResolvedValueOnce({
      Messages: [
        { MessageId: '1', Body: JSON.stringify(env), ReceiptHandle: 'rh' },
      ],
    });
    await consumer.pollOnce();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('não apaga mensagem com corpo inválido', async () => {
    send.mockResolvedValueOnce({
      Messages: [{ MessageId: '1', Body: 'nao-json', ReceiptHandle: 'rh' }],
    });
    await consumer.pollOnce();
    expect(dispatch).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('tolera resposta sem Messages', async () => {
    send.mockResolvedValueOnce({});
    await consumer.pollOnce();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('exige MESSAGING_INBOUND_QUEUE_URL', () => {
    const c = new SqsConsumer(
      { send } as unknown as SQSClient,
      { dispatch } as unknown as MessageDispatcher,
      new MessagingConfig({ MESSAGING_DRIVER: 'sqs' }),
    );
    expect(() => c.onModuleInit()).toThrow('MESSAGING_INBOUND_QUEUE_URL');
  });

  it('loop continua após erro de polling e para no destroy', async () => {
    jest.useFakeTimers();
    try {
      send
        .mockRejectedValueOnce(new Error('rede'))
        .mockImplementation(
          (_cmd, opts: { abortSignal: AbortSignal }) =>
            new Promise((_, reject) =>
              opts.abortSignal.addEventListener('abort', () =>
                reject(new Error('abortado')),
              ),
            ),
        );
      consumer.onModuleInit();
      await jest.advanceTimersByTimeAsync(1100);
      expect(send).toHaveBeenCalledTimes(2);
      await consumer.onModuleDestroy();
    } finally {
      jest.useRealTimers();
    }
  });
});
