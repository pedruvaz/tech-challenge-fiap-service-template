import { Injectable } from '@nestjs/common';
import type { MessageEnvelope } from '../message-envelope';

export type OutboxRecord = {
  destination: string;
  envelope: MessageEnvelope;
};

// Porta do transactional outbox: handlers gravam aqui (na mesma transação do
// banco) em vez de publicar direto; o OutboxRelay publica depois. O serviço
// implementa com o banco dele. `pullPending` deve devolver na ordem de
// inserção.
export abstract class OutboxStore {
  abstract add(destination: string, envelope: MessageEnvelope): Promise<void>;
  abstract pullPending(limit: number): Promise<OutboxRecord[]>;
  abstract markPublished(messageId: string): Promise<void>;
}

@Injectable()
export class InMemoryOutboxStore extends OutboxStore {
  private readonly pending = new Map<string, OutboxRecord>();

  add(destination: string, envelope: MessageEnvelope): Promise<void> {
    this.pending.set(envelope.messageId, { destination, envelope });
    return Promise.resolve();
  }

  pullPending(limit: number): Promise<OutboxRecord[]> {
    return Promise.resolve([...this.pending.values()].slice(0, limit));
  }

  markPublished(messageId: string): Promise<void> {
    this.pending.delete(messageId);
    return Promise.resolve();
  }
}
