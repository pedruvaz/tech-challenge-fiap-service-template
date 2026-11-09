import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { HelloController } from './hello.controller';
import { HelloHandler } from './hello.handler';

// Exemplo: apague este módulo ao criar seu serviço.
@Module({
  imports: [MessagingModule.forFeature([HelloHandler])],
  controllers: [HelloController],
})
export class HelloModule {}
