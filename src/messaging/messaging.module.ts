import { SQSClient } from '@aws-sdk/client-sqs';
import {
  DynamicModule,
  Global,
  Module,
  type Provider,
  type Type,
} from '@nestjs/common';
import { InMemoryMessageBus } from './adapters/in-memory/in-memory-message-bus';
import { SqsConsumer } from './adapters/sqs/sqs-consumer';
import { SqsMessagePublisher } from './adapters/sqs/sqs-message-publisher';
import {
  InMemoryProcessedMessageStore,
  ProcessedMessageStore,
} from './idempotency/processed-message.store';
import type { MessageHandler } from './message-handler';
import { MessageDispatcher } from './message-dispatcher';
import { MessagePublisher } from './message-publisher';
import { MessagingConfig } from './messaging.config';
import { OutboxRelay } from './outbox/outbox-relay';
import { InMemoryOutboxStore, OutboxStore } from './outbox/outbox.store';

// Módulo de feature: registra handlers no dispatcher global.
@Module({})
export class MessagingFeatureModule {}

@Global()
@Module({})
export class MessagingModule {
  // Escolhe o adapter por MESSAGING_DRIVER=memory|sqs (default memory).
  // OutboxStore e ProcessedMessageStore entram em memória; o serviço
  // substitui pelos adapters do banco dele (providers no AppModule ou
  // `{ provide: OutboxStore, useClass: ... }` — ver README).
  static forRoot(): DynamicModule {
    const config = new MessagingConfig();
    const sqs = config.driver === 'sqs';

    const providers: Provider[] = [
      { provide: MessagingConfig, useValue: config },
      { provide: OutboxStore, useClass: InMemoryOutboxStore },
      {
        provide: ProcessedMessageStore,
        useClass: InMemoryProcessedMessageStore,
      },
      MessageDispatcher,
      OutboxRelay,
    ];

    if (sqs) {
      providers.push(
        { provide: SQSClient, useFactory: () => new SQSClient({}) },
        { provide: MessagePublisher, useClass: SqsMessagePublisher },
        SqsConsumer,
      );
    } else {
      providers.push(InMemoryMessageBus, {
        provide: MessagePublisher,
        useExisting: InMemoryMessageBus,
      });
    }

    return {
      module: MessagingModule,
      providers,
      exports: [
        MessagingConfig,
        OutboxStore,
        ProcessedMessageStore,
        MessageDispatcher,
        MessagePublisher,
        OutboxRelay,
        ...(sqs ? [] : [InMemoryMessageBus]),
      ],
    };
  }

  // Registro explícito de handlers: no módulo do serviço,
  // `imports: [MessagingModule.forFeature([MeuHandler])]`.
  static forFeature(handlers: Type<MessageHandler>[]): DynamicModule {
    return {
      module: MessagingFeatureModule,
      providers: [
        ...handlers,
        {
          provide: `MESSAGE_HANDLERS_REGISTRATION_${handlers.map((h) => h.name).join('_')}`,
          useFactory: (
            dispatcher: MessageDispatcher,
            ...instances: MessageHandler[]
          ) => {
            instances.forEach((handler) => dispatcher.register(handler));
            return true;
          },
          inject: [MessageDispatcher, ...handlers],
        },
      ],
      exports: handlers,
    };
  }
}
