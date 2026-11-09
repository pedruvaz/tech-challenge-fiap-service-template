import { Test } from '@nestjs/testing';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { MessagingHealthIndicator } from './messaging.health';
import { MessagingConfig } from '../messaging/messaging.config';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        MessagingHealthIndicator,
        { provide: MessagingConfig, useValue: new MessagingConfig({}) },
      ],
    }).compile();
    controller = mod.get(HealthController);
  });

  it('live responde ok sem dependências', async () => {
    const res = await controller.live();
    expect(res.status).toBe('ok');
  });

  it('ready inclui o driver de mensageria ativo', async () => {
    const res = await controller.ready();
    expect(res.status).toBe('ok');
    expect(res.info).toEqual({ messaging: { status: 'up', driver: 'memory' } });
  });
});
