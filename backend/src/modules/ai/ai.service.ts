// Chẩn đoán bệnh cây từ ảnh lá + chatbot tư vấn, dùng OpenAI (vision + structured output)
import OpenAI from 'openai';
import { ContentFilterFinishReasonError, LengthFinishReasonError } from 'openai/error';
import { zodResponseFormat } from 'openai/helpers/zod';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { z } from 'zod';
import fs from 'node:fs/promises';
import type { ProductType } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { HttpError } from '../../middleware/error.js';
import { serialize, type ProductDTO } from '../product/product.service.js';

const DEFAULT_MODEL = 'gpt-4o-mini';
const model = () => process.env.OPENAI_MODEL?.trim() || DEFAULT_MODEL;

let client: OpenAI | null | undefined;
function getClient(): OpenAI | null {
  if (client === undefined) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    client = apiKey ? new OpenAI({ apiKey }) : null;
  }
  return client;
}
export const aiEnabled = () => Boolean(getClient());

export const DiagnosisSchema = z.object({
  isPlant: z.boolean().describe('Ảnh có phải cây/lá cây không'),
  plantName: z.string().describe('Tên cây dự đoán, tiếng Việt'),
  healthy: z.boolean(),
  diseaseName: z.string().describe('Tên bệnh tiếng Việt, rỗng nếu cây khoẻ'),
  confidence: z.number().describe('Độ tin cậy 0-1'),
  severity: z.enum(['none', 'mild', 'moderate', 'severe']),
  symptoms: z.array(z.string()),
  causes: z.array(z.string()),
  treatment: z.array(z.string()).describe('Các bước xử lý cụ thể'),
  prevention: z.array(z.string()),
  recommendedProductIds: z.array(z.number().int()).describe('ProductID trong danh mục phù hợp để điều trị/chăm sóc'),
});
export type DiagnosisResult = z.infer<typeof DiagnosisSchema> & { mock?: boolean };

export interface DiagnoseResponse extends DiagnosisResult {
  id: number;
  image: string;
  products: ProductDTO[];
}

const SYSTEM = `Bạn là chuyên gia bảo vệ thực vật của cửa hàng cây cảnh GreenLeaf.
Nhiệm vụ: xem ảnh lá/cây khách gửi, chẩn đoán tình trạng (bệnh nấm, vi khuẩn, sâu hại, thiếu dinh dưỡng, cháy nắng, úng nước...) và đề xuất cách xử lý.
Trả lời bằng tiếng Việt, ngắn gọn, thực tế cho người trồng cây tại nhà.
Chỉ đề xuất sản phẩm có trong danh mục được cung cấp, chọn tối đa 4 sản phẩm thực sự liên quan. Nếu ảnh không phải cây, đặt isPlant=false và để các danh sách rỗng.`;

const CARE_TYPES: ProductType[] = ['MEDICINE', 'FERTILIZER', 'TOOL'];

// Danh mục sản phẩm còn hàng để AI chọn gợi ý
async function catalog(types?: ProductType[]) {
  const items = await prisma.product.findMany({
    where: { ...(types ? { ProductType: { in: types } } : {}), Quantity: { gt: 0 } },
    select: { ProductID: true, ProductName: true, ProductType: true, Price: true, Unit: true, Description: true },
    orderBy: { ProductID: 'asc' },
  });
  const text = items
    .map((p) => `#${p.ProductID} [${p.ProductType}] ${p.ProductName} (${Number(p.Price).toLocaleString('vi-VN')}đ/${p.Unit}): ${p.Description ?? ''}`)
    .join('\n');
  return { ids: new Set(items.map((p) => p.ProductID)), text };
}

const MOCK: DiagnosisResult = {
  isPlant: true, plantName: 'Cây hoa hồng', healthy: false, diseaseName: 'Bệnh đốm đen (Diplocarpon rosae)',
  confidence: 0.82, severity: 'moderate',
  symptoms: ['Đốm đen tròn viền vàng trên lá', 'Lá vàng và rụng sớm'],
  causes: ['Nấm phát triển khi ẩm độ cao', 'Tưới nước lên lá vào buổi tối'],
  treatment: ['Cắt bỏ và tiêu huỷ lá bệnh', 'Phun thuốc trừ nấm 7-10 ngày/lần', 'Tưới gốc, tránh làm ướt lá'],
  prevention: ['Trồng nơi thoáng gió, đủ nắng', 'Bón phân cân đối, hạn chế đạm'],
  recommendedProductIds: [],
  mock: true,
};

// Lỗi gọi OpenAI -> thông báo tiếng Việt
function mapOpenAIError(err: unknown): never {
  if (err instanceof HttpError) throw err;
  if (err instanceof LengthFinishReasonError || err instanceof ContentFilterFinishReasonError) {
    throw new HttpError(422, 'AI không thể phân tích ảnh này, vui lòng thử ảnh khác');
  }
  if (err instanceof z.ZodError || err instanceof SyntaxError) {
    throw new HttpError(422, 'AI trả về kết quả không đúng định dạng, vui lòng thử lại');
  }
  if (err instanceof OpenAI.AuthenticationError) throw new HttpError(502, 'OPENAI_API_KEY không hợp lệ');
  if (err instanceof OpenAI.RateLimitError) throw new HttpError(503, 'AI đang quá tải hoặc hết hạn mức, vui lòng thử lại sau');
  if (err instanceof OpenAI.NotFoundError) throw new HttpError(502, `Model "${model()}" không tồn tại hoặc không được phép dùng`);
  if (err instanceof OpenAI.APIConnectionError) throw new HttpError(502, 'Không kết nối được tới OpenAI');
  if (err instanceof OpenAI.APIError) throw new HttpError(502, 'Dịch vụ AI gặp lỗi, vui lòng thử lại sau');
  throw err;
}

async function askOpenAI(ai: OpenAI, file: Express.Multer.File, catalogText: string) {
  const image = (await fs.readFile(file.path)).toString('base64');
  const completion = await ai.chat.completions.parse({
    model: model(),
    max_completion_tokens: 2000,
    response_format: zodResponseFormat(DiagnosisSchema, 'plant_diagnosis'),
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${file.mimetype};base64,${image}` } },
          { type: 'text', text: `Danh mục sản phẩm của cửa hàng:\n${catalogText || '(trống)'}\n\nHãy chẩn đoán cây trong ảnh.` },
        ],
      },
    ],
  });
  const message = completion.choices[0]?.message;
  if (!message || message.refusal || !message.parsed) {
    throw new HttpError(422, 'AI từ chối hoặc không thể phân tích ảnh này, vui lòng thử ảnh khác');
  }
  return message.parsed;
}

export async function diagnose(file: Express.Multer.File): Promise<DiagnoseResponse> {
  const ai = getClient();
  const { ids: allowed, text } = await catalog(CARE_TYPES);
  let result: DiagnosisResult;
  try {
    if (!ai) {
      // Chưa cấu hình OPENAI_API_KEY -> trả dữ liệu mẫu để demo giao diện
      const meds = await prisma.product.findMany({
        where: { ProductType: 'MEDICINE', Quantity: { gt: 0 } }, take: 2, select: { ProductID: true }, orderBy: { ProductID: 'asc' },
      });
      result = { ...MOCK, recommendedProductIds: meds.map((m) => m.ProductID) };
    } else {
      result = await askOpenAI(ai, file, text).catch(mapOpenAIError);
    }
  } catch (err) {
    await fs.unlink(file.path).catch(() => undefined); // không lưu ảnh khi chẩn đoán thất bại
    throw err;
  }

  // Chỉ giữ sản phẩm thật sự có trong danh mục (AI có thể bịa ID)
  result.recommendedProductIds = [...new Set(result.recommendedProductIds)].filter((id) => allowed.has(id)).slice(0, 4);
  result.confidence = Math.min(1, Math.max(0, result.confidence));
  if (!result.isPlant) result.recommendedProductIds = [];

  const products = result.recommendedProductIds.length
    ? (await prisma.product.findMany({ where: { ProductID: { in: result.recommendedProductIds } } })).map(serialize)
    : [];
  const saved = await prisma.diagnosis.create({ data: { PathImage: `/uploads/${file.filename}`, Result: result } });
  return { id: saved.DiagnosisID, image: saved.PathImage, ...result, products };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
export interface ChatResponse {
  reply: string;
  products: ProductDTO[];
  mock?: boolean;
}

// Lấy các sản phẩm được nhắc tới dạng #ID trong câu trả lời
async function mentionedProducts(reply: string, allowed: Set<number>): Promise<ProductDTO[]> {
  const ids = [...new Set([...reply.matchAll(/#(\d{1,9})\b/g)].map((m) => Number(m[1])))].filter((id) => allowed.has(id)).slice(0, 6);
  if (!ids.length) return [];
  const items = await prisma.product.findMany({ where: { ProductID: { in: ids } } });
  return ids.map((id) => items.find((p) => p.ProductID === id)).filter((p) => p !== undefined).map(serialize);
}

// Chatbot tư vấn chăm sóc cây
export async function chat(messages: ChatMessage[]): Promise<ChatResponse> {
  const ai = getClient();
  const { ids, text } = await catalog();
  if (!ai) {
    const sample = [...ids].slice(0, 2);
    const reply =
      'Đây là câu trả lời mẫu vì máy chủ chưa cấu hình OPENAI_API_KEY. ' +
      'Mẹo chung: tưới khi lớp đất mặt khô 2-3 cm, đặt cây nơi có ánh sáng tán xạ và bón phân loãng 2-4 tuần/lần.' +
      (sample.length ? ` Bạn có thể tham khảo sản phẩm ${sample.map((id) => `#${id}`).join(', ')}.` : '');
    return { reply, products: await mentionedProducts(reply, ids), mock: true };
  }
  const system: ChatCompletionMessageParam = {
    role: 'system',
    content: `${SYSTEM}
Ngoài chẩn đoán, bạn tư vấn chọn cây, cách tưới, bón phân, xử lý sâu bệnh. Trả lời thân thiện, tối đa khoảng 150 từ, có thể gạch đầu dòng.
Khi phù hợp, gợi ý sản phẩm trong danh mục bằng cách ghi mã dạng #ID (ví dụ #12). Không bịa sản phẩm ngoài danh mục.
Từ chối lịch sự các câu hỏi không liên quan tới cây trồng.
Danh mục sản phẩm còn hàng:
${text || '(trống)'}`,
  };
  try {
    const completion = await ai.chat.completions.create({
      model: model(),
      max_completion_tokens: 800,
      messages: [system, ...messages],
    });
    const message = completion.choices[0]?.message;
    if (!message || message.refusal) return { reply: 'Xin lỗi, mình không thể trả lời câu hỏi này.', products: [] };
    const reply = message.content?.trim() || 'Xin lỗi, mình chưa có câu trả lời phù hợp.';
    return { reply, products: await mentionedProducts(reply, ids) };
  } catch (err) {
    return mapOpenAIError(err);
  }
}
