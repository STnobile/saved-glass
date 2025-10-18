require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 5050;

// ✅ CORS
app.use(cors({
  origin: 'http://127.0.0.1:5500',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ Test endpoint
app.get('/cors-test', (req, res) => {
  res.json({ status: 'ok', message: 'CORS is working!' });
});

// ✅ Contact form
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_PORT == 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 🔔 Send to site owner
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: `New message from ${name}`,
      html: `
        <h3>Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong><br>${message}</p>
      `
    });

    // 📬 Send confirmation to sender
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Thank you for contacting Saved Glass`,
      html: `
        <p>Hi ${name},</p>
        <p>Thank you for reaching out. We received your message:</p>
        <blockquote>${message}</blockquote>
        <p>We’ll be in touch soon.</p>
        <p>— Saved Glass</p>
      `
    });

    res.json({ success: true, message: 'Message sent successfully!' });
  } catch (err) {
    console.error('❌ Email error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});