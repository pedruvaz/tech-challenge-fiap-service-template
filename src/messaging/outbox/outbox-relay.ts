import { errorMessage } from '../error-message';
import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { MessagePublisher } from '../message-publisher';
import { OutboxStore } from './outbox.store';

const BATCH_SIZE = 50;

// Worker que drena o outbox: publica os pendentes e marca como publicados.
// Entrega at-least-once — se cair entre publicar e marcar, republica; o
// consumidor deduplica pelo messageId.
@Injectable()
export class OutboxRelay implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelay.name);
  private readonly intervalMs = Number(
    process.env.OUTBOX_POLL_INTERVAL_MS ?? 1000,
  );
  private timer?: NodeJS.Timeout;
  private running?: Promise<void>;

  constructor(
    private readonly outbox: OutboxStore,
    private readonly publisher: MessagePublisher,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.flush();
    }, this.intervalMs);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    await this.running;
  }

  // Público para testes: drena o outbox agora.
  async flush(): Promise<void> {
    if (this.running) await this.running;
    this.running = this.drain().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }

  private async drain(): Promise<void> {
    try {
      let batch = await this.outbox.pullPending(BATCH_SIZE);
      while (batch.length > 0) {
        for (const { destination, envelope } of batch) {
          await this.publisher.publish(destination, envelope);
          await this.outbox.markPublished(envelope.messageId);
        }
        batch = await this.outbox.pullPending(BATCH_SIZE);
      }
    } catch (error) {
      // Mantém a ordem: para no primeiro erro e tenta de novo no próximo tick.
      this.logger.error(`Falha ao publicar o outbox: ${errorMessage(error)}`);
    }
  }
}
