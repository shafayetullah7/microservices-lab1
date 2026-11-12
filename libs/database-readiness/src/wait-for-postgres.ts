import pg from 'pg';

export type WaitForPostgresOptions = {
  maxAttempts?: number;
  intervalMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
};

export async function waitForPostgres(
  connectionString: string,
  options: WaitForPostgresOptions = {},
): Promise<void> {
  const maxAttempts = options.maxAttempts ?? 30;
  const intervalMs = options.intervalMs ?? 1000;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const client = new pg.Client({ connectionString });
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return;
    } catch (error) {
      lastError = error;
      try {
        await client.end();
      } catch {
        // ignore cleanup errors while retrying
      }
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
    `PostgreSQL is not available after ${maxAttempts} attempt(s): ${message}`,
  );
}
