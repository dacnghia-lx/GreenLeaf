import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const plants = [
  ['Cây Kim Tiền', 'PLANT', 'cây', 180000, 'Cây phong thuỷ dễ chăm, chịu bóng tốt.'],
  ['Cây Lưỡi Hổ', 'PLANT', 'cây', 150000, 'Lọc không khí, ít cần tưới.'],
  ['Cây Trầu Bà Nam Mỹ', 'PLANT', 'cây', 220000, 'Lá to xanh bóng, hợp để bàn làm việc.'],
  ['Cây Monstera', 'PLANT', 'cây', 350000, 'Lá xẻ độc đáo, trang trí phòng khách.'],
  ['Cây Lan Ý', 'PLANT', 'cây', 120000, 'Hoa trắng thanh lịch, ưa ẩm.'],
  ['Cây Sen Đá Mix', 'PLANT', 'chậu', 45000, 'Sen đá mini nhiều màu.'],
  ['Cây Xương Rồng Tai Thỏ', 'PLANT', 'chậu', 55000, 'Chịu hạn cực tốt.'],
  ['Bonsai Sanh Dáng Trực', 'BONSAI', 'cây', 2500000, 'Bonsai sanh 10 năm tuổi.'],
  ['Bonsai Linh Sam', 'BONSAI', 'cây', 1800000, 'Hoa tím, dáng bay.'],
  ['Bonsai Tùng La Hán', 'BONSAI', 'cây', 4200000, 'Dáng thế đẹp, phù hợp sân vườn.'],
  ['Chậu Gốm Bát Tràng 20cm', 'POT', 'cái', 90000, 'Men rạn cổ.'],
  ['Chậu Nhựa Treo', 'POT', 'cái', 25000, 'Chậu treo ban công.'],
  ['Chậu Xi Măng Đá Mài', 'POT', 'cái', 160000, 'Bền, hợp cây lớn.'],
  ['Phân Trùn Quế 2kg', 'FERTILIZER', 'bao', 50000, 'Phân hữu cơ an toàn, cải tạo đất.'],
  ['Phân NPK 20-20-15', 'FERTILIZER', 'gói', 35000, 'Kích thích sinh trưởng, ra lá.'],
  ['Phân Tan Chậm Osmocote', 'FERTILIZER', 'hộp', 120000, 'Nhả chậm 3-4 tháng.'],
  ['Thuốc Trừ Nấm Anvil 5SC', 'MEDICINE', 'chai', 45000, 'Trị đốm lá, phấn trắng, rỉ sắt.'],
  ['Thuốc Trừ Nấm Ridomil Gold', 'MEDICINE', 'gói', 38000, 'Trị thối rễ, thối thân do nấm.'],
  ['Dầu Neem Hữu Cơ', 'MEDICINE', 'chai', 95000, 'Trị rệp, nhện đỏ, côn trùng chích hút.'],
  ['Thuốc Trừ Sâu Radiant', 'MEDICINE', 'chai', 60000, 'Trị sâu ăn lá, bọ trĩ.'],
  ['Kéo Cắt Cành Nhật', 'TOOL', 'cái', 250000, 'Thép SK5 sắc bén.'],
  ['Bình Xịt Phun Sương 1L', 'TOOL', 'cái', 40000, 'Tưới phun sương cho cây.'],
];

async function main() {
  await prisma.product.deleteMany();
  await prisma.product.createMany({
    data: plants.map(([ProductName, ProductType, Unit, Price, Description], i) => ({
      ProductName, ProductType, Unit, Price, Description,
      Quantity: 10 + ((i * 7) % 50),
      PathImage: `https://picsum.photos/seed/plant${i + 1}/400/400`,
    })),
  });
  await prisma.user.upsert({
    where: { Email: 'admin@greenleaf.vn' },
    update: {},
    create: { FullName: 'Quản trị viên', Email: 'admin@greenleaf.vn', Password: await bcrypt.hash('admin123', 10), Role: 'ADMIN' },
  });
  console.log(`Seeded ${plants.length} products + admin account (admin@greenleaf.vn / admin123)`);
}

main().finally(() => prisma.$disconnect());
