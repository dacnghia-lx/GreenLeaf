import type { Prisma, Product, ProductType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';
import type { ListQuery, ProductInput } from './product.schema.js';

// Prisma trả Decimal dạng object -> đổi về number cho frontend
export type ProductDTO = Omit<Product, 'Price'> & { Price: number };
export const serialize = (p: Product): ProductDTO => ({ ...p, Price: Number(p.Price) });

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductFilter {
  q?: string;
  type?: ProductType;
  ids?: number[];
}

export function buildWhere({ q, type, ids }: ProductFilter): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};
  if (ids?.length) where.ProductID = { in: ids };
  if (type) where.ProductType = type;
  if (q) {
    const or: Prisma.ProductWhereInput[] = [
      { ProductName: { contains: q, mode: 'insensitive' } },
      { Description: { contains: q, mode: 'insensitive' } },
      { Unit: { contains: q, mode: 'insensitive' } },
    ];
    if (/^\d+$/.test(q) && Number(q) <= 2147483647) or.push({ ProductID: Number(q) });
    where.OR = or;
  }
  return where;
}

export async function list({ page, pageSize, q, type, sortBy, sortDir }: ListQuery): Promise<Paginated<ProductDTO>> {
  const where = buildWhere({ q, type });
  const [total, items] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { items: items.map(serialize), total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const findAll = async (filter: ProductFilter): Promise<ProductDTO[]> =>
  (await prisma.product.findMany({ where: buildWhere(filter), orderBy: { ProductID: 'asc' } })).map(serialize);

export const getById = async (id: number): Promise<ProductDTO> =>
  serialize(await prisma.product.findUniqueOrThrow({ where: { ProductID: id } }));

export const create = async (data: ProductInput): Promise<ProductDTO> => serialize(await prisma.product.create({ data }));

export const update = async (id: number, data: ProductInput): Promise<ProductDTO> =>
  serialize(await prisma.product.update({ where: { ProductID: id }, data }));

// Sản phẩm đã nằm trong hoá đơn thì không xoá được (giữ lịch sử đơn hàng)
async function assertNotOrdered(ids: number[]) {
  const used = await prisma.orderItem.findMany({
    where: { ProductID: { in: ids } }, distinct: ['ProductID'], select: { ProductID: true }, take: 5,
  });
  if (used.length) {
    throw new HttpError(409, `Sản phẩm ${used.map((u) => `#${u.ProductID}`).join(', ')} đã có trong đơn hàng nên không thể xoá. Hãy đặt số lượng = 0 để ngừng bán.`);
  }
}

export async function remove(id: number) {
  await assertNotOrdered([id]);
  return prisma.product.delete({ where: { ProductID: id } });
}

export async function removeMany(ids: number[]): Promise<number> {
  await assertNotOrdered(ids);
  return (await prisma.product.deleteMany({ where: { ProductID: { in: ids } } })).count;
}

const cloneData = ({ ProductID: _id, CreateDate: _c, UpdateDate: _u, ...rest }: Product): Prisma.ProductCreateInput => ({
  ...rest,
  ProductName: `${rest.ProductName} (Bản sao)`,
});

export async function copyMany(ids: number[]): Promise<ProductDTO[]> {
  const sources = await prisma.product.findMany({ where: { ProductID: { in: ids } }, orderBy: { ProductID: 'asc' } });
  if (!sources.length) return [];
  const created = await prisma.$transaction(sources.map((p) => prisma.product.create({ data: cloneData(p) })));
  return created.map(serialize);
}
