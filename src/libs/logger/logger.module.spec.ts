import { runInSagaContext } from '../../saga-context/saga-context';
import { logMixin } from './logger.module';

describe('logMixin', () => {
  it('fora de saga não acrescenta campos de saga', () => {
    expect(logMixin()).not.toHaveProperty('sagaId');
  });

  it('dentro de saga inclui sagaId e correlationId', () => {
    const fields = runInSagaContext(
      { sagaId: 's1', correlationId: 'c1' },
      logMixin,
    );
    expect(fields).toMatchObject({ sagaId: 's1', correlationId: 'c1' });
  });
});
