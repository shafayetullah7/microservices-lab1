import { z } from 'zod';

export const healthCheckResultSchema = z.object({
  status: z.enum(['ok', 'error', 'shutting_down']),
  info: z.record(z.string(), z.unknown()).optional(),
  error: z.record(z.string(), z.unknown()).optional(),
  details: z.record(z.string(), z.unknown()).optional(),
});