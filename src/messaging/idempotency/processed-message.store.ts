import { Injectable } from '@nestjs/common';

// Porta de idempotência: registra os messageId já tratados. O serviço
// implementa com o banco dele. O ideal é gravar `markProcessed` na mesma
// transação dos efeitos do handler (incluindo o `OutboxStore.add`).
export abstract class ProcessedMessageStore {
  abstract has(messageId: string): Promise<boolean>;
  abstract markProcessed(messageId: string): Promise<void>;
}

@Injectable()
export class InMemoryProcessedMessageStore extends ProcessedMessageStore {
  private readonly processed = new Set<string>();

  has(messageId: string): Promise<boolean> {
    return Promise.resolve(this.processed.has(messageId));
  }

  markProcessed(messageId: string): Promise<void> {
    this.processed.add(messageId);
    return Promise.resolve();
  }
}
