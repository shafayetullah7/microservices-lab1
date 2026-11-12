import { DatabaseError } from 'pg';

const connectionFailureCodes = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNRESET',
  'EPIPE',
  '08000',
  '08001',
  '08003',
  '08004',
  '08006',
  '57P01',
  '57P03',
  '53300',
]);

function getCause(error: unknown): unknown {
  if (typeof error === 'object' && error !== null && 'cause' in error) {
    return (error as { cause: unknown }).cause;
  }
  return undefined;
}

function getNodeErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

export function isDatabaseUnavailable(error: unknown): boolean {
  for (let current = error; current != null; current = getCause(current)) {
    if (
      current instanceof DatabaseError &&
      current.code != null &&
      connectionFailureCodes.has(current.code)
    ) {
      return true;
    }
    const code = getNodeErrorCode(current);
    if (code && connectionFailureCodes.has(code)) {
      return true;
    }
  }
  return false;
}
