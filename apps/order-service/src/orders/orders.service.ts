import { Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryHttpClient,
  type InventoryReservationOutcome,
} from '../inventory-client/inventory-http.client.js';
import type { CreateOrderDto } from './dto/create-order.dto.js';
import type { ListOrdersQuery } from './dto/list-orders.query.js';
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

export type OrderListResponse = {
  data: OrderResponse[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
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

    return this.applyInventoryOutcome(order, inventory);
  }

  async reconcileOrder(orderId: string): Promise<OrderResponse> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} was not found`);
    }

    if (order.status === 'RESERVED' || order.status === 'REJECTED') {
      return this.toResponse(order);
    }

    const inventory = await this.inventoryClient.reserveStock({
      orderId: order.id,
      productId: order.productId,
      quantity: order.quantity,
    });

    return this.applyInventoryOutcome(order, inventory);
  }

  async listOrders(query: ListOrdersQuery): Promise<OrderListResponse> {
    const { page, pageSize, sortBy, sortOrder } = query;
    const { items, totalItems } = await this.orderRepository.findPage(
      page,
      pageSize,
      sortBy,
      sortOrder,
    );
    const totalPages =
      totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);

    return {
      data: items.map((order) => this.toResponse(order)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getOrder(orderId: string): Promise<OrderResponse> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} was not found`);
    }
    return this.toResponse(order);
  }

  private async applyInventoryOutcome(
    order: OrderWithLine,
    inventory: InventoryReservationOutcome,
  ): Promise<OrderResponse> {
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