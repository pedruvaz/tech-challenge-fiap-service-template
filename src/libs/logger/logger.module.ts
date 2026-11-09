import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { trace } from '@opentelemetry/api';
import { currentSagaContext } from '../../saga-context/saga-context';

// Acrescenta em todo log o trace do OTel e, quando estiver dentro de uma
// saga (consumo de mensagem), o sagaId/correlationId do SagaContext.
export function logMixin(): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  const span = trace.getActiveSpan();
  if (span) {
    const ctx = span.spanContext();
    fields['trace.id'] = ctx.traceId;
    fields['span.id'] = ctx.spanId;
  }
  const saga = currentSagaContext();
  if (saga) {
    fields.sagaId = saga.sagaId;
    fields.correlationId = saga.correlationId;
  }
  return fields;
}

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        ...(process.env.NODE_ENV !== 'production' && {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, singleLine: true },
          },
        }),
        base: {
          service: process.env.OTEL_SERVICE_NAME ?? 'service-template',
          env: process.env.APP_ENV ?? 'development',
          ...(process.env.OTEL_SERVICE_VERSION && {
            version: process.env.OTEL_SERVICE_VERSION,
          }),
        },
        mixin: logMixin,
        redact: ['req.headers.authorization'],
        serializers: {
          req(req: { id: string; method: string; url: string }) {
            return { id: req.id, method: req.method, url: req.url };
          },
        },
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
