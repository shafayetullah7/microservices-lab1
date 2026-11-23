import amqp from 'amqplib';

export type WaitForRabbitMqOptions = {
  maxAttempts?: number;
  intervalMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
};

export async function waitForRabbitMq(
  url: string,
  options: WaitForRabbitMqOptions = {},
): Promise<void> {
  const maxAttempts = options.maxAttempts ?? 30;
  const intervalMs = options.intervalMs ?? 1000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const connection = await amqp.connect(url);
      await connection.close();
      return;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        break;
      }
      options.onRetry?.(attempt, error);
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `RabbitMQ is not available after ${maxAttempts} attempt(s): ${message}`,
  );
}