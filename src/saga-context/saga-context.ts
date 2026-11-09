import { AsyncLocalStorage } from 'node:async_hooks';

export type SagaContext = {
  sagaId: string;
  correlationId: string;
};

const storage = new AsyncLocalStorage<SagaContext>();

// Roda `fn` com o contexto da saga disponível para tudo que ela chamar
// (handlers, logger). O dispatcher abre um contexto por mensagem consumida.
export function runInSagaContext<T>(context: SagaContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function currentSagaContext(): SagaContext | undefined {
  return storage.getStore();
}
