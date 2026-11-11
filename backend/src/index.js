import 'dotenv/config';
import fs from 'node:fs';
import { app } from './app.js';
import { UPLOAD_DIR } from './lib/upload.js';

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🌿 GreenLeaf API: http://localhost:${PORT}  (docs: /api/docs)`));
