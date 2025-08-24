import express from 'express';
import songRoutes from '../songRoutes.js';
import { VercelRequest, VercelResponse } from '@vercel/node';

const app = express();
app.use(express.json());
app.use('/songRoutes', songRoutes);

// Vercel ต้อง export default function
export default function handler(req, res) {
  app(req, res);
}
