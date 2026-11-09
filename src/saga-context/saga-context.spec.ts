import { currentSagaContext, runInSagaContext } from './saga-context';

describe('SagaContext', () => {
  it('expõe o contexto apenas dentro do run, inclusive após await', async () => {
    const ctx = { sagaId: 's', correlationId: 'c' };
    expect(currentSagaContext()).toBeUndefined();
    await runInSagaContext(ctx, async () => {
      await Promise.resolve();
      expect(currentSagaContext()).toEqual(ctx);
    });
    expect(currentSagaContext()).toBeUndefined();
  });
});
