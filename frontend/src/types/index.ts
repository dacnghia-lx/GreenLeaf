// Kiểu dữ liệu dùng chung, khớp với JSON backend trả về

export type ProductType = 'PLANT' | 'BONSAI' | 'POT' | 'FERTILIZER' | 'MEDICINE' | 'TOOL';
export type Role = 'USER' | 'ADMIN';
export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPING' | 'DONE' | 'CANCELLED';
export type PaymentMethod = 'COD' | 'BANK' | 'EWALLET';

export interface Product {
  ProductID: number;
  ProductName: string;
  PathImage: string | null;
  ProductType: ProductType;
  Quantity: number;
  Unit: string;
  Price: number;
  Description: string | null;
  CreateDate: string;
  UpdateDate: string;
}

/** Dữ liệu form thêm/sửa sản phẩm (không có các trường do server sinh) */
export type ProductInput = Omit<Product, 'ProductID' | 'CreateDate' | 'UpdateDate'>;

export interface User {
  UserID: number;
  FullName: string;
  Email: string;
  Phone: string | null;
  Address: string | null;
  Role: Role;
  CreateDate: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface OrderItem {
  OrderItemID: number;
  OrderID: number;
  ProductID: number;
  Quantity: number;
  Price: number;
  LineTotal: number;
  product: Pick<Product, 'ProductID' | 'ProductName' | 'PathImage' | 'Unit'>;
}

export interface Order {
  OrderID: number;
  UserID: number | null;
  CustomerName: string;
  Phone: string;
  Address: string;
  Note: string | null;
  Total: number;
  PaymentMethod: PaymentMethod;
  Status: OrderStatus;
  PaidDate: string | null;
  CreateDate: string;
  UpdateDate: string;
  items: OrderItem[];
  user: Pick<User, 'UserID' | 'FullName' | 'Email'> | null;
}

/** Dòng trong danh sách đơn (không kèm chi tiết sản phẩm) */
export type OrderSummary = Omit<Order, 'items' | 'user'> & { ItemCount: number; UserEmail: string | null };

export interface CreateOrderInput {
  CustomerName: string;
  Phone: string;
  Address: string;
  Note?: string;
  PaymentMethod: PaymentMethod;
  items: { ProductID: number; Quantity: number }[];
}

export interface Contact {
  ContactID: number;
  FullName: string;
  Email: string;
  Message: string;
  CreateDate: string;
}
export type ContactInput = Pick<Contact, 'FullName' | 'Email' | 'Message'>;

export type Severity = 'none' | 'mild' | 'moderate' | 'severe';

export interface DiagnosisResult {
  id: number;
  image: string;
  isPlant: boolean;
  plantName: string;
  healthy: boolean;
  diseaseName: string;
  confidence: number;
  severity: Severity;
  symptoms: string[];
  causes: string[];
  treatment: string[];
  prevention: string[];
  recommendedProductIds: number[];
  products: Product[];
  mock?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
export interface ChatResponse {
  reply: string;
  products: Product[];
  mock?: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ImportResult {
  total: number;
  created: number;
  updated: number;
  errors: { row: number; message: string }[];
}

/** Lỗi validate từ Zod (fieldErrors) */
export type FieldErrors = Partial<Record<string, string[]>>;

export interface ApiErrorBody {
  message: string;
  errors?: FieldErrors;
}
