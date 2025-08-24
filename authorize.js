import express from 'express';
import { google } from 'googleapis';

const app = express();

// โหลด credentials จาก Environment Variable
const credentials = JSON.parse(process.env.GOOGLE_OAUTH_TOKEN); 
const { client_id, client_secret, redirect_uris } = credentials.web; // สำหรับ Web App
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

// สร้าง URL สำหรับ authorize
app.get('/auth', (req, res) => {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
  });
  res.redirect(authUrl);
});

// รับ callback จาก Google
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.send('No code found');

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // แทนการเขียนไฟล์ ให้แสดง token แล้วคัดลอกไปใส่ Environment Variable
    console.log('Set this as GOOGLE_OAUTH_TOKEN:');
    console.log(JSON.stringify(tokens, null, 2));

    res.send('Authorization successful! Copy the token and set it as an Environment Variable (GOOGLE_OAUTH_TOKEN).');
  } catch (err) {
    console.error('Error retrieving access token', err);
    res.send('Error retrieving access token');
  }
});

// ตัวอย่างการใช้งาน token จาก Environment Variable
if (process.env.GOOGLE_OAUTH_TOKEN) {
  oAuth2Client.setCredentials(JSON.parse(process.env.GOOGLE_OAUTH_TOKEN));
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });
  // คุณสามารถใช้ drive API ที่นี่
}

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
