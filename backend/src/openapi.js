// Tài liệu Swagger rút gọn — mở http://localhost:4000/api/docs
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
const idsBody = { content: { 'application/json': { schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'integer' } } } } } } };
const product = {
  type: 'object',
  properties: {
    ProductName: { type: 'string' }, PathImage: { type: 'string' },
    ProductType: { type: 'string', enum: ['PLANT', 'BONSAI', 'POT', 'FERTILIZER', 'MEDICINE', 'TOOL'] },
    Quantity: { type: 'integer' }, Unit: { type: 'string' }, Price: { type: 'number' }, Description: { type: 'string' },
  },
};
const json = (schema) => ({ content: { 'application/json': { schema } } });
const file = (field) => ({ content: { 'multipart/form-data': { schema: { type: 'object', properties: { [field]: { type: 'string', format: 'binary' } } } } } });

export const openapi = {
  openapi: '3.0.3',
  info: { title: 'GreenLeaf API', version: '1.0.0', description: 'Web bán cây cảnh tích hợp AI chẩn đoán bệnh' },
  components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
  security: [{ bearer: [] }],
  paths: {
    '/api/auth/register': { post: { tags: ['Auth'], requestBody: json({ type: 'object', properties: { FullName: {}, Email: {}, Password: {}, Phone: {} } }), responses: { 201: { description: 'OK' } } } },
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
    '/api/ai/diagnose': { post: { tags: ['AI'], requestBody: file('image'), responses: { 200: { description: 'Kết quả chẩn đoán + sản phẩm gợi ý' } } } },
    '/api/ai/chat': { post: { tags: ['AI'], requestBody: json({ type: 'object', properties: { messages: { type: 'array', items: { type: 'object', properties: { role: {}, content: {} } } } } }), responses: { 200: { description: 'Câu trả lời' } } } },
  },
};
