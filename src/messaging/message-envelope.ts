import { randomUUID } from 'node:crypto';

export type MessageEnvelope<T = unknown> = {
  messageId: string;
  type: string;
  version: number;
  sagaId: string;
  correlationId: string;
  occurredAt: string;
  payload: T;
};

export type EnvelopeOptions = {
  sagaId: string;
  correlationId: string;
  version?: number;
};

export function createEnvelope<T>(
  type: string,
  payload: T,
  { sagaId, correlationId, version = 1 }: EnvelopeOptions,
): MessageEnvelope<T> {
  return {
    messageId: randomUUID(),
    type,
    version,
    sagaId,
    correlationId,
    occurredAt: new Date().toISOString(),
    payload,
  };
}
