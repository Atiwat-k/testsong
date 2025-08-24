import express from 'express';
import fs from 'fs';
import { google } from 'googleapis';

const app = express();

// โหลด credentials
const credentials = JSON.parse(fs.readFileSync('credentials.json'));
const { client_id, client_secret, redirect_uris } = credentials.web; // ใช้ .web สำหรับ Web App
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
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  fs.writeFileSync('token.json', JSON.stringify(tokens));
  res.send('Authorization successful! You can close this page.');
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
