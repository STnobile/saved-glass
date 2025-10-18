require('dotenv').config();
const cloudinary = require('./utils/cloudinary');
const path = require('path');

async function uploadLogo() {
  try {
    // Construct the absolute path to the logo
    const logoPath = path.join(__dirname, '..', 'assets', 'SG.png');

    const result = await cloudinary.uploader.upload(logoPath, {
      folder: 'saved-glass',
      use_filename: true,
      unique_filename: false,
    });

    console.log('✅ Logo uploaded!');
    console.log('🌐 Secure URL:', result.secure_url);
  } catch (err) {
    console.error('❌ Upload failed:', err);
  }
}

uploadLogo();