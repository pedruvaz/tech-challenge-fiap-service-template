import type { MessageEnvelope } from './message-envelope';

// Porta de saída. Classe abstrata para servir de token de DI. `destination`
// é o nome lógico da fila (ex.: 'billing.commands'); cada adapter resolve
// para o que precisa (a própria string em memória, a URL no SQS).
export abstract class MessagePublisher {
  abstract publish(
    destination: string,
    envelope: MessageEnvelope,
  ): Promise<void>;
}
