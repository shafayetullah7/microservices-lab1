import { Injectable, NotFoundException } from '@nestjs/common';
import { InventoryHttpClient } from '../inventory-client/inventory-http.client.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import {
  OrderRepository,
  type OrderStatus,
  type OrderWithLine,
} from './order.repository.js';

export type OrderResponse = {
  id: string;
  status: OrderStatus;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
  reservationId?: string;
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly inventoryClient: InventoryHttpClient,
  ) {}

  async createOrder(dto: CreateOrderDto): Promise<OrderResponse> {
    const order = await this.orderRepository.createOrder(dto);

    const inventory = await this.inventoryClient.reserveStock({
      orderId: order.id,
      productId: dto.productId,
      quantity: dto.quantity,
    });

    switch (inventory.kind) {
      case 'reserved':
      case 'already_reserved':
        await this.orderRepository.updateStatus(order.id, 'RESERVED');
        return this.toResponse({
          ...order,
          status: 'RESERVED',
          reservationId: inventory.reservationId,
        });
      case 'insufficient_stock':
      case 'conflict':
        await this.orderRepository.updateStatus(order.id, 'REJECTED');
        return this.toResponse({
          ...order,
          status: 'REJECTED',
        });
      case 'unavailable':
        return this.toResponse(order);
    }
  }

  async getOrder(orderId: string): Promise<OrderResponse> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} was not found`);
    }
    return this.toResponse(order);
  }

  private toResponse(
    order: OrderWithLine & { reservationId?: string },
  ): OrderResponse {
    return {
      id: order.id,
      status: order.status,
      productId: order.productId,
      quantity: order.quantity,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      ...(order.reservationId ? { reservationId: order.reservationId } : {}),
    };
  }
}
