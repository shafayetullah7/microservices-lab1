import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { httpErrorSchema } from '../../http/src/index.js';
import { DrizzleDatabaseHealthIndicator } from './drizzle-database.health-indicator.js';
import { healthCheckResultSchema } from './health-response.schema.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly database: DrizzleDatabaseHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Database liveness check' })
  @ApiOkResponse({
    description: 'All indicators up',
    standardSchema: healthCheckResultSchema,
  })
  @ApiServiceUnavailableResponse({
    description: 'One or more indicators down',
    standardSchema: httpErrorSchema,
  })
  check() {
    return this.health.check([() => this.database.pingCheck()]);
  }
}