import { z } from 'zod';

export const orderIdParamSchema = z.uuid({ error: 'id must be a valid UUID' });
