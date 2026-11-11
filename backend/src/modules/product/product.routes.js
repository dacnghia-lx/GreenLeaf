import { Router } from 'express';
import * as c from './product.controller.js';
import { requireAdmin } from '../../middleware/auth.js';
import { imageUpload, memoryUpload } from '../../lib/upload.js';

const r = Router();

// Công khai (trang shop)
r.get('/', c.list);
r.get('/export', c.exportFile);
r.get('/:id', c.detail);

// Quản trị
r.post('/', requireAdmin, c.create);
r.post('/upload-image', requireAdmin, imageUpload.single('image'), c.uploadImage);
r.post('/import', requireAdmin, memoryUpload.single('file'), c.importFile);
r.post('/bulk-delete', requireAdmin, c.removeMany);
r.post('/copy', requireAdmin, c.copyMany);
r.post('/:id/copy', requireAdmin, c.copyOne);
r.put('/:id', requireAdmin, c.update);
r.delete('/:id', requireAdmin, c.remove);

export default r;
