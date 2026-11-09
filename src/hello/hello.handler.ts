import { Injectable } from '@nestjs/common';
import {
  createEnvelope,
  type MessageEnvelope,
} from '../messaging/message-envelope';
import type { MessageHandler } from '../messaging/message-handler';
import { OutboxStore } from '../messaging/outbox/outbox.store';

export type HelloRequested = { name: string };
export type HelloReplied = { greeting: string };

export const HELLO_REPLY_DESTINATION = 'orchestrator.replies';

// Exemplo: recebe um comando e responde ao orquestrador via outbox,
// propagando sagaId e correlationId.
@Injectable()
export class HelloHandler implements MessageHandler<HelloRequested> {
  readonly type = 'hello.requested';

  constructor(private readonly outbox: OutboxStore) {}

  async handle(envelope: MessageEnvelope<HelloRequested>): Promise<void> {
    const reply = createEnvelope<HelloReplied>(
      'hello.replied',
      { greeting: `Olá, ${envelope.payload.name}` },
      { sagaId: envelope.sagaId, correlationId: envelope.correlationId },
    );
    await this.outbox.add(HELLO_REPLY_DESTINATION, reply);
  }
}
