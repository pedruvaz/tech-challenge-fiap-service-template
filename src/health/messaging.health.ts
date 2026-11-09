import { Injectable } from '@nestjs/common';
import { HealthIndicatorService } from '@nestjs/terminus';
import { MessagingConfig } from '../messaging/messaging.config';

// Indicador simples: informa o driver de mensageria ativo. Não faz I/O.
@Injectable()
export class MessagingHealthIndicator {
  constructor(
    private readonly indicator: HealthIndicatorService,
    private readonly config: MessagingConfig,
  ) {}

  check(key = 'messaging') {
    return this.indicator.check(key).up({ driver: this.config.driver });
  }
}
