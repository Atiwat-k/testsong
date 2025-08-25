import express from 'express';
import multer from 'multer';
import streamifier from 'streamifier';
import admin from 'firebase-admin';
import { google } from 'googleapis';

const router = express.Router();

// Multer สำหรับอ่านไฟล์จาก request
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// โหลด Service Account
const serviceAccount = JSON.parse(process.env.FIREBASE_KEY);

// Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'tunejoy-music-c4939.appspot.com',
  });
}
const db = admin.firestore();

// Google Drive
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/drive'],
});
const drive = google.drive({ version: 'v3', auth });
const folderId = '13ts1MGAPzPteh-HfR7D_IebDU_v8TOjR';

// ฟังก์ชันสร้าง URL สำหรับสตรีม / รูป
const createStreamableUrl = id => `https://drive.google.com/uc?export=download&id=${id}`;
const createImageUrl = id => `https://drive.google.com/uc?export=view&id=${id}`;

// ฟังก์ชันอัปโหลดไฟล์
async function uploadToDrive(file) {
  const fileStream = streamifier.createReadStream(file.buffer);
  const response = await drive.files.create({
    requestBody: {
      name: file.originalname,
      mimeType: file.mimetype,
      parents: [folderId],
    },
    media: { mimeType: file.mimetype, body: fileStream },
    fields: 'id,name,mimeType',
  });

  // ไม่ต้องตั้ง permissions ให้ anyone
  return response.data;
}

// Routes
router.post('/add-song', upload.fields([{ name: 'file', maxCount: 1 }, { name: 'image', maxCount: 1 }]), async (req, res) => {
  if (!req.files || !req.files['file']) return res.status(400).json({ message: 'No audio file uploaded.' });

  try {
    const audioFile = req.files['file'][0];
    const imageFile = req.files['image'] ? req.files['image'][0] : null;

    const audioDriveFile = await uploadToDrive(audioFile);
    const audioUrl = createStreamableUrl(audioDriveFile.id);

    let imageUrl = null, imageDriveId = null;
    if (imageFile) {
      const imageDriveFile = await uploadToDrive(imageFile);
      imageUrl = createImageUrl(imageDriveFile.id);
      imageDriveId = imageDriveFile.id;
    }

    const songData = {
      name: req.body.name || audioFile.originalname,
      artist: req.body.artist || 'Unknown',
      category: req.body.category || 'Uncategorized',
      url: audioUrl,
      googleDriveId: audioDriveFile.id,
      imageUrl,
      imageDriveId,
      mimeType: audioDriveFile.mimeType,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('songs').add(songData);
    res.status(200).json({ message: 'Song added', song: { id: docRef.id, ...songData } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error uploading to Google Drive', error: error.message });
  }
});

// POST /upload-image - อัปโหลดรูปภาพเฉพาะ
router.post('/upload-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file uploaded.' });
  }

  try {
    const imageFile = req.file;
    
    // อัปโหลดรูปภาพไปยัง Google Drive
    const imageDriveFile = await uploadToDrive(imageFile);
    const imageUrl = createImageUrl(imageDriveFile.id);

    res.status(200).json({
      message: 'Image uploaded successfully.',
      image: {
        id: imageDriveFile.id,
        name: imageDriveFile.name,
        url: imageUrl,
        mimeType: imageDriveFile.mimeType
      }
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({
      message: 'Error uploading image to Google Drive',
      error: error.message
    });
  }
});

// GET /get-songs - ดึงเพลงทั้งหมด
router.get('/get-songs', async (req, res) => {
  try {
    const snapshot = await db.collection('songs').orderBy('createdAt', 'desc').get();
    const songs = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        url: data.url || createStreamableUrl(data.googleDriveId),
        imageUrl: data.imageUrl || (data.imageDriveId ? createImageUrl(data.imageDriveId) : null)
      };
    });

    res.status(songs.length > 0 ? 200 : 404).json(
      songs.length > 0 ? songs : { message: 'No songs found.' }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching songs', error: error.message });
  }
});
// GET /get-songs-by-category - ดึงเพลงตามหมวดหมู่
router.get('/get-songs-by-category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    
    // แปลงชื่อหมวดหมู่
    let dbCategory;
    if (category === 'ผู้สูงวัย') {
      dbCategory = 'เพลงสำหรับผู้สูงวัย';
    } else if (category === 'เปียโน') {
      dbCategory = 'ดนตรีเปียโน';
    } else {
      dbCategory = category;
    }
    
    // ดึงทั้งหมดแล้วกรอง
    const snapshot = await db.collection('songs')
      .orderBy('createdAt', 'desc')
      .get();
      
    const songs = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          url: data.url || createStreamableUrl(data.googleDriveId),
          imageUrl: data.imageUrl || (data.imageDriveId ? createImageUrl(data.imageDriveId) : null)
        };
      })
      .filter(song => song.category === dbCategory);

    res.status(songs.length > 0 ? 200 : 404).json(
      songs.length > 0 ? songs : { message: 'ไม่พบเพลงในหมวดหมู่นี้' }
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดในการดึงเพลงตามหมวดหมู่', error: error.message });
  }
});
// GET /stream-audio/:id - สร้าง signed URL สำหรับสตรีม
router.get('/stream-audio/:id', async (req, res) => {
  try {
    const songId = req.params.id;
    const doc = await db.collection('songs').doc(songId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ message: 'Song not found' });
    }

    const songData = doc.data();
    const fileId = songData.googleDriveId;

    if (!fileId) {
      return res.status(400).json({ message: 'No Google Drive ID found' });
    }

    const streamUrl = createStreamableUrl(fileId);
    
    res.json({ 
      streamUrl: streamUrl,
      song: songData
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error generating stream URL', error: error.message });
  }
});

// DELETE /delete-song/:id - ลบเพลง
router.delete('/delete-song/:id', async (req, res) => {
  try {
    const songId = req.params.id;
    
    // ดึงข้อมูลเพลงจาก Firestore
    const doc = await db.collection('songs').doc(songId).get();
    
    if (!doc.exists) {
      return res.status(404).json({ message: 'Song not found' });
    }

    const songData = doc.data();
    const audioFileId = songData.googleDriveId;
    const imageFileId = songData.imageDriveId;

    // ลบไฟล์เสียงจาก Google Drive
    let audioDeleteSuccess = true;
    if (audioFileId) {
      audioDeleteSuccess = await deleteFromDrive(audioFileId);
    }

    // ลบไฟล์รูปภาพจาก Google Drive (ถ้ามี)
    let imageDeleteSuccess = true;
    if (imageFileId) {
      imageDeleteSuccess = await deleteFromDrive(imageFileId);
    }

    // ลบข้อมูลจาก Firestore
    await db.collection('songs').doc(songId).delete();

    // ส่ง response ตามผลการลบ
    if (audioDeleteSuccess && imageDeleteSuccess) {
      res.status(200).json({ 
        message: 'Song deleted successfully from both Firestore and Google Drive',
        deletedSongId: songId
      });
    } else {
      res.status(207).json({ 
        message: 'Song deleted from Firestore but there were issues with Google Drive deletion',
        deletedSongId: songId,
        audioDeleted: audioDeleteSuccess,
        imageDeleted: imageDeleteSuccess
      });
    }

  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ 
      message: 'Error deleting song', 
      error: error.message 
    });
  }
});

// DELETE /delete-multiple-songs - ลบเพลงหลายๆ เพลงพร้อมกัน
router.delete('/delete-multiple-songs', async (req, res) => {
  try {
    const { songIds } = req.body;
    
    if (!songIds || !Array.isArray(songIds) || songIds.length === 0) {
      return res.status(400).json({ message: 'No song IDs provided' });
    }

    const results = {
      success: [],
      failed: []
    };

    // ลบแต่ละเพลง
    for (const songId of songIds) {
      try {
        const doc = await db.collection('songs').doc(songId).get();
        
        if (!doc.exists) {
          results.failed.push({ songId, error: 'Song not found' });
          continue;
        }

        const songData = doc.data();
        const audioFileId = songData.googleDriveId;
        const imageFileId = songData.imageDriveId;

        // ลบไฟล์จาก Google Drive
        if (audioFileId) {
          await deleteFromDrive(audioFileId);
        }
        if (imageFileId) {
          await deleteFromDrive(imageFileId);
        }

        // ลบจาก Firestore
        await db.collection('songs').doc(songId).delete();
        
        results.success.push(songId);
      } catch (error) {
        results.failed.push({ songId, error: error.message });
      }
    }

    res.status(200).json({
      message: `Deleted ${results.success.length} songs, ${results.failed.length} failed`,
      results: results
    });

  } catch (error) {
    console.error('Error deleting multiple songs:', error);
    res.status(500).json({ 
      message: 'Error deleting multiple songs', 
      error: error.message 
    });
  }
});

export default router;