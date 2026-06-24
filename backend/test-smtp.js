const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const nodemailer = require('nodemailer');

console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS length:', process.env.EMAIL_PASS ? process.env.EMAIL_PASS.length : 0);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

console.log('Attempting to verify SMTP transporter...');
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP verification failed:');
    console.error(error);
  } else {
    console.log('✅ SMTP transporter is ready to send emails!');
  }
});
