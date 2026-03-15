# 🌐 LinguaBot — Multilingual AI Chatbot

A full-stack multilingual chatbot supporting 16+ languages powered by Claude AI.

---

## 📁 Project Structure

```
multilingual-chatbot/
├── frontend/
│   ├── index.html          ← Main page (open this in browser)
│   ├── css/style.css
│   └── js/app.js
├── backend/
│   ├── server.js           ← Express server
│   ├── db.js               ← MySQL connection
│   ├── .env                ← Config (edit this!)
│   ├── package.json
│   ├── routes/
│   │   ├── auth.js         ← Register / Login
│   │   └── chat.js         ← Chat + Translate
│   └── middleware/
│       └── auth.js         ← JWT guard
└── database/
    └── schema.sql          ← Run this in MySQL first
```

---

## ⚡ Quick Setup (Step by Step)

### Step 1 — MySQL Database

Open CMD or MySQL Workbench and run:

```sql
mysql -u root -p < database/schema.sql
```

Or paste the contents of `database/schema.sql` directly into MySQL Workbench and execute.

This creates the `multilingual_chatbot` database with all tables.

---

### Step 2 — Configure Backend

Open `backend/.env` and fill in:

```env
DB_PASSWORD=your_mysql_root_password
JWT_SECRET=any_long_random_string_here
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxx
```

Get your Anthropic API key from: https://console.anthropic.com

---

### Step 3 — Install Backend Dependencies

Open terminal in the `backend/` folder:

```bash
cd backend
npm install
```

---

### Step 4 — Start the Backend Server

```bash
npm run dev       # Development (auto-restart)
# or
npm start         # Production
```

You should see:
```
✅  MySQL connected successfully
🚀  Server running on http://localhost:5000
```

---

### Step 5 — Open the Frontend

**Option A — VS Code Live Server (Recommended)**
1. Open the project folder in VS Code
2. Install the "Live Server" extension
3. Right-click `frontend/index.html` → "Open with Live Server"
4. It opens at `http://127.0.0.1:5500`

**Option B — Direct file open**
- Just double-click `frontend/index.html`
- Note: change `CORS_ORIGIN=null` in `.env` if using file://

---

## 🔑 Demo Account

```
Email:    demo@chatbot.com
Password: Demo@1234
```

---

## 🌍 Supported Languages

| Code | Language   | Code | Language  |
|------|-----------|------|-----------|
| en   | English   | ar   | Arabic    |
| hi   | Hindi     | ja   | Japanese  |
| mr   | Marathi   | pt   | Portuguese|
| es   | Spanish   | ru   | Russian   |
| fr   | French    | bn   | Bengali   |
| de   | German    | ur   | Urdu      |
| zh   | Chinese   | ta   | Tamil     |
| ko   | Korean    | te   | Telugu    |

---

## 🛠️ Features

- ✅ User Registration with live validation
- ✅ Secure Login with JWT tokens
- ✅ Password strength indicator
- ✅ 16+ language chatbot powered by Claude AI
- ✅ Language switcher in sidebar
- ✅ Chat history saved to MySQL
- ✅ Multiple chat sessions
- ✅ Quick Translate tool
- ✅ Mobile responsive design
- ✅ Rate limiting & security headers

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| MySQL connection failed | Check DB_PASSWORD in .env |
| 502 AI service error | Check ANTHROPIC_API_KEY in .env |
| CORS error | Make sure backend is running on port 5000 |
| Login not working | Make sure you ran schema.sql |

---

## 📦 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JS
- **Backend**: Node.js, Express.js
- **Database**: MySQL (mysql2)
- **AI**: Anthropic Claude API
- **Auth**: JWT + bcrypt
- **Security**: Helmet, CORS, Rate Limiting
