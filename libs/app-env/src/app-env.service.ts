import { Inject, Injectable } from '@nestjs/common';
import { APP_ENV_TOKEN } from './app-env.constants.js';

@Injectable()
export class AppEnvService<T extends Record<string, unknown>> {
  constructor(@Inject(APP_ENV_TOKEN) private readonly env: T) {}

  get<K extends keyof T>(key: K): T[K] {
    return this.env[key];
  }

  get values(): Readonly<T> {
    return this.env;
  }
}
