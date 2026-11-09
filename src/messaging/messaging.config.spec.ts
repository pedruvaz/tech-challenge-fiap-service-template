import { MessagingConfig } from './messaging.config';

describe('MessagingConfig', () => {
  it('usa defaults: driver memory e fila de entrada padrão', () => {
    const c = new MessagingConfig({});
    expect(c.driver).toBe('memory');
    expect(c.inboundQueue).toBe('service-template.commands');
    expect(c.resolveDestination('billing.commands')).toBe('billing.commands');
  });

  it('resolve nome lógico para a env MESSAGING_QUEUE_*', () => {
    const c = new MessagingConfig({
      MESSAGING_DRIVER: 'sqs',
      MESSAGING_QUEUE_BILLING_COMMANDS: 'https://sqs/billing',
      MESSAGING_QUEUE_ORCHESTRATOR_REPLIES: 'https://sqs/replies',
    });
    expect(MessagingConfig.queueEnvName('billing-x.commands')).toBe(
      'MESSAGING_QUEUE_BILLING_X_COMMANDS',
    );
    expect(c.resolveDestination('billing.commands')).toBe(
      'https://sqs/billing',
    );
    expect(c.resolveDestination('orchestrator.replies')).toBe(
      'https://sqs/replies',
    );
  });

  it('usa MESSAGING_INBOUND_QUEUE_URL para a fila de entrada', () => {
    const c = new MessagingConfig({
      MESSAGING_DRIVER: 'sqs',
      MESSAGING_INBOUND_QUEUE: 'a.commands',
      MESSAGING_INBOUND_QUEUE_URL: 'https://sqs/in',
    });
    expect(c.resolveDestination('a.commands')).toBe('https://sqs/in');
  });

  it('falha quando a env da fila não existe', () => {
    const c = new MessagingConfig({ MESSAGING_DRIVER: 'sqs' });
    expect(() => c.resolveDestination('x.y')).toThrow('MESSAGING_QUEUE_X_Y');
  });
});
