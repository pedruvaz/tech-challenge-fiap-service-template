import { Injectable, Logger } from '@nestjs/common';
import { ProcessedMessageStore } from './idempotency/processed-message.store';
import type { MessageHandler } from './message-handler';
import type { MessageEnvelope } from './message-envelope';
import { runInSagaContext } from '../saga-context/saga-context';

// Ponto único de entrada das mensagens recebidas (qualquer adapter chama
// `dispatch`). Erro do handler propaga: o adapter decide o que fazer (o SQS
// não apaga a mensagem e o redrive manda pra DLQ).
@Injectable()
export class MessageDispatcher {
  private readonly logger = new Logger(MessageDispatcher.name);
  private readonly handlers = new Map<string, MessageHandler>();

  constructor(private readonly processed: ProcessedMessageStore) {}

  register(handler: MessageHandler): void {
    if (this.handlers.has(handler.type)) {
      throw new Error(`Já existe handler para "${handler.type}".`);
    }
    this.handlers.set(handler.type, handler);
  }

  dispatch(envelope: MessageEnvelope): Promise<void> {
    const { sagaId, correlationId } = envelope;
    return runInSagaContext({ sagaId, correlationId }, async () => {
      const handler = this.handlers.get(envelope.type);
      if (!handler) {
        this.logger.warn(
          `Sem handler para "${envelope.type}"; mensagem ${envelope.messageId} descartada`,
        );
        return;
      }
      if (await this.processed.has(envelope.messageId)) {
        this.logger.log(
          `Mensagem ${envelope.messageId} já processada; ignorada`,
        );
        return;
      }
      await handler.handle(envelope);
      await this.processed.markProcessed(envelope.messageId);
    });
  }
}
