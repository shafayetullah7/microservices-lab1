import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { httpErrorSchema } from '../../../../libs/http/src/index.js';
import {
  createOrderSchema,
  type CreateOrderDto,
} from './dto/create-order.dto.js';
import {
  listOrdersQuerySchema,
  type ListOrdersQuery,
} from './dto/list-orders.query.js';
import { orderIdParamSchema } from './dto/order-id.param.js';
import {
  orderListResponseSchema,
  orderResponseSchema,
} from './dto/order-response.schema.js';
import { OrdersService } from './orders.service.js';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({
    summary: 'Create an order and reserve inventory',
    description:
      'Creates a PENDING order, calls Inventory Service, then returns PENDING, RESERVED, or REJECTED.',
  })
  @ApiCreatedResponse({
    description: 'Order persisted with resulting status',
    standardSchema: orderResponseSchema,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
    standardSchema: httpErrorSchema,
  })
  @ApiServiceUnavailableResponse({
    description: 'Downstream or database failure',
    standardSchema: httpErrorSchema,
  })
  createOrder(@Body({ schema: createOrderSchema }) body: CreateOrderDto) {
    return this.ordersService.createOrder(body);
  }

  @Get()
  @ApiOperation({
    summary: 'List orders (paginated)',
    description:
      'Paginated list sorted by `sortBy` (default `createdAt`) in `sortOrder` (default `desc`, newest first). Also: `page` (default 1), `pageSize` (default 20, max 100).',
  })
  @ApiOkResponse({
    description: 'Paginated orders',
    standardSchema: orderListResponseSchema,
  })
  @ApiBadRequestResponse({
    description: 'Invalid pagination query',
    standardSchema: httpErrorSchema,
  })
  listOrders(@Query({ schema: listOrdersQuerySchema }) query: ListOrdersQuery) {
    return this.ordersService.listOrders(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order by id' })
  @ApiOkResponse({
    description: 'Order found',
    standardSchema: orderResponseSchema,
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
    standardSchema: httpErrorSchema,
  })
  getOrder(@Param('id', { schema: orderIdParamSchema }) id: string) {
    return this.ordersService.getOrder(id);
  }

  @Post(':id/reconcile')
  @ApiOperation({
    summary: 'Reconcile a PENDING order with inventory',
    description:
      'Safe to retry after HTTP timeouts; inventory uses order id for idempotent reservations.',
  })
  @ApiCreatedResponse({
    description: 'Updated order state after reconciliation',
    standardSchema: orderResponseSchema,
  })
  @ApiNotFoundResponse({
    description: 'Order not found',
    standardSchema: httpErrorSchema,
  })
  @ApiServiceUnavailableResponse({
    description: 'Inventory unavailable',
    standardSchema: httpErrorSchema,
  })
  reconcileOrder(@Param('id', { schema: orderIdParamSchema }) id: string) {
    return this.ordersService.reconcileOrder(id);
  }
}