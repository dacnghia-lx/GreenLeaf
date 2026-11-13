// Tài liệu Swagger rút gọn — mở http://localhost:4000/api/docs
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
const idsBody = { content: { 'application/json': { schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'integer' } } } } } } };
type Schema = Record<string, unknown>;
const str = { type: 'string' }, int = { type: 'integer' }, num = { type: 'number' };
const pageParams = ['page', 'pageSize'].map((n) => ({ name: n, in: 'query', schema: int }));
const product = {
  type: 'object',
  properties: {
    ProductName: str, PathImage: str,
    ProductType: { type: 'string', enum: ['PLANT', 'BONSAI', 'POT', 'FERTILIZER', 'MEDICINE', 'TOOL'] },
    Quantity: int, Unit: str, Price: num, Description: str,
  },
};
const orderInput = {
  type: 'object',
  required: ['CustomerName', 'Phone', 'Address', 'PaymentMethod', 'items'],
  properties: {
    CustomerName: str, Phone: { type: 'string', example: '0912345678' }, Address: str, Note: str,
    PaymentMethod: { type: 'string', enum: ['COD', 'BANK', 'EWALLET'] },
    items: { type: 'array', items: { type: 'object', properties: { ProductID: int, Quantity: int } } },
  },
};
const orderStatus = { type: 'string', enum: ['PENDING', 'PAID', 'SHIPPING', 'DONE', 'CANCELLED'] };
const json = (schema: Schema | object) => ({ content: { 'application/json': { schema } } });
const file = (field: string) => ({ content: { 'multipart/form-data': { schema: { type: 'object', properties: { [field]: { type: 'string', format: 'binary' } } } } } });

export const openapi: Schema = {
  openapi: '3.0.3',
  info: { title: 'GreenLeaf API', version: '1.0.0', description: 'Web bán cây cảnh tích hợp AI chẩn đoán bệnh' },
  components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
  security: [{ bearer: [] }],
  paths: {
    '/api/auth/register': { post: { tags: ['Auth'], requestBody: json({ type: 'object', properties: { FullName: {}, Email: {}, Password: {}, Phone: {} } }), responses: { 201: { description: 'OK' } } } },
    '/api/auth/me': { get: { tags: ['Auth'], responses: { 200: { description: 'Thông tin tài khoản' }, 401: { description: 'Chưa đăng nhập' } } } },
    '/api/auth/login': { post: { tags: ['Auth'], requestBody: json({ type: 'object', properties: { Email: {}, Password: {} } }), responses: { 200: { description: 'Token' } } } },
    '/api/products': {
      get: { tags: ['Product'], parameters: ['page', 'pageSize', 'q', 'type', 'sortBy', 'sortDir'].map((n) => ({ name: n, in: 'query', schema: { type: 'string' } })), responses: { 200: { description: 'Danh sách phân trang' } } },
      post: { tags: ['Product'], requestBody: json(product), responses: { 201: { description: 'Đã tạo' } } },
    },
    '/api/products/{id}': {
      get: { tags: ['Product'], parameters: [idParam], responses: { 200: { description: 'Chi tiết' } } },
      put: { tags: ['Product'], parameters: [idParam], requestBody: json(product), responses: { 200: { description: 'Đã cập nhật' } } },
      delete: { tags: ['Product'], parameters: [idParam], responses: { 204: { description: 'Đã xoá' } } },
    },
    '/api/products/{id}/copy': { post: { tags: ['Product'], parameters: [idParam], responses: { 201: { description: 'Bản sao' } } } },
    '/api/products/copy': { post: { tags: ['Product'], requestBody: idsBody, responses: { 201: { description: 'Các bản sao' } } } },
    '/api/products/bulk-delete': { post: { tags: ['Product'], requestBody: idsBody, responses: { 200: { description: 'Số bản ghi đã xoá' } } } },
    '/api/products/export': { get: { tags: ['Product'], parameters: [{ name: 'format', in: 'query', schema: { type: 'string', enum: ['xlsx', 'json', 'xml'] } }, { name: 'ids', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'File' } } } },
    '/api/products/import': { post: { tags: ['Product'], requestBody: file('file'), responses: { 200: { description: 'Kết quả import' } } } },
    '/api/products/upload-image': { post: { tags: ['Product'], requestBody: file('image'), responses: { 201: { description: 'Đường dẫn ảnh' } } } },
    '/api/orders': {
      post: { tags: ['Order'], summary: 'Tạo đơn (cần đăng nhập). Server kiểm tra tồn kho, tính tổng theo giá DB, trừ tồn kho', requestBody: json(orderInput), responses: { 201: { description: 'Đơn hàng vừa tạo' }, 409: { description: 'Không đủ tồn kho' } } },
      get: { tags: ['Order'], summary: 'Danh sách đơn (admin)', parameters: [...pageParams, { name: 'status', in: 'query', schema: orderStatus }, { name: 'q', in: 'query', schema: str }], responses: { 200: { description: 'Danh sách phân trang' } } },
    },
    '/api/orders/my': { get: { tags: ['Order'], summary: 'Đơn hàng của tôi', parameters: [...pageParams, { name: 'status', in: 'query', schema: orderStatus }], responses: { 200: { description: 'Danh sách phân trang' } } } },
    '/api/orders/{id}': { get: { tags: ['Order'], summary: 'Hoá đơn (chủ đơn hoặc admin)', parameters: [idParam], responses: { 200: { description: 'Chi tiết đơn' }, 403: { description: 'Không có quyền' } } } },
    '/api/orders/{id}/pay': { post: { tags: ['Order'], summary: 'Xác nhận thanh toán mô phỏng (BANK/EWALLET): PENDING → PAID', parameters: [idParam], responses: { 200: { description: 'Đơn đã thanh toán' } } } },
    '/api/orders/{id}/cancel': { post: { tags: ['Order'], summary: 'Khách huỷ đơn đang PENDING (hoàn tồn kho)', parameters: [idParam], responses: { 200: { description: 'Đơn đã huỷ' } } } },
    '/api/orders/{id}/status': { patch: { tags: ['Order'], summary: 'Đổi trạng thái (admin). CANCELLED sẽ hoàn tồn kho', parameters: [idParam], requestBody: json({ type: 'object', properties: { Status: orderStatus } }), responses: { 200: { description: 'Đơn sau khi cập nhật' } } } },
    '/api/contacts': {
      post: { tags: ['Contact'], summary: 'Gửi liên hệ', security: [], requestBody: json({ type: 'object', required: ['FullName', 'Email', 'Message'], properties: { FullName: str, Email: { type: 'string', format: 'email' }, Message: str } }), responses: { 201: { description: 'Đã lưu' }, 400: { description: 'Dữ liệu không hợp lệ' } } },
      get: { tags: ['Contact'], summary: 'Danh sách liên hệ (admin)', parameters: [...pageParams, { name: 'q', in: 'query', schema: str }], responses: { 200: { description: 'Danh sách phân trang' } } },
    },
    '/api/contacts/{id}': { delete: { tags: ['Contact'], parameters: [idParam], responses: { 204: { description: 'Đã xoá' } } } },
    '/api/ai/status': { get: { tags: ['AI'], responses: { 200: { description: '{ enabled } – đã cấu hình OPENAI_API_KEY hay chưa' } } } },
    '/api/ai/diagnose': { post: { tags: ['AI'], summary: 'Chẩn đoán bệnh từ ảnh lá (OpenAI vision + structured output). Không có key thì trả mock: true', requestBody: file('image'), responses: { 200: { description: 'Kết quả chẩn đoán + sản phẩm gợi ý' }, 422: { description: 'AI từ chối / không parse được' } } } },
    '/api/ai/chat': { post: { tags: ['AI'], summary: 'Chatbot tư vấn chăm sóc cây', requestBody: json({ type: 'object', properties: { messages: { type: 'array', items: { type: 'object', properties: { role: { type: 'string', enum: ['user', 'assistant'] }, content: str } } } } }), responses: { 200: { description: '{ reply, products, mock? }' } } } },
  },
};
