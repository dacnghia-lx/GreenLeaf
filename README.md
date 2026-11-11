# 🌿 GreenLeaf – Web bán cây cảnh tích hợp AI chẩn đoán bệnh cây

Đồ án môn **Ngôn ngữ kịch bản**. Stack: **Node.js + Express + Prisma + PostgreSQL** (backend), **React + Vite + TailwindCSS** (frontend), **Docker Compose**, **Claude API** (AI vision).

## Chạy nhanh bằng Docker

```bash
cp backend/.env.example backend/.env     # điền ANTHROPIC_API_KEY nếu muốn dùng AI thật
docker compose up --build
```

- Web: http://localhost:5173
- API: http://localhost:4000/api  ·  Swagger: http://localhost:4000/api/docs
- Tài khoản quản trị mẫu: **admin@greenleaf.vn / admin123**

Lần chạy đầu backend tự tạo bảng (`prisma db push`) và nạp 22 sản phẩm mẫu.

## Chạy khi phát triển (không Docker cho code)

```bash
docker compose up -d db                  # chỉ chạy PostgreSQL
cd backend && npm install && cp .env.example .env
npx prisma db push && npm run db:seed
npm run dev                              # http://localhost:4000

cd ../frontend && npm install
npm run dev                              # http://localhost:5173 (proxy /api sang backend)
```

## Chức năng đã có

| Form / trang | Đường dẫn |
|---|---|
| Danh sách sản phẩm (shop, tìm kiếm, lọc loại, phân trang) | `/` |
| Chi tiết sản phẩm | `/san-pham/:id` |
| Đăng nhập (JWT) | `/login` |
| Đăng ký (validate Zod) | `/register` |
| AI chẩn đoán bệnh cây (upload ảnh lá → bệnh, cách xử lý, gợi ý thuốc/phân bón) | `/chan-doan` |
| Quản lý sản phẩm (admin) | `/admin/products` |

### Module Product (trang quản trị)
- Bảng có phân trang 10/15/20/50 dòng, sắp xếp theo cột
- Thêm, sửa, xem chi tiết, xoá 1 dòng, **xoá nhiều** bằng checkbox
- Tìm kiếm theo mã SP, tên, mô tả, đơn vị + lọc theo loại
- **Sao chép 1** dòng và **sao chép nhiều** dòng
- **Import / Export**: Excel (.xlsx), JSON, XML (export theo bộ lọc hoặc theo các dòng đã chọn; import dòng có ProductID đã tồn tại sẽ cập nhật, còn lại thêm mới, báo lỗi theo từng dòng)
- **Ẩn/hiện cột** (lưu vào localStorage)
- Upload ảnh sản phẩm (Multer)
- **Phím tắt** (Alt+H để xem trong app):

| Phím | Chức năng |
|---|---|
| Alt+N | Thêm mới |
| Alt+S | Lưu form |
| Alt+E | Sửa dòng đang chọn |
| Alt+V | Xem chi tiết dòng đang chọn |
| Alt+C | Sao chép các dòng đã chọn |
| Delete / Alt+Delete | Xoá các dòng đã chọn |
| Alt+A | Chọn tất cả trong trang |
| / hoặc Alt+K | Ô tìm kiếm |
| Alt+I / Alt+X | Import / Export Excel |
| Alt+PageDown / PageUp | Trang sau / trước |
| Alt+H | Bảng phím tắt |
| Esc | Đóng hộp thoại / bỏ chọn |

> Không dùng Alt+D, Alt+F, Alt+← vì trình duyệt đã chiếm các phím này (thanh địa chỉ, menu, quay lại).

### Bảng Product
`ProductID, ProductName, PathImage, ProductType, Quantity, Unit, Price, Description, CreateDate, UpdateDate` – xem `backend/prisma/schema.prisma`. Schema cũng đã có sẵn `User`, `Order`, `OrderItem` (hoá đơn), `Contact`, `Diagnosis` cho các form tiếp theo.

### AI
- `POST /api/ai/diagnose` – gửi ảnh cho Claude (vision, trả JSON có cấu trúc), AI chọn sản phẩm phù hợp từ danh mục thuốc/phân bón của shop, lưu lịch sử vào bảng `Diagnosis`.
- `POST /api/ai/chat` – chatbot tư vấn chăm sóc cây (API đã có, chưa làm giao diện).
- Không có `ANTHROPIC_API_KEY` thì API trả kết quả mẫu để vẫn demo được giao diện.

## Cấu trúc thư mục

```
backend/
  prisma/schema.prisma, seed.js
  src/app.js, index.js, openapi.js
  src/middleware/ (auth JWT, xử lý lỗi)
  src/modules/product/ (schema Zod, service, controller, routes, import/export)
  src/modules/auth/, src/modules/ai/
frontend/
  src/pages/ (Home, ProductDetail, Login, Register, Diagnose, admin/ProductsAdmin)
  src/components/ (Modal, Pagination, ProductFormModal)
docker-compose.yml
```

## Việc tiếp theo
Giỏ hàng → Thanh toán → Hoá đơn, form Liên hệ, giao diện chatbot, quản lý đơn hàng.
