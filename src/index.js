import express from 'express';
import songRoutes from '../songRoutes.js';

const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/songRoutes', songRoutes); // เปลี่ยน path ให้เป็น /songs จะดู cleaner

// Start server
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
