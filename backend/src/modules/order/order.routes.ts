import { Router } from 'express';
import { asyncHandler } from '../../middleware/error.js';
import { requireAdmin, requireAuth, currentUser } from '../../middleware/auth.js';
import { parseId } from '../product/product.controller.js';
import { createOrderInput, listOrderQuery, statusInput } from './order.schema.js';
import * as service from './order.service.js';

const r = Router();

// Khách hàng (cần đăng nhập)
r.post('/', requireAuth, asyncHandler(async (req, res) => {
  res.status(201).json(await service.createOrder(currentUser(req), createOrderInput.parse(req.body)));
}));
r.get('/my', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.listOrders(listOrderQuery.parse(req.query), currentUser(req).id));
}));
r.get('/:id', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.getOrder(parseId(req, 'Mã đơn hàng'), currentUser(req)));
}));
r.post('/:id/pay', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.payOrder(parseId(req, 'Mã đơn hàng'), currentUser(req)));
}));
r.post('/:id/cancel', requireAuth, asyncHandler(async (req, res) => {
  res.json(await service.cancelByOwner(parseId(req, 'Mã đơn hàng'), currentUser(req)));
}));

// Quản trị
r.get('/', requireAdmin, asyncHandler(async (req, res) => {
  res.json(await service.listOrders(listOrderQuery.parse(req.query)));
}));
r.patch('/:id/status', requireAdmin, asyncHandler(async (req, res) => {
  res.json(await service.changeStatus(parseId(req, 'Mã đơn hàng'), statusInput.parse(req.body).Status));
}));

export default r;
