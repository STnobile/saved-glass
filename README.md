# SavedGlass — Glassware Repair Services Website

A responsive business website for a company specializing in **glassware repair, polishing, and restoration**.  
The project combines a **static frontend** with a lightweight **Node.js backend** for handling uploads and media management.

## Live Website
https://www.savedglass.com/

---

## Project Overview
SavedGlass was developed as a **client-focused commercial website** designed to:

- Present professional glass repair and polishing services  
- Showcase craftsmanship through imagery and branding  
- Provide a clear customer journey from landing page → service understanding → contact  

The architecture separates:

- **Frontend:** static HTML/CSS/JavaScript for fast performance and SEO  
- **Backend:** Node.js utilities for media handling and server functionality  

---

## Tech Stack

### Frontend
- HTML5  
- CSS3  
- JavaScript  
- Responsive layout  
- Image carousel component  

### Backend
- Node.js  
- Express server  
- Cloudinary integration for image upload & storage  
- Environment-based configuration (`.env`)  

### Deployment
- Custom domain hosting  
- Static asset delivery  
- Production-ready folder structure

## Project Structure
saved-glass/
│
├── index.html / home.html     # Main website pages
├── css/
│   └── style.css              # Global styling
├── js/
│   └── carousel.js            # Image carousel interaction
├── assets/                    # Images, icons, branding
│
├── backend/
│   ├── server.js              # Node.js server
│   ├── uploadLogo.js          # Upload handling logic
│   ├── utils/
│   │   └── cloudinary.js      # Cloudinary configuration
│   ├── package.json           # Backend dependencies
│   └── .env.example           # Environment template
│
├── package.json               # Project config
└── CNAME                      # Custom domain config

## 🚀 Features

- Professional **service presentation layout**
- **Responsive design** for desktop and mobile
- **Image carousel** for showcasing repaired glassware
- **Cloudinary-based media upload system**
- Lightweight **Node.js backend** for asset management
- SEO-friendly static frontend structure
- Custom domain deployment

---

## ⚙️ Local Development Setup

### 1️⃣ Clone the repository
```bash
git clone https://github.com/STnobile/saved-glass.git
cd saved-glass
