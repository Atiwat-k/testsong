const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

// โหลด credentials
const credentials = JSON.parse(fs.readFileSync('credentials.json'));
const { client_id, client_secret, redirect_uris } = credentials.installed; // ถ้า Desktop App
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// สร้าง URL สำหรับให้ผู้ใช้ authorize
const SCOPES = ['https://www.googleapis.com/auth/drive.file']; // สิทธิ์อัปโหลดไฟล์
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Authorize this app by visiting this url:', authUrl);

// อ่าน code ที่ผู้ใช้กรอกหลัง authorize
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync('token.json', JSON.stringify(tokens, null, 2));
    console.log('Token stored to token.json');
  } catch (err) {
    console.error('Error retrieving access token', err);
  }
});
