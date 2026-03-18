# 🌐 LingoGO — Multilingual AI Chatbot

> A full-stack multilingual AI chatbot supporting 16+ languages, powered by Groq AI (LLaMA 3), with voice input, camera/image language detection, and a beautiful dark/light UI.

---

## ✨ Features

- 🤖 **AI Chat** — Powered by Groq's LLaMA 3.3 70B model
- 🌍 **16+ Languages** — English, Hindi, Marathi, Spanish, French, German, Chinese, Arabic, Japanese, Portuguese, Russian, Bengali, Urdu, Tamil, Telugu, Korean
- 🌐 **Auto Language Detection** — Detects language as you type
- 📷 **Camera Support** — Take a photo and let LingoGO detect & translate text in it
- 🖼️ **Image Upload** — Upload any image for AI analysis and text detection
- 🎤 **Voice Input** — Speak your message in any language
- 🔊 **Text to Speech** — Bot responses read aloud in the correct language
- 🌙 **Dark / Light Mode** — Toggle between themes, saved automatically
- 📋 **Copy Messages** — One-click copy any message
- 👍👎 **Reactions** — Like or dislike any message
- 🔍 **Search Chats** — Search through your chat history
- 📄 **Export Chat** — Export as TXT or PDF
- 🗑️ **Clear Chat** — Clear current chat view
- 🔄 **Quick Translate** — Translate any text instantly without chatting
- 💾 **Chat History** — All sessions saved to MySQL database
- 🔐 **Authentication** — Secure login and registration with JWT

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL |
| AI Model | Groq API (LLaMA 3.3 70B + LLaMA 4 Vision) |
| Auth | JWT (JSON Web Tokens) |
| Security | Helmet, CORS, Rate Limiting |

---

## 📁 Project Structure

```
lingogo/
├── backend/
│   ├── middleware/
│   │   └── auth.js          # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js          # Login & register routes
│   │   └── chat.js          # Chat, image & translate routes
│   ├── db.js                # MySQL connection pool
│   └── server.js            # Express server entry point
├── database/
│   └── schema.sql           # MySQL database schema
├── frontend/
│   ├── css/
│   │   └── style.css        # Main stylesheet (dark/light themes)
│   ├── js/
│   │   └── app.js           # Frontend logic
│   └── index.html           # Main HTML file
├── .env                     # Environment variables (not in git)
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MySQL 8.0+
- Groq API Key (free at [console.groq.com](https://console.groq.com))

### 1. Clone the repository
```bash
git clone https://github.com/Himanshu27176/Multilingual-chatbot.git
cd Multilingual-chatbot
```

### 2. Install dependencies
```bash
cd backend
npm install
```

### 3. Set up the database
```bash
mysql -u root -p < database/schema.sql
```

### 4. Create `.env` file
Create a `.env` file in the root directory:
```env
PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=multilingual_chatbot
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
GROQ_API_KEY=your_groq_api_key
CORS_ORIGIN=http://127.0.0.1:5500
```

### 5. Start the backend server
```bash
node backend/server.js
```

### 6. Open the frontend
Open `frontend/index.html` with Live Server in VS Code, or navigate to:
```
http://127.0.0.1:5500/frontend/index.html
```

---

## 🔑 Demo Account

```
Email:    demo@chatbot.com
Password: Demo@1234
```

---

## 📷 Camera & Image Detection

LingoGO can analyze images using Groq's Vision AI:

1. Click the 📷 **Camera** button to take a photo
2. Click the 🖼️ **Upload** button to upload an image
3. Optionally type a question about the image
4. LingoGO will:
   - Detect any text in the image
   - Identify the language of the text
   - Translate it to your selected language
   - Describe what it sees in the image

---

## 🌐 Supported Languages

| Code | Language | Code | Language |
|------|----------|------|----------|
| en | 🇬🇧 English | ar | 🇸🇦 Arabic |
| hi | 🇮🇳 Hindi | ja | 🇯🇵 Japanese |
| mr | 🇮🇳 Marathi | pt | 🇧🇷 Portuguese |
| es | 🇪🇸 Spanish | ru | 🇷🇺 Russian |
| fr | 🇫🇷 French | bn | 🇧🇩 Bengali |
| de | 🇩🇪 German | ur | 🇵🇰 Urdu |
| zh | 🇨🇳 Chinese | ta | 🇮🇳 Tamil |
| ko | 🇰🇷 Korean | te | 🇮🇳 Telugu |

---

## 🔒 Security

- Passwords hashed with **bcrypt**
- Auth protected with **JWT tokens**
- Rate limiting on all API routes
- **Helmet.js** for HTTP security headers
- `.env` file excluded from git

---

## 👨‍💻 Developer

**Himanshu Sunil Patil**
- GitHub: [@Himanshu27176](https://github.com/Himanshu27176)

---

## 📄 License

This project is for educational purposes.