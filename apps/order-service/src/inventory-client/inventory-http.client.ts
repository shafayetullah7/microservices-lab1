import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import {
  AppEnvService,
  type OrderEnv,
} from '../../../../libs/app-env/src/index.js';
import { isAxiosError, type AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';

export type ReserveInventoryRequest = {
  orderId: string;
  productId: string;
  quantity: number;
};

type ReservationResponseBody = {
  status: string;
  reservationId?: string;
};

export type InventoryReservationOutcome =
  | { kind: 'reserved'; reservationId: string }
  | { kind: 'already_reserved'; reservationId: string }
  | { kind: 'insufficient_stock' }
  | { kind: 'conflict' }
  | { kind: 'unavailable' };

@Injectable()
export class InventoryHttpClient {
  constructor(
    private readonly http: HttpService,
    private readonly appEnv: AppEnvService<OrderEnv>,
  ) {}

  async reserveStock(
    request: ReserveInventoryRequest,
  ): Promise<InventoryReservationOutcome> {
    const baseUrl = this.appEnv.get('INVENTORY_SERVICE_URL').replace(/\/$/, '');
    const timeoutMs = this.appEnv.get('INVENTORY_HTTP_TIMEOUT_MS');

    try {
      const response = await firstValueFrom<AxiosResponse<ReservationResponseBody>>(
        this.http
          .post<ReservationResponseBody>(`${baseUrl}/reservations`, request, {
            validateStatus: () => true,
          })
          .pipe(timeout(timeoutMs)),
      );

      if (response.status === 201 && response.data.status === 'reserved') {
        return {
          kind: 'reserved',
          reservationId: response.data.reservationId ?? '',
        };
      }

      if (
        response.status === 200 &&
        response.data.status === 'already_reserved'
      ) {
        return {
          kind: 'already_reserved',
          reservationId: response.data.reservationId ?? '',
        };
      }

      if (
        response.status === 409 &&
        response.data.status === 'insufficient_stock'
      ) {
        return { kind: 'insufficient_stock' };
      }

      if (response.status === 409 && response.data.status === 'conflict') {
        return { kind: 'conflict' };
      }

      if (response.status >= 500) {
        return { kind: 'unavailable' };
      }

      return { kind: 'unavailable' };
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        const body = error.response.data as { status?: string };
        if (body?.status === 'insufficient_stock') {
          return { kind: 'insufficient_stock' };
        }
        if (body?.status === 'conflict') {
          return { kind: 'conflict' };
        }
      }
      return { kind: 'unavailable' };
    }
  }
}
