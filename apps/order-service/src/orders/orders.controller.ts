import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  createOrderSchema,
  type CreateOrderDto,
} from './dto/create-order.dto.js';
import { orderIdParamSchema } from './dto/order-id.param.js';
import { OrdersService } from './orders.service.js';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  createOrder(@Body({ schema: createOrderSchema }) body: CreateOrderDto) {
    return this.ordersService.createOrder(body);
  }

  @Get(':id')
  getOrder(@Param('id', { schema: orderIdParamSchema }) id: string) {
    return this.ordersService.getOrder(id);
  }
}
