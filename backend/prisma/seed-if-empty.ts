// Chạy seed lần đầu khi DB còn trống (dùng trong Docker)
import { PrismaClient } from '@prisma/client';
import { seed } from './seed.js';

const prisma = new PrismaClient();
try {
  if ((await prisma.product.count()) === 0) await seed(prisma);
  else console.log('DB đã có dữ liệu, bỏ qua seed');
} finally {
  await prisma.$disconnect();
}
