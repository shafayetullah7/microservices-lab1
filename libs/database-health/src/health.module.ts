import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DrizzleDatabaseHealthIndicator } from './drizzle-database.health-indicator.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [DrizzleDatabaseHealthIndicator],
})
export class HealthModule {}
