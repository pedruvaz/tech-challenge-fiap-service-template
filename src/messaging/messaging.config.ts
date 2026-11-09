export type MessagingDriver = 'memory' | 'sqs';

// Lê a configuração de mensageria do ambiente. Único lugar que conhece as
// convenções de nome das envs.
export class MessagingConfig {
  readonly driver: MessagingDriver;
  readonly inboundQueue: string;
  readonly inboundQueueUrl?: string;

  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {
    this.driver = env.MESSAGING_DRIVER === 'sqs' ? 'sqs' : 'memory';
    this.inboundQueue =
      env.MESSAGING_INBOUND_QUEUE ?? 'service-template.commands';
    this.inboundQueueUrl = env.MESSAGING_INBOUND_QUEUE_URL || undefined;
  }

  // 'billing.commands' -> MESSAGING_QUEUE_BILLING_COMMANDS
  static queueEnvName(logicalName: string): string {
    return `MESSAGING_QUEUE_${logicalName.toUpperCase().replace(/[.-]/g, '_')}`;
  }

  // Nome lógico -> endereço real. Em memória o nome é o próprio endereço; no
  // SQS é a URL vinda da env. A fila de entrada do serviço usa
  // MESSAGING_INBOUND_QUEUE_URL.
  resolveDestination(logicalName: string): string {
    if (this.driver === 'memory') return logicalName;
    if (logicalName === this.inboundQueue && this.inboundQueueUrl) {
      return this.inboundQueueUrl;
    }
    const envName = MessagingConfig.queueEnvName(logicalName);
    const url = this.env[envName];
    if (!url) {
      throw new Error(
        `Fila "${logicalName}" sem URL: defina a env ${envName}.`,
      );
    }
    return url;
  }
}
