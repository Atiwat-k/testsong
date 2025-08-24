import express from 'express';
import songRoutes from './songRoutes.js';

const app = express();

// ให้มือถือเข้าถึง API ได้
app.use(express.json());
app.use('/songRoutes', songRoutes);

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
