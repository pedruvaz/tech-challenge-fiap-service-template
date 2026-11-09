import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Injectable } from '@nestjs/common';
import type { MessageEnvelope } from '../../message-envelope';
import { MessagePublisher } from '../../message-publisher';
import { MessagingConfig } from '../../messaging.config';

@Injectable()
export class SqsMessagePublisher extends MessagePublisher {
  constructor(
    private readonly client: SQSClient,
    private readonly config: MessagingConfig,
  ) {
    super();
  }

  async publish(destination: string, envelope: MessageEnvelope): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.config.resolveDestination(destination),
        MessageBody: JSON.stringify(envelope),
        MessageAttributes: {
          type: { DataType: 'String', StringValue: envelope.type },
          sagaId: { DataType: 'String', StringValue: envelope.sagaId },
        },
      }),
    );
  }
}
