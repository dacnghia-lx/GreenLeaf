// Chạy seed lần đầu khi DB còn trống (dùng trong Docker)
import { PrismaClient } from '@prisma/client';
import { execSync } from 'node:child_process';
const prisma = new PrismaClient();
const count = await prisma.product.count();
await prisma.$disconnect();
if (count === 0) execSync('node prisma/seed.js', { stdio: 'inherit' });
