import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { HelloModule } from './hello/hello.module';
import { LoggerModule } from './libs/logger/logger.module';
import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [
    LoggerModule,
    MessagingModule.forRoot(),
    HealthModule,
    HelloModule, // exemplo: apague ao criar seu serviço
  ],
})
export class AppModule {}
