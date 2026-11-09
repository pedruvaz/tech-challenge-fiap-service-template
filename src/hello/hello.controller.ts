import { randomUUID } from 'node:crypto';
import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createEnvelope } from '../messaging/message-envelope';
import { MessagePublisher } from '../messaging/message-publisher';
import { MessagingConfig } from '../messaging/messaging.config';
import { HelloRequestDto } from './hello.dto';

// Só para testar local: publica hello.requested na própria fila de entrada.
@ApiTags('hello')
@Controller('hello')
export class HelloController {
  constructor(
    private readonly publisher: MessagePublisher,
    private readonly config: MessagingConfig,
  ) {}

  @Post()
  async hello(@Body() body: HelloRequestDto) {
    const sagaId = randomUUID();
    const envelope = createEnvelope(
      'hello.requested',
      { name: body.name },
      { sagaId, correlationId: sagaId },
    );
    await this.publisher.publish(this.config.inboundQueue, envelope);
    return { sagaId, messageId: envelope.messageId };
  }
}
