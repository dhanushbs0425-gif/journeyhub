require('../src/config/env');
const nodemailer = require('nodemailer');

console.log('Testing SMTP with user:', process.env.SMTP_USER);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

transporter.verify().then(() => {
  console.log('SUCCESS: Gmail SMTP connected and verified successfully with Google servers!');
  process.exit(0);
}).catch(err => {
  console.error('FAIL: Gmail SMTP error:', err.message);
  process.exit(1);
});
