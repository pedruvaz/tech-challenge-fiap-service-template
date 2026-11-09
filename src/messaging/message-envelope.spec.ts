import { createEnvelope } from './message-envelope';

describe('createEnvelope', () => {
  it('preenche metadados e usa version 1 por padrão', () => {
    const env = createEnvelope(
      'x.y',
      { a: 1 },
      { sagaId: 's', correlationId: 'c' },
    );
    expect(env).toMatchObject({
      type: 'x.y',
      version: 1,
      sagaId: 's',
      correlationId: 'c',
      payload: { a: 1 },
    });
    expect(env.messageId).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(env.occurredAt).toISOString()).toBe(env.occurredAt);
  });

  it('aceita version explícita e gera messageId distinto', () => {
    const o = { sagaId: 's', correlationId: 'c', version: 3 };
    const a = createEnvelope('t', {}, o);
    const b = createEnvelope('t', {}, o);
    expect(a.version).toBe(3);
    expect(a.messageId).not.toBe(b.messageId);
  });
});
