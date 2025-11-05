require('dotenv').config();
const path = require('path');
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

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://127.0.0.1:5500,http://localhost:5500,https://svenskadomaner.se,https://www.svenskadomaner.se,https://savedglass.com,https://www.savedglass.com')
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

const frontendDir = path.join(__dirname, '..');

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

app.use('/assets', express.static(path.join(frontendDir, 'assets')));
app.use('/css', express.static(path.join(frontendDir, 'css')));
app.use('/js', express.static(path.join(frontendDir, 'js')));

const sendHome = (req, res) => {
  res.sendFile(path.join(frontendDir, 'home.html'));
};

app.get('/', sendHome);
app.get('/home', (req, res) => res.redirect(301, '/'));
app.get('/home.html', sendHome);
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});
app.get('/site.webmanifest', (req, res) => {
  res.sendFile(path.join(frontendDir, 'site.webmanifest'));
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
      text: `Hi ${rawName},\n\nWelcome to Saved Glass. We're thrilled you reached out and wanted to share the note you sent us:\n\n${plainMessage}\n\nWe'll review it and get back to you shortly. In the meantime, you can explore more about our restoration studio here: https://stnobile.github.io/saved-glass/\n\nWarmly,\nThe Saved Glass Team`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Saved Glass</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f4ed;">
  <center role="article" aria-roledescription="email" lang="en" style="width: 100%; background-color: #f7f4ed;">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0 auto; padding: 32px 0; font-family: 'Manrope', Arial, sans-serif;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 580px; width: 100%; background-color: #ffffff; border: 1px solid #e2d9c3; border-radius: 20px; overflow: hidden;">
            <tr>
              <td style="padding: 36px 40px 24px; text-align: center; border-bottom: 1px solid #efe6d7;">
                <p style="margin: 0; font-size: 20px; color: #1c3d2b; font-weight: 400; letter-spacing: 0.2px;">
                  Welcome to <span style="font-weight: 600; text-decoration: underline; text-decoration-thickness: 2px;">Saved Glass</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 32px 32px 36px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td align="center" style="padding: 0 0 24px;">
                      <img src="https://res.cloudinary.com/dj3sy6ut7/image/upload/v1760790715/saved-glass/SG.png" alt="Saved Glass logo" style="display: block; width: 100%; max-width: 200px; height: auto; border-radius: 18px; margin: 0 auto;">
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="color: #36423c; font-size: 16px; line-height: 1.7;">
                      <p style="margin: 0 0 12px;">Hi ${safeName},</p>
                      <p style="margin: 0 0 18px;">We're so glad to finally meet you. Here's the message you shared with us:</p>
                      <div style="margin: 0 auto 24px; padding: 18px 20px; background-color: #f1ede3; border-radius: 14px; color: #4d5d54; text-align: left; display: inline-block; max-width: 100%; box-sizing: border-box;">
                        ${safeMessageHtml}
                      </div>
                      <p style="margin: 0 0 24px;">Our restorers will review your note and connect with you shortly to plan next steps.</p>
                      <div style="width: 60px; height: 2px; background-color: #c1cbbf; margin: 0 auto 24px;"></div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 40px 36px; text-align: center;">
                <p style="margin: 0 0 22px; color: #5a6f65; font-size: 15px; line-height: 1.6;">
                  While you wait, discover how Saved Glass brings kintsugi artistry and precision grinding to hotels, restaurants, and cafes across the UAE.
                </p>
                <a href="https://stnobile.github.io/saved-glass/" class="cta-btn" style="display: inline-block; padding: 14px 32px; border: 1px solid #1c3d2b; color: #1c3d2b; text-decoration: none; font-weight: 600; letter-spacing: 0.5px;">
                  Explore Saved Glass
                </a>
              </td>
            </tr>
            <tr>
              <td style="background-color: #f7f4ed; padding: 22px 40px; text-align: center; color: #7e8b86; font-size: 12px; line-height: 1.6;">
                <p style="margin: 0;">Saved Glass · Dubai, UAE</p>
                <p style="margin: 6px 0 0;">You are receiving this email because you reached out via our website contact form.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>
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
