import type { MessageEnvelope } from './message-envelope';

// Um handler por tipo de mensagem. Registro explícito: o módulo do serviço
// importa `MessagingModule.forFeature([MeuHandler])` (sem decorator nem
// reflection — o que está registrado fica visível no módulo).
export interface MessageHandler<T = unknown> {
  readonly type: string;
  handle(envelope: MessageEnvelope<T>): Promise<void>;
}
