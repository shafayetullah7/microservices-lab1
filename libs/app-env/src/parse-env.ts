import type { ZodType, z } from 'zod';

export function parseEnv<T extends ZodType>(
  schema: T,
  source: NodeJS.ProcessEnv,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }
  return result.data;
}
