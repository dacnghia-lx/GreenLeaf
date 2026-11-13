import { Prisma, type OrderStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';
import { totalPages, } from '../../lib/pagination.js';
import type { JwtUser } from '../../types/express.js';
import type { Paginated } from '../product/product.service.js';
import type { CreateOrderInput, ListOrderQuery } from './order.schema.js';

const detailInclude = {
  items: {
    include: { product: { select: { ProductID: true, ProductName: true, PathImage: true, Unit: true } } },
    orderBy: { OrderItemID: 'asc' },
  },
  user: { select: { UserID: true, FullName: true, Email: true } },
} satisfies Prisma.OrderInclude;

type OrderWithDetail = Prisma.OrderGetPayload<{ include: typeof detailInclude }>;
type OrderWithCount = Prisma.OrderGetPayload<{ include: { _count: { select: { items: true } }; user: { select: { Email: true } } } }>;

// Decimal -> number cho frontend
export const serializeOrder = (o: OrderWithDetail) => ({
  ...o,
  Total: Number(o.Total),
  items: o.items.map((it) => ({
    ...it,
    Price: Number(it.Price),
    LineTotal: Number(it.Price.mul(it.Quantity)),
  })),
});
export type OrderDTO = ReturnType<typeof serializeOrder>;

const serializeSummary = ({ _count, user, ...o }: OrderWithCount) => ({
  ...o,
  Total: Number(o.Total),
  ItemCount: _count.items,
  UserEmail: user?.Email ?? null,
});
export type OrderSummaryDTO = ReturnType<typeof serializeSummary>;

/**
 * Tạo đơn hàng trong 1 transaction:
 * - gộp các dòng trùng sản phẩm
 * - kiểm tra tồn kho, tính tổng tiền theo giá trong DB (không tin giá từ client)
 * - trừ Quantity của sản phẩm (điều kiện Quantity >= số lượng để tránh bán vượt khi 2 người đặt cùng lúc)
 */
export async function createOrder(user: JwtUser, input: CreateOrderInput): Promise<OrderDTO> {
  const wanted = new Map<number, number>();
  for (const it of input.items) wanted.set(it.ProductID, (wanted.get(it.ProductID) ?? 0) + it.Quantity);
  const ids = [...wanted.keys()];

  const order = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({ where: { ProductID: { in: ids } } });
    const byId = new Map(products.map((p) => [p.ProductID, p]));

    let total = new Prisma.Decimal(0);
    const items: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    for (const [id, qty] of wanted) {
      const p = byId.get(id);
      if (!p) throw new HttpError(400, `Sản phẩm #${id} không còn tồn tại`);
      if (p.Quantity < qty) throw new HttpError(409, `"${p.ProductName}" chỉ còn ${p.Quantity} ${p.Unit}`);
      const { count } = await tx.product.updateMany({
        where: { ProductID: id, Quantity: { gte: qty } },
        data: { Quantity: { decrement: qty } },
      });
      if (count === 0) throw new HttpError(409, `"${p.ProductName}" vừa hết hàng, vui lòng cập nhật giỏ hàng`);
      total = total.plus(p.Price.mul(qty));
      items.push({ product: { connect: { ProductID: id } }, Quantity: qty, Price: p.Price });
    }

    return tx.order.create({
      data: {
        user: { connect: { UserID: user.id } },
        CustomerName: input.CustomerName,
        Phone: input.Phone,
        Address: input.Address,
        Note: input.Note || null,
        PaymentMethod: input.PaymentMethod,
        Total: total,
        items: { create: items },
      },
      include: detailInclude,
    });
  });
  return serializeOrder(order);
}

async function findOrder(id: number) {
  const order = await prisma.order.findUnique({ where: { OrderID: id }, include: detailInclude });
  if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng');
  return order;
}

const assertCanView = (order: { UserID: number | null }, user: JwtUser) => {
  if (user.role !== 'ADMIN' && order.UserID !== user.id) throw new HttpError(403, 'Bạn không có quyền xem đơn hàng này');
};

export async function getOrder(id: number, user: JwtUser): Promise<OrderDTO> {
  const order = await findOrder(id);
  assertCanView(order, user);
  return serializeOrder(order);
}

/** Xác nhận thanh toán (cổng thanh toán mô phỏng): PENDING -> PAID, chỉ cho BANK/EWALLET */
export async function payOrder(id: number, user: JwtUser): Promise<OrderDTO> {
  const order = await findOrder(id);
  if (order.UserID !== user.id) throw new HttpError(403, 'Bạn không có quyền thanh toán đơn hàng này');
  if (order.PaymentMethod === 'COD') throw new HttpError(400, 'Đơn COD được thanh toán khi nhận hàng');
  if (order.Status === 'PAID') throw new HttpError(409, 'Đơn hàng đã được thanh toán');
  const { count } = await prisma.order.updateMany({
    where: { OrderID: id, Status: 'PENDING' },
    data: { Status: 'PAID', PaidDate: new Date() },
  });
  if (count === 0) throw new HttpError(409, 'Đơn hàng không ở trạng thái chờ thanh toán');
  return serializeOrder(await findOrder(id));
}

/**
 * Đổi trạng thái đơn. Khi chuyển sang CANCELLED thì hoàn lại tồn kho.
 * Đơn đã huỷ không đổi lại được (vì tồn kho đã hoàn).
 */
export async function changeStatus(id: number, status: OrderStatus): Promise<OrderDTO> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { OrderID: id }, include: { items: true } });
    if (!order) throw new HttpError(404, 'Không tìm thấy đơn hàng');
    if (order.Status === status) return;
    if (order.Status === 'CANCELLED') throw new HttpError(409, 'Đơn hàng đã huỷ, không thể đổi trạng thái');

    // Điều kiện Status cũ để 2 thao tác đồng thời không hoàn kho 2 lần
    const { count } = await tx.order.updateMany({
      where: { OrderID: id, Status: order.Status },
      data: { Status: status, ...(status === 'PAID' && !order.PaidDate ? { PaidDate: new Date() } : {}) },
    });
    if (count === 0) throw new HttpError(409, 'Đơn hàng vừa được cập nhật bởi người khác, hãy tải lại');

    if (status === 'CANCELLED') {
      for (const it of order.items) {
        await tx.product.updateMany({ where: { ProductID: it.ProductID }, data: { Quantity: { increment: it.Quantity } } });
      }
    }
  });
  return serializeOrder(await findOrder(id));
}

/** Khách tự huỷ đơn khi còn chờ xử lý */
export async function cancelByOwner(id: number, user: JwtUser): Promise<OrderDTO> {
  const order = await findOrder(id);
  if (order.UserID !== user.id) throw new HttpError(403, 'Bạn không có quyền huỷ đơn hàng này');
  if (order.Status !== 'PENDING') throw new HttpError(409, 'Chỉ huỷ được đơn đang chờ xử lý');
  return changeStatus(id, 'CANCELLED');
}

export async function listOrders(
  { page, pageSize, status, q }: ListOrderQuery,
  userId?: number,
): Promise<Paginated<OrderSummaryDTO>> {
  const where: Prisma.OrderWhereInput = {};
  if (userId !== undefined) where.UserID = userId;
  if (status) where.Status = status;
  if (q) {
    const or: Prisma.OrderWhereInput[] = [
      { CustomerName: { contains: q, mode: 'insensitive' } },
      { Phone: { contains: q } },
      { user: { Email: { contains: q, mode: 'insensitive' } } },
    ];
    const n = q.replace(/^#/, '');
    if (/^\d+$/.test(n) && Number(n) <= 2147483647) or.push({ OrderID: Number(n) });
    where.OR = or;
  }
  const [total, items] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { OrderID: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { items: true } }, user: { select: { Email: true } } },
    }),
  ]);
  return { items: items.map(serializeSummary), total, page, pageSize, totalPages: totalPages(total, pageSize) };
}
