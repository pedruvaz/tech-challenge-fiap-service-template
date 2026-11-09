import { SendMessageCommand, type SQSClient } from '@aws-sdk/client-sqs';
import { createEnvelope } from '../../message-envelope';
import { MessagingConfig } from '../../messaging.config';
import { SqsMessagePublisher } from './sqs-message-publisher';

describe('SqsMessagePublisher', () => {
  it('envia o envelope com MessageAttributes type e sagaId', async () => {
    const send = jest.fn().mockResolvedValue({});
    const config = new MessagingConfig({
      MESSAGING_DRIVER: 'sqs',
      MESSAGING_QUEUE_BILLING_COMMANDS: 'https://sqs/billing',
    });
    const publisher = new SqsMessagePublisher(
      { send } as unknown as SQSClient,
      config,
    );
    const env = createEnvelope(
      'billing.charge',
      { v: 1 },
      { sagaId: 's1', correlationId: 'c1' },
    );

    await publisher.publish('billing.commands', env);

    const [cmd] = send.mock.calls[0] as [SendMessageCommand];
    expect(cmd).toBeInstanceOf(SendMessageCommand);
    expect(cmd.input.QueueUrl).toBe('https://sqs/billing');
    expect(JSON.parse(cmd.input.MessageBody!)).toEqual(env);
    expect(cmd.input.MessageAttributes).toEqual({
      type: { DataType: 'String', StringValue: 'billing.charge' },
      sagaId: { DataType: 'String', StringValue: 's1' },
    });
  });
});
