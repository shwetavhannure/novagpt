# NovaGPT – AI-Powered MERN Chat Platform

NovaGPT is a full-stack AI conversational platform built using the MERN stack and powered by Groq API. It provides intelligent conversations, multiple AI models, secure authentication, email verification, and efficient chat management through a responsive interface.

## 🚀 Key Features

- **AI-Powered Conversations:** Real-time AI responses using Groq API.
- **Multiple AI Models:** Switch between three Groq models based on response speed, intelligence, and safety requirements.
- **User Authentication:** Secure registration, login, Google OAuth, and JWT-based authentication.
- **Email Verification:** Six-digit OTP verification with email validation, 10-minute expiry, maximum 5 attempts, and 30-second resend cooldown.
- **Account Activation:** Unverified accounts remain pending and cannot log in.
- **Chat Management:** Create, manage, and delete conversation threads.
- **Dynamic Chat Titles:** Automatically generates contextual titles for conversations.
- **Usage Tracking:** Session-based limit of 20 prompts with quota tracking.
- **Password Recovery:** Secure password-reset functionality through email.

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, CSS, Vite |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| AI Integration | Groq API |
| Authentication | JWT, Google OAuth |
| Email Services | Resend / SMTP |
| API Communication | REST API |

## 🤖 Supported AI Models

- `openai/gpt-oss-20b` – Default model for fast responses.
- `openai/gpt-oss-120b` – Advanced model for complex queries.
- `openai/gpt-oss-safeguard-20b` – Safety-focused model.

## ⚙️ Installation & Setup

**1. Clone the repository**
```bash
git clone <your-repository-url>
cd NovaGPT
```

**2. Install backend dependencies**
```bash
cd Backend
npm install
```

**3. Configure environment variables**

Create a `.env` file inside the Backend directory:
```env
PORT=5001
MONGO_URI=
GROQ_API_KEY=
JWT_SECRET_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
RESEND_API_KEY=
SMTP_USER=
SMTP_PASS=
```

Add the required credentials before starting the application.

**4. Start the backend**
```bash
npm run dev
```

**5. Install and start frontend**

Open another terminal:
```bash
cd Frontend
npm install
npm run dev
```

**6. Access the application**
```text
http://localhost:5174
```

Ensure MongoDB is running locally before starting the backend.

## 👩‍💻 Developer

**Shweta Vhannure**
