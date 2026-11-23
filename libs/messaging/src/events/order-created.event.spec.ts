import { orderCreatedEventSchema } from './order-created.event.js';

describe('orderCreatedEventSchema', () => {
  it('accepts a valid order.created payload', () => {
    const parsed = orderCreatedEventSchema.parse({
      eventType: 'order.created',
      orderId: '11111111-1111-4111-8111-111111111111',
      productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      quantity: 2,
      status: 'PENDING',
      occurredAt: '2026-11-23T04:00:00.000Z',
    });
    expect(parsed.eventType).toBe('order.created');
  });
});