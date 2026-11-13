# 🌿 GreenLeaf – Web bán cây cảnh tích hợp AI chẩn đoán bệnh cây

Đồ án môn **Ngôn ngữ kịch bản**. Stack: **TypeScript** toàn bộ dự án – **Node.js + Express + Prisma + PostgreSQL** (backend), **React + Vite + TailwindCSS** (frontend), **Docker Compose**, **OpenAI API** (vision + structured output).

## Chạy nhanh bằng Docker

```bash
cp backend/.env.example backend/.env     # điền OPENAI_API_KEY nếu muốn dùng AI thật
docker compose up --build
```

- Web: http://localhost:5173
- API: http://localhost:4000/api  ·  Swagger: http://localhost:4000/api/docs
- Tài khoản quản trị mẫu: **admin@greenleaf.vn / admin123**

Image backend biên dịch TypeScript (`tsc`) rồi chạy bản `dist`. Lần chạy đầu backend tự tạo bảng (`prisma db push`) và nạp 22 sản phẩm mẫu khi DB còn trống.

## Chạy khi phát triển (không Docker cho code)

```bash
docker compose up -d db                  # chỉ chạy PostgreSQL
cd backend && npm install && cp .env.example .env
npx prisma db push && npm run db:seed
npm run dev                              # tsx watch src/index.ts → http://localhost:4000

cd ../frontend && npm install
npm run dev                              # http://localhost:5173 (proxy /api sang backend)
```

| Lệnh | Backend | Frontend |
|---|---|---|
| `npm run dev` | `tsx watch src/index.ts` | `vite` |
| `npm run typecheck` | `tsc --noEmit` | `tsc --noEmit` |
| `npm run build` | `tsc` → `dist/` | `tsc --noEmit && vite build` |
| `npm start` | `node dist/src/index.js` | – |
| `npm run db:seed` | `tsx prisma/seed.ts` (**xoá** sản phẩm + đơn hàng cũ rồi nạp lại dữ liệu mẫu) | – |

> npm mới có thể chặn script cài đặt của `prisma`/`esbuild`; `package.json` đã có mục `allowScripts` cho các gói này. Nếu backend báo chưa có Prisma Client, chạy `npx prisma generate`.

### Biến môi trường (`backend/.env`)

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | ✔ | Chuỗi kết nối PostgreSQL |
| `JWT_SECRET` | ✔ | Khoá ký JWT (đổi khi triển khai thật) |
| `PORT` | | Cổng API, mặc định 4000 |
| `CORS_ORIGIN` | | Các origin được phép, cách nhau bằng dấu phẩy |
| `OPENAI_API_KEY` | để bật AI | Key OpenAI. **Để trống** thì `/api/ai/diagnose` và `/api/ai/chat` trả dữ liệu mẫu (`mock: true`) để vẫn demo được giao diện |
| `OPENAI_MODEL` | | Model hỗ trợ ảnh + structured output, mặc định `gpt-4o-mini` |

Không commit file `.env` (đã có trong `.gitignore`).

## Các form / trang

| # | Form / trang | Đường dẫn | Ghi chú |
|---|---|---|---|
| 1 | Danh sách sản phẩm (shop) | `/` | Tìm kiếm, lọc loại, phân trang, thêm vào giỏ |
| 2 | Chi tiết sản phẩm | `/san-pham/:id` | Chọn số lượng (không vượt tồn kho), thêm giỏ / mua ngay |
| 3 | Giỏ hàng | `/gio-hang` | Lưu localStorage, sửa số lượng, xoá, đồng bộ tồn kho/giá mới nhất |
| 4 | Thanh toán | `/thanh-toan` | Cần đăng nhập. Họ tên, SĐT, địa chỉ, ghi chú, phương thức COD / chuyển khoản / ví điện tử (validate Zod) |
| 5 | Cổng thanh toán mô phỏng | `/thanh-toan/:id` | Cho đơn chuyển khoản / ví: QR minh hoạ, nút “Tôi đã thanh toán” → `PAID` |
| 6 | Hoá đơn | `/hoa-don/:id` | Thông tin khách, sản phẩm, đơn giá, thành tiền, tổng, trạng thái, phương thức; nút **In**. Chỉ chủ đơn hoặc admin |
| 7 | Đơn hàng của tôi | `/don-hang` | Danh sách đơn, lọc trạng thái, thanh toán tiếp / xem hoá đơn |
| 8 | Đăng ký | `/register` | Validate Zod |
| 9 | Đăng nhập | `/login` | JWT, quay lại trang trước sau khi đăng nhập |
| 10 | Liên hệ | `/lien-he` | Họ tên, email, nội dung – validate Zod ở cả client và server, lưu bảng `Contact` |
| 11 | AI chẩn đoán bệnh cây | `/chan-doan` | Upload ảnh lá → bệnh, cách xử lý, gợi ý thuốc/phân bón |
| 12 | Chatbot tư vấn | nút 💬 góc phải dưới (mọi trang) | Gọi `/api/ai/chat`, gợi ý sản phẩm trong danh mục |
| 13 | Quản lý sản phẩm (admin) | `/admin/products` | Xem mục bên dưới |
| 14 | Quản lý đơn hàng (admin) | `/admin/orders` | Phân trang, tìm kiếm, lọc trạng thái, đổi `PENDING/PAID/SHIPPING/DONE/CANCELLED`; huỷ thì hoàn tồn kho |
| 15 | Danh sách liên hệ (admin) | `/admin/contacts` | Phân trang, tìm kiếm, xem, xoá |

### Module Product (trang quản trị)
- Bảng có phân trang 10/15/20/50 dòng, sắp xếp theo cột
- Thêm, sửa, xem chi tiết, xoá 1 dòng, **xoá nhiều** bằng checkbox (sản phẩm đã có trong đơn hàng thì không xoá được – đặt số lượng = 0 để ngừng bán)
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

### Cơ sở dữ liệu
Xem `backend/prisma/schema.prisma`.
- `Product`: `ProductID, ProductName, PathImage, ProductType, Quantity, Unit, Price, Description, CreateDate, UpdateDate`
- `User`, `Order` (hoá đơn: thêm `Note`, `PaidDate`, `UpdateDate`), `OrderItem`, `Contact`, `Diagnosis`

### Đặt hàng & thanh toán
- `POST /api/orders` chạy trong **transaction**: gộp dòng trùng, kiểm tra tồn kho, tính tổng tiền ở server theo giá trong DB (bỏ qua giá client gửi), trừ `Quantity` có điều kiện (`Quantity >= số lượng`) để không bán vượt khi nhiều người đặt cùng lúc.
- COD: đơn ở trạng thái `PENDING`, thanh toán khi nhận hàng. Chuyển khoản / ví: chuyển tới cổng thanh toán **mô phỏng**, `POST /api/orders/:id/pay` chuyển `PENDING → PAID`.
- Khách có thể tự huỷ đơn `PENDING` (`POST /api/orders/:id/cancel`); admin đổi trạng thái qua `PATCH /api/orders/:id/status`. Chuyển sang `CANCELLED` sẽ hoàn lại tồn kho; đơn đã huỷ không đổi lại được.

### AI (OpenAI)
- `POST /api/ai/diagnose` – nhận ảnh (Multer), gửi dạng data URL base64 kèm danh mục sản phẩm `MEDICINE/FERTILIZER/TOOL` còn hàng; dùng structured output (`zodResponseFormat`) để nhận JSON `isPlant, plantName, healthy, diseaseName, confidence, severity, symptoms, causes, treatment, prevention, recommendedProductIds`. ID sản phẩm được lọc lại theo DB, kết quả lưu bảng `Diagnosis`. Model từ chối / không parse được → **422** kèm thông báo tiếng Việt.
- `POST /api/ai/chat` – chatbot tư vấn chăm sóc cây, gợi ý sản phẩm bằng mã `#ID`; API trả `{ reply, products }`.
- `GET /api/ai/status` – `{ enabled }` cho biết đã cấu hình key hay chưa.

## Cấu trúc thư mục

```
backend/                       (TypeScript, ESM, module NodeNext)
  prisma/schema.prisma, seed.ts, seed-if-empty.ts
  src/app.ts, index.ts, openapi.ts
  src/types/express.d.ts       (kiểu req.user = JWT payload { id, role, name })
  src/middleware/              (auth JWT, xử lý lỗi)
  src/modules/product/         (schema Zod, service, controller, routes, import/export)
  src/modules/order/           (đặt hàng, thanh toán mô phỏng, quản lý đơn)
  src/modules/contact/, auth/, ai/
frontend/                      (TypeScript + React)
  src/types/                   (Product, User, Order, OrderItem, Contact, DiagnosisResult, Paginated...)
  src/lib/                     (api, auth, cart, orders)
  src/pages/                   (Home, ProductDetail, Cart, Checkout, Payment, Invoice, MyOrders, Contact, Login, Register, Diagnose, admin/*)
  src/components/              (Modal, Pagination, ProductFormModal, ChatWidget, StatusBadge)
docker-compose.yml
```
