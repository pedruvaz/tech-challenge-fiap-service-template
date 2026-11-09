import { errorMessage } from '../../error-message';
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { MessageEnvelope } from '../../message-envelope';
import { MessageDispatcher } from '../../message-dispatcher';
import { MessagingConfig } from '../../messaging.config';

const ERROR_BACKOFF_MS = 1000;

// Long polling na fila de entrada. Só apaga a mensagem se o dispatch deu
// certo; em erro ela volta após o visibility timeout e, estourando o
// maxReceiveCount, o redrive da fila manda pra DLQ.
@Injectable()
export class SqsConsumer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqsConsumer.name);
  private readonly abort = new AbortController();
  private running = false;
  private loop?: Promise<void>;

  constructor(
    private readonly client: SQSClient,
    private readonly dispatcher: MessageDispatcher,
    private readonly config: MessagingConfig,
  ) {}

  onModuleInit(): void {
    if (!this.config.inboundQueueUrl) {
      throw new Error('Defina MESSAGING_INBOUND_QUEUE_URL para o driver sqs.');
    }
    this.running = true;
    this.loop = this.run();
  }

  async onModuleDestroy(): Promise<void> {
    this.running = false;
    this.abort.abort(); // interrompe o long polling em andamento
    await this.loop;
  }

  // Uma rodada de ReceiveMessage + processamento. Público para testes.
  async pollOnce(): Promise<void> {
    const queueUrl = this.config.inboundQueueUrl;
    const { Messages = [] } = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        WaitTimeSeconds: 20,
        MaxNumberOfMessages: 10,
      }),
      { abortSignal: this.abort.signal },
    );
    for (const message of Messages) {
      try {
        const envelope = JSON.parse(message.Body ?? '') as MessageEnvelope;
        await this.dispatcher.dispatch(envelope);
        await this.client.send(
          new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          }),
        );
      } catch (error) {
        this.logger.error(
          `Falha ao processar ${message.MessageId}; mantida na fila para redrive: ${errorMessage(error)}`,
        );
      }
    }
  }

  private async run(): Promise<void> {
    while (this.running) {
      try {
        await this.pollOnce();
      } catch (error) {
        if (!this.running) break;
        this.logger.error(`Falha no polling: ${errorMessage(error)}`);
        await new Promise((resolve) => setTimeout(resolve, ERROR_BACKOFF_MS));
      }
    }
  }
}
