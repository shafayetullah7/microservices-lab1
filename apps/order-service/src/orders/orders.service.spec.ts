import { Test } from '@nestjs/testing';
import { OrderCreatedPublisher } from '../../../../libs/messaging/src/index.js';
import { InventoryHttpClient } from '../inventory-client/inventory-http.client.js';
import { OrderRepository } from './order.repository.js';
import { OrdersService } from './orders.service.js';

describe('OrdersService', () => {
  it('marks orders RESERVED when inventory succeeds', async () => {
    const orderRepository = {
      createOrder: vi.fn().mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        status: 'PENDING',
        productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        quantity: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      updateStatus: vi.fn(),
      findById: vi.fn(),
    };

    const inventoryClient = {
      reserveStock: vi.fn().mockResolvedValue({
        kind: 'reserved',
        reservationId: '22222222-2222-4222-8222-222222222222',
      }),
    };
    const orderCreatedPublisher = { publish: vi.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrderRepository, useValue: orderRepository },
        { provide: InventoryHttpClient, useValue: inventoryClient },
        { provide: OrderCreatedPublisher, useValue: orderCreatedPublisher },
      ],
    }).compile();

    const service = moduleRef.get(OrdersService);
    const result = await service.createOrder({
      productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      quantity: 1,
    });

    expect(result.status).toBe('RESERVED');
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      'RESERVED',
    );
    expect(orderCreatedPublisher.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'order.created',
        orderId: '11111111-1111-4111-8111-111111111111',
        status: 'PENDING',
      }),
    );
  });

  const pendingOrder = {
    id: '11111111-1111-4111-8111-111111111111',
    status: 'PENDING' as const,
    productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const reservedOrder = { ...pendingOrder, status: 'RESERVED' as const };

  it('reconcile promotes PENDING to RESERVED when inventory already_reserved', async () => {
    const orderRepository = {
      createOrder: vi.fn(),
      updateStatus: vi.fn(),
      findById: vi.fn().mockResolvedValue(pendingOrder),
    };
    const inventoryClient = {
      reserveStock: vi.fn().mockResolvedValue({
        kind: 'already_reserved',
        reservationId: '22222222-2222-4222-8222-222222222222',
      }),
    };

    const service = (
      await Test.createTestingModule({
        providers: [
          OrdersService,
          { provide: OrderRepository, useValue: orderRepository },
          { provide: InventoryHttpClient, useValue: inventoryClient },
          {
            provide: OrderCreatedPublisher,
            useValue: { publish: vi.fn() },
          },
        ],
      }).compile()
    ).get(OrdersService);

    const result = await service.reconcileOrder(pendingOrder.id);

    expect(result.status).toBe('RESERVED');
    expect(inventoryClient.reserveStock).toHaveBeenCalledWith({
      orderId: pendingOrder.id,
      productId: pendingOrder.productId,
      quantity: pendingOrder.quantity,
    });
    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      pendingOrder.id,
      'RESERVED',
    );
  });

  it('reconcile is a no-op when order is already RESERVED', async () => {
    const orderRepository = {
      createOrder: vi.fn(),
      updateStatus: vi.fn(),
      findById: vi.fn().mockResolvedValue(reservedOrder),
    };
    const inventoryClient = { reserveStock: vi.fn() };

    const service = (
      await Test.createTestingModule({
        providers: [
          OrdersService,
          { provide: OrderRepository, useValue: orderRepository },
          { provide: InventoryHttpClient, useValue: inventoryClient },
          {
            provide: OrderCreatedPublisher,
            useValue: { publish: vi.fn() },
          },
        ],
      }).compile()
    ).get(OrdersService);

    const result = await service.reconcileOrder(reservedOrder.id);

    expect(result.status).toBe('RESERVED');
    expect(inventoryClient.reserveStock).not.toHaveBeenCalled();
    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
  });
});
