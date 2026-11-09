import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { MessagingHealthIndicator } from './messaging.health';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [MessagingHealthIndicator],
})
export class HealthModule {}
