import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import homeworkRoutes from './routes/homework.js';
import submissionRoutes from './routes/submission.js';
import userRoutes from './routes/user.js';
import aiRoutes from './routes/ai.js';
import classRoutes from './routes/class.js';
import chatRoutes from './routes/chat.js';
import friendRoutes from './routes/friend.js';
import storeRoutes from './routes/store.js';
import prisma from './utils/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/homework', homeworkRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/class', classRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/friend', friendRoutes);
app.use('/api/store', storeRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: '服务器运行正常' });
});

app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
});
