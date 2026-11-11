import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import productRoutes from './modules/product/product.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';
import { errorHandler } from './middleware/error.js';
import { UPLOAD_DIR } from './lib/upload.js';
import { openapi } from './openapi.js';

export const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(UPLOAD_DIR));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapi));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/ai', aiRoutes);

app.use((_req, res) => res.status(404).json({ message: 'API không tồn tại' }));
app.use(errorHandler);
