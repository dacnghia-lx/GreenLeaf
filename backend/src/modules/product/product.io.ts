// Import / Export sản phẩm: Excel (.xlsx), JSON, XML
import ExcelJS from 'exceljs';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';
import { HttpError } from '../../middleware/error.js';
import type { ProductDTO } from './product.service.js';

export const COLUMNS = [
  { key: 'ProductID', header: 'Mã SP', width: 10 },
  { key: 'ProductName', header: 'Tên sản phẩm', width: 32 },
  { key: 'PathImage', header: 'Ảnh', width: 40 },
  { key: 'ProductType', header: 'Loại', width: 14 },
  { key: 'Quantity', header: 'Số lượng', width: 10 },
  { key: 'Unit', header: 'Đơn vị', width: 10 },
  { key: 'Price', header: 'Giá', width: 14 },
  { key: 'Description', header: 'Mô tả', width: 50 },
  { key: 'CreateDate', header: 'Ngày tạo', width: 22 },
  { key: 'UpdateDate', header: 'Ngày cập nhật', width: 22 },
] as const satisfies readonly { key: keyof ProductDTO; header: string; width: number }[];

type ProductKey = (typeof COLUMNS)[number]['key'];
const KEYS: readonly string[] = COLUMNS.map((c) => c.key);

/** Một dòng thô đọc từ file import (giá trị chưa kiểm tra kiểu) */
export type RawRow = Record<string, unknown>;
export type ImportRow = Partial<Record<ProductKey, unknown>>;

// ---------- EXPORT ----------
export async function toXlsx(products: ProductDTO[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Products');
  // Dòng tiêu đề dùng đúng tên trường để file export có thể import lại
  ws.columns = COLUMNS.map((c) => ({ header: c.key, key: c.key, width: c.width }));
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
  products.forEach((p) => ws.addRow(p));
  ws.getColumn('Price').numFmt = '#,##0';
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export const toJson = (products: ProductDTO[]): Buffer => Buffer.from(JSON.stringify(products, null, 2));

export function toXml(products: ProductDTO[]): Buffer {
  const builder = new XMLBuilder({ format: true, ignoreAttributes: false });
  const body: string = builder.build({
    Products: {
      Product: products.map((p) => ({
        ...p,
        CreateDate: new Date(p.CreateDate).toISOString(),
        UpdateDate: new Date(p.UpdateDate).toISOString(),
      })),
    },
  });
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>\n${body}`);
}

export const FORMATS = {
  xlsx: { fn: toXlsx, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  json: { fn: toJson, mime: 'application/json' },
  xml: { fn: toXml, mime: 'application/xml' },
} satisfies Record<string, { fn: (p: ProductDTO[]) => Buffer | Promise<Buffer>; mime: string }>;
export type ExportFormat = keyof typeof FORMATS;
export const isFormat = (f: string): f is ExportFormat => Object.hasOwn(FORMATS, f);

// ---------- IMPORT ----------
function cellValue(v: ExcelJS.CellValue): unknown {
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if ('richText' in v) return v.richText.map((t) => t.text).join('');
    if ('text' in v) return v.text;
    if ('result' in v) return v.result;
    if ('hyperlink' in v) return v.hyperlink;
    return String(v);
  }
  return v;
}

async function fromXlsx(buffer: Buffer): Promise<RawRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  // Cho phép tiêu đề là tên trường (ProductName) hoặc tên tiếng Việt (Tên sản phẩm)
  const headerMap: Record<number, ProductKey> = {};
  ws.getRow(1).eachCell((cell, col) => {
    const h = String(cell.value ?? '').trim().toLowerCase();
    const match = COLUMNS.find((c) => c.key.toLowerCase() === h || c.header.toLowerCase() === h);
    if (match) headerMap[col] = match.key;
  });
  const rows: RawRow[] = [];
  ws.eachRow((row, idx) => {
    if (idx === 1) return;
    const obj: RawRow = {};
    row.eachCell((cell, col) => {
      const key = headerMap[col];
      if (key) obj[key] = cellValue(cell.value);
    });
    if (Object.keys(obj).length) rows.push(obj);
  });
  return rows;
}

const asRows = (v: unknown): RawRow[] =>
  (Array.isArray(v) ? v : v && typeof v === 'object' ? [v] : []).filter((x): x is RawRow => !!x && typeof x === 'object');

function fromJson(buffer: Buffer): RawRow[] {
  let data: unknown;
  try {
    data = JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new HttpError(400, 'File JSON không hợp lệ');
  }
  if (Array.isArray(data)) return asRows(data);
  const obj = (data ?? {}) as { items?: unknown; Products?: unknown };
  return asRows(obj.items ?? obj.Products ?? []);
}

function fromXml(buffer: Buffer): RawRow[] {
  const parser = new XMLParser({ parseTagValue: false, trimValues: true });
  const data = parser.parse(buffer.toString('utf8')) as { Products?: { Product?: unknown } } | undefined;
  return asRows(data?.Products?.Product ?? []);
}

export async function parseImportFile(file: Express.Multer.File): Promise<RawRow[]> {
  const ext = file.originalname.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx') return fromXlsx(file.buffer);
  if (ext === 'json') return fromJson(file.buffer);
  if (ext === 'xml') return fromXml(file.buffer);
  throw new HttpError(400, 'Chỉ hỗ trợ file .xlsx, .json, .xml');
}

// Chỉ giữ các trường hợp lệ
export const pickFields = (row: RawRow): ImportRow =>
  Object.fromEntries(Object.entries(row).filter(([k]) => KEYS.includes(k))) as ImportRow;
