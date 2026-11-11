import { prisma } from '../../lib/prisma.js';

// Prisma trả Decimal dạng object -> đổi về number cho frontend
export const serialize = (p) => p && { ...p, Price: Number(p.Price) };

export function buildWhere({ q, type, ids }) {
  const where = {};
  if (ids?.length) where.ProductID = { in: ids };
  if (type) where.ProductType = type;
  if (q) {
    const or = [
      { ProductName: { contains: q, mode: 'insensitive' } },
      { Description: { contains: q, mode: 'insensitive' } },
      { Unit: { contains: q, mode: 'insensitive' } },
    ];
    if (/^\d+$/.test(q)) or.push({ ProductID: Number(q) });
    where.OR = or;
  }
  return where;
}

export async function list({ page, pageSize, q, type, sortBy, sortDir }) {
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

export const findAll = async (filter) =>
  (await prisma.product.findMany({ where: buildWhere(filter), orderBy: { ProductID: 'asc' } })).map(serialize);

export const getById = async (id) => serialize(await prisma.product.findUniqueOrThrow({ where: { ProductID: id } }));

export const create = async (data) => serialize(await prisma.product.create({ data }));

export const update = async (id, data) => serialize(await prisma.product.update({ where: { ProductID: id }, data }));

export const remove = (id) => prisma.product.delete({ where: { ProductID: id } });

export const removeMany = async (ids) => (await prisma.product.deleteMany({ where: { ProductID: { in: ids } } })).count;

const cloneData = ({ ProductID, CreateDate, UpdateDate, ...rest }) => ({ ...rest, ProductName: `${rest.ProductName} (Bản sao)` });

export async function copyMany(ids) {
  const sources = await prisma.product.findMany({ where: { ProductID: { in: ids } }, orderBy: { ProductID: 'asc' } });
  if (!sources.length) return [];
  const created = await prisma.$transaction(sources.map((p) => prisma.product.create({ data: cloneData(p) })));
  return created.map(serialize);
}
