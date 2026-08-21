import type { Response } from 'express';
import { NotFoundError } from '../errors.js';
import type { CreateOrderInput } from '../schemas/order.js';
import type { OrderService } from '../services/orderService.js';
import type { CreateOrderParams } from '../services/orderService.js';
import { resolveOwnerScope, type Owner } from '../services/ownership.js';

export function createOrderController(orders: OrderService) {
  async function createOrder(body: CreateOrderInput, owner: Owner, res: Response) {
    const order = await orders.createOrder({
      ...body,
      clientId: owner.clientId,
      userId: 'userId' in owner ? owner.userId : null,
    } as CreateOrderParams);
    res.status(201).json({ data: order });
  }

  async function listOrders(owner: Owner, res: Response) {
    res.json({ data: await orders.listOrders(resolveOwnerScope(owner)) });
  }

  async function getOrder(orderNumber: string, owner: Owner, res: Response) {
    const order = await orders.getOrder(orderNumber, resolveOwnerScope(owner));
    if (!order) throw new NotFoundError(`Order ${orderNumber} not found`);
    res.json({ data: order });
  }

  return { createOrder, listOrders, getOrder };
}
