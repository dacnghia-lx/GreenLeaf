// Import / Export sản phẩm: Excel (.xlsx), JSON, XML
import ExcelJS from 'exceljs';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

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
];
const KEYS = COLUMNS.map((c) => c.key);

// ---------- EXPORT ----------
export async function toXlsx(products) {
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

export const toJson = (products) => Buffer.from(JSON.stringify(products, null, 2));

export function toXml(products) {
  const builder = new XMLBuilder({ format: true, ignoreAttributes: false });
  const body = builder.build({
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
};

// ---------- IMPORT ----------
async function fromXlsx(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  // Cho phép tiêu đề là tên trường (ProductName) hoặc tên tiếng Việt (Tên sản phẩm)
  const headerMap = {};
  ws.getRow(1).eachCell((cell, col) => {
    const h = String(cell.value ?? '').trim();
    const match = COLUMNS.find((c) => c.key.toLowerCase() === h.toLowerCase() || c.header.toLowerCase() === h.toLowerCase());
    if (match) headerMap[col] = match.key;
  });
  const rows = [];
  ws.eachRow((row, idx) => {
    if (idx === 1) return;
    const obj = {};
    row.eachCell((cell, col) => {
      const key = headerMap[col];
      if (!key) return;
      let v = cell.value;
      if (v && typeof v === 'object') v = v.text ?? v.result ?? v.hyperlink ?? String(v);
      obj[key] = v;
    });
    if (Object.keys(obj).length) rows.push(obj);
  });
  return rows;
}

function fromJson(buffer) {
  const data = JSON.parse(buffer.toString('utf8'));
  return Array.isArray(data) ? data : data.items ?? data.Products ?? [];
}

function fromXml(buffer) {
  const parser = new XMLParser({ parseTagValue: false, trimValues: true });
  const data = parser.parse(buffer.toString('utf8'));
  const list = data?.Products?.Product ?? [];
  return Array.isArray(list) ? list : [list];
}

export async function parseImportFile(file) {
  const ext = file.originalname.split('.').pop().toLowerCase();
  if (ext === 'xlsx') return fromXlsx(file.buffer);
  if (ext === 'json') return fromJson(file.buffer);
  if (ext === 'xml') return fromXml(file.buffer);
  throw Object.assign(new Error('Chỉ hỗ trợ file .xlsx, .json, .xml'), { status: 400 });
}

// Chỉ giữ các trường hợp lệ
export const pickFields = (row) => Object.fromEntries(Object.entries(row).filter(([k]) => KEYS.includes(k)));
