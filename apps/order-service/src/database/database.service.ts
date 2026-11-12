import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import type { Database } from '../db/database.js';

@Injectable()
export class DatabaseService {
  constructor(@InjectDrizzle() readonly db: Database) {}
}
