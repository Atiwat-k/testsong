import { google } from 'googleapis';
import readline from 'readline';

// โหลด credentials จาก Environment Variable
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS); 
// GOOGLE_CREDENTIALS = JSON.stringify(ไฟล์ credentials.json)
const { client_id, client_secret, redirect_uris } = credentials.installed;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const SCOPES = ['https://www.googleapis.com/auth/drive.file']; // สิทธิ์อัปโหลดไฟล์
const authUrl = oAuth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Authorize this app by visiting this url:', authUrl);

// ใช้ readline เพื่อรับ code
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);

    // แทนการเขียนไฟล์ ให้ print แล้ว copy ไปใส่ Environment Variable
    console.log('Copy this token and set it as GOOGLE_OAUTH_TOKEN:');
    console.log(JSON.stringify(tokens, null, 2));

    console.log('Done! You can now use process.env.GOOGLE_OAUTH_TOKEN in your server code.');
  } catch (err) {
    console.error('Error retrieving access token', err);
  }
});
