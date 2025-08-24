import express from 'express';
import songRoutes from '../songRoutes.js'; // ปรับ path ให้ตรงกับตำแหน่งไฟล์จริง

const app = express();
app.use(express.json());
app.use('/songRoutes', songRoutes);

// กำหนด port จาก environment variable หรือใช้ 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
