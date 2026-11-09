import { Injectable, Logger } from '@nestjs/common';
import { errorMessage } from '../../error-message';
import type { MessageEnvelope } from '../../message-envelope';
import { MessageDispatcher } from '../../message-dispatcher';
import { MessagePublisher } from '../../message-publisher';
import { MessagingConfig } from '../../messaging.config';

export type PublishedMessage = {
  destination: string;
  envelope: MessageEnvelope;
};

// Driver `memory`: sem fila externa. Guarda tudo em `published` (para
// asserções em testes) e, se o destino é a fila de entrada deste serviço,
// entrega ao dispatcher na hora.
@Injectable()
export class InMemoryMessageBus extends MessagePublisher {
  private readonly logger = new Logger(InMemoryMessageBus.name);
  readonly published: PublishedMessage[] = [];

  constructor(
    private readonly dispatcher: MessageDispatcher,
    private readonly config: MessagingConfig,
  ) {
    super();
  }

  async publish(destination: string, envelope: MessageEnvelope): Promise<void> {
    this.published.push({ destination, envelope });
    if (destination !== this.config.inboundQueue) return;
    try {
      await this.dispatcher.dispatch(envelope);
    } catch (error) {
      // Fila real não devolve o erro do consumidor ao produtor; simula isso.
      this.logger.error(
        `Handler falhou para ${envelope.type}: ${errorMessage(error)}`,
      );
    }
  }
}
