import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler, HttpError } from '../../middleware/error.js';
import { imageUpload } from '../../lib/upload.js';
import { diagnose, chat, aiEnabled } from './ai.service.js';

const r = Router();

r.get('/status', (_req, res) => res.json({ enabled: aiEnabled() }));

r.post('/diagnose', imageUpload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Hãy chọn ảnh lá cây');
  res.json(await diagnose(req.file));
}));

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) })).min(1).max(30),
});
r.post('/chat', asyncHandler(async (req, res) => {
  const { messages } = chatSchema.parse(req.body);
  res.json({ reply: await chat(messages) });
}));

export default r;
