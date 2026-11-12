import { Test } from '@nestjs/testing';
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

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: OrderRepository, useValue: orderRepository },
        { provide: InventoryHttpClient, useValue: inventoryClient },
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
  });
});
