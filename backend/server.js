require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const validator = require('validator');

const app = express();
const PORT = process.env.PORT || 5050;
const CONTACT_RATE_LIMIT = Number(process.env.CONTACT_RATE_LIMIT || 5);
const CONTACT_RATE_WINDOW_MS = Number(process.env.CONTACT_RATE_WINDOW_MS || 60_000);
const MAX_MESSAGE_LENGTH = Number(process.env.CONTACT_MAX_MESSAGE_LENGTH || 2000);
const MAX_NAME_LENGTH = Number(process.env.CONTACT_MAX_NAME_LENGTH || 80);

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://127.0.0.1:5500,http://localhost:5500')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const requiredEnv = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'EMAIL_FROM',
  'EMAIL_TO',
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  console.warn(`⚠️  Missing environment variables: ${missingEnv.join(', ')}`);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify()
  .then(() => console.log('📬 Mail transporter ready'))
  .catch((err) => console.error('❌ Mail transporter verification failed:', err));

const contactLimiter = rateLimit({
  windowMs: CONTACT_RATE_WINDOW_MS,
  max: CONTACT_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

app.use('/api/contact', contactLimiter);

const escapeHtml = (value = '') =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS origin denied' });
  }
  return next(err);
});

// Test endpoint
app.get('/cors-test', (req, res) => {
  res.json({ status: 'ok', message: 'CORS is working!' });
});

// Contact form handler
app.post('/api/contact', async (req, res) => {
  const rawName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const rawEmail = typeof req.body.email === 'string' ? req.body.email.trim() : '';
  const rawMessage = typeof req.body.message === 'string' ? req.body.message.trim() : '';

  if (!rawName || !rawEmail || !rawMessage) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!validator.isLength(rawName, { min: 2, max: MAX_NAME_LENGTH })) {
    return res.status(400).json({ error: 'Please use 2-80 characters for your name.' });
  }

  if (!validator.isEmail(rawEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  if (!validator.isLength(rawMessage, { min: 10, max: MAX_MESSAGE_LENGTH })) {
    return res.status(400).json({ error: `Message should be between 10 and ${MAX_MESSAGE_LENGTH} characters.` });
  }

  const safeName = escapeHtml(rawName);
  const normalizedEmail = validator.normalizeEmail(rawEmail) || rawEmail;
  const safeEmailDisplay = escapeHtml(normalizedEmail);
  const safeMessageHtml = escapeHtml(rawMessage).replace(/\r?\n/g, '<br>');
  const plainMessage = rawMessage.replace(/\r?\n/g, '\n');

  try {
    // 🔔 Send to site owner
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      replyTo: normalizedEmail,
      subject: `New message from ${safeName}`,
      text: `Name: ${rawName}\nEmail: ${normalizedEmail}\n\nMessage:\n${plainMessage}`,
      html: `
        <h3>Contact Form Submission</h3>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> ${safeEmailDisplay}</p>
        <p><strong>Message:</strong><br>${safeMessageHtml}</p>
      `,
    });

    // 📬 Confirmation email to sender
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: normalizedEmail,
      subject: 'Thank you for contacting Saved Glass',
      text: `Hi ${rawName},\n\nThank you for reaching out. We received your message:\n\n"${plainMessage}"\n\nWe’ll be in touch soon.\n— Saved Glass`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <img src="https://res.cloudinary.com/dj3sy6ut7/image/upload/v1760790715/saved-glass/SG.png" alt="Saved Glass Logo" style="max-height: 120px; margin-bottom: 20px;" />
          <p>Hi ${safeName},</p>
          <p>Thank you for reaching out. We received your message:</p>
          <blockquote style="border-left: 4px solid #ccc; padding-left: 10px; color: #555;">${safeMessageHtml}</blockquote>
          <p>We’ll be in touch soon.</p>
          <p style="color: #1c3d2b; font-weight: bold;">— Saved Glass</p>
          <div style="margin-top: 20px;">
            <a href="https://stnobile.github.io/saved-glass/" style="padding: 10px 20px; background-color: #1c3d2b; color: #fff; text-decoration: none; border-radius: 5px;">Visit Our Website</a>
          </div>
        </div>
      `,
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
