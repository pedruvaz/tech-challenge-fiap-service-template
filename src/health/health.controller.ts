import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { MessagingHealthIndicator } from './messaging.health';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly messaging: MessagingHealthIndicator,
  ) {}

  // Liveness: o processo responde. Não checa dependências.
  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  // Readiness: dependências prontas para receber tráfego. Serviços que
  // adicionarem banco incluem o indicador dele aqui.
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([() => this.messaging.check()]);
  }
}
