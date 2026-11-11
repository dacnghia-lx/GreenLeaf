// Chẩn đoán bệnh cây từ ảnh lá bằng Claude (vision + structured output)
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';
import fs from 'node:fs/promises';
import { prisma } from '../../lib/prisma.js';
import { serialize } from '../product/product.service.js';

const MODEL = 'claude-opus-5-5';
const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
export const aiEnabled = () => Boolean(client);

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

const SYSTEM = `Bạn là chuyên gia bảo vệ thực vật của cửa hàng cây cảnh GreenLeaf.
Nhiệm vụ: xem ảnh lá/cây khách gửi, chẩn đoán tình trạng (bệnh nấm, vi khuẩn, sâu hại, thiếu dinh dưỡng, cháy nắng, úng nước...) và đề xuất cách xử lý.
Trả lời bằng tiếng Việt, ngắn gọn, thực tế cho người trồng cây tại nhà.
Chỉ đề xuất sản phẩm có trong danh mục được cung cấp, chọn tối đa 4 sản phẩm thực sự liên quan. Nếu ảnh không phải cây, đặt isPlant=false và để các danh sách rỗng.`;

async function catalog() {
  const items = await prisma.product.findMany({
    where: { ProductType: { in: ['MEDICINE', 'FERTILIZER', 'TOOL'] }, Quantity: { gt: 0 } },
    select: { ProductID: true, ProductName: true, ProductType: true, Description: true },
  });
  return items.map((p) => `#${p.ProductID} [${p.ProductType}] ${p.ProductName}: ${p.Description ?? ''}`).join('\n');
}

const MOCK = {
  isPlant: true, plantName: 'Cây hoa hồng', healthy: false, diseaseName: 'Bệnh đốm đen (Diplocarpon rosae)',
  confidence: 0.82, severity: 'moderate',
  symptoms: ['Đốm đen tròn viền vàng trên lá', 'Lá vàng và rụng sớm'],
  causes: ['Nấm phát triển khi ẩm độ cao', 'Tưới nước lên lá vào buổi tối'],
  treatment: ['Cắt bỏ và tiêu huỷ lá bệnh', 'Phun thuốc trừ nấm 7-10 ngày/lần', 'Tưới gốc, tránh làm ướt lá'],
  prevention: ['Trồng nơi thoáng gió, đủ nắng', 'Bón phân cân đối, hạn chế đạm'],
  recommendedProductIds: [],
  mock: true,
};

export async function diagnose(file) {
  let result;
  if (!client) {
    // Chưa cấu hình ANTHROPIC_API_KEY -> trả dữ liệu mẫu để demo giao diện
    const meds = await prisma.product.findMany({ where: { ProductType: 'MEDICINE' }, take: 2, select: { ProductID: true } });
    result = { ...MOCK, recommendedProductIds: meds.map((m) => m.ProductID) };
  } else {
    const image = (await fs.readFile(file.path)).toString('base64');
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: zodOutputFormat(DiagnosisSchema) },
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: file.mimetype, data: image } },
          { type: 'text', text: `Danh mục sản phẩm của cửa hàng:\n${await catalog()}\n\nHãy chẩn đoán cây trong ảnh.` },
        ],
      }],
    });
    if (response.stop_reason === 'refusal' || !response.parsed_output) {
      throw Object.assign(new Error('AI không thể phân tích ảnh này, vui lòng thử ảnh khác'), { status: 422 });
    }
    result = response.parsed_output;
  }

  const products = result.recommendedProductIds.length
    ? (await prisma.product.findMany({ where: { ProductID: { in: result.recommendedProductIds } } })).map(serialize)
    : [];
  const saved = await prisma.diagnosis.create({ data: { PathImage: `/uploads/${file.filename}`, Result: result } });
  return { id: saved.DiagnosisID, image: saved.PathImage, ...result, products };
}

// Chatbot tư vấn chăm sóc cây
export async function chat(messages) {
  if (!client) return 'Chatbot chưa được bật (thiếu ANTHROPIC_API_KEY trong backend/.env).';
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'low' },
    system: `${SYSTEM}\nNgoài chẩn đoán, bạn tư vấn chọn cây, cách tưới, bón phân. Khi phù hợp, gợi ý sản phẩm theo mã #ID trong danh mục:\n${await catalog()}`,
    messages,
  });
  if (response.stop_reason === 'refusal') return 'Xin lỗi, mình không thể trả lời câu hỏi này.';
  return response.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
}
