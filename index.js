import { createServer } from 'http';
import express from 'express';
import songRoutes from '../songRoutes.js';

const app = express();
app.use(express.json());
app.use('/songRoutes', songRoutes);

export default app;
