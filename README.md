# PrepDesk — IIM CAT 2027 Preparation Platform

PrepDesk is a production-grade, full-stack learning and cohort management platform engineered for competitive exam aspirants and faculty mentors. It delivers structured sectional curricula (VARC, DILR, QA), real-time class assignments, an interactive lexical vocabulary engine powered by Google Gemini AI, secure timed diagnostic drills, and student-isolated tracking.

---

## Key Features

- **Multi-Role Workspace**: Dedicated dashboards for Faculty Administrators and Students with strict zero-trust role segregation.
- **Two-Factor Authentication (2FA)**: Email OTP verification for student logins and self-service password resets via SMTP / Resend.
- **Bcrypt Password Security**: Zero plaintext passwords stored or logged. All credentials hashed using bcrypt ($2a$12 rounds).
- **Session Authentication**: Server-managed session authentication using HttpOnly, SameSite, signed cookies and Bearer token headers.
- **IDOR Protection**: Strict authorization enforcement ensures students can only access, modify, or delete their own tasks, assignments, and submissions.
- **VARC Lexical Engine**: 3-tier dictionary and Gemini AI vocabulary engine for context sentences, etymology, and distractors.
- **Timed Test Drills & Protected Keys**: Server-side test evaluation where answer keys are registered in memory or server constants and never leaked to the client bundle.
- **Secure File Attachments**: Admin-only PDF upload validation verifying MIME type, `%PDF-` magic bytes, 15MB size limit, and path traversal protection.
- **Real-Time Synchronization**: Durable JSON persistence engine with ACID transactions, atomic write-renames, and Server-Sent Events (SSE) broadcasting.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend**: Node.js, Express, Helmet, Cookie-Parser, Nodemailer, @google/genai
- **Security**: Bcrypt.js, HttpOnly Sessions, Rate Limiting, MIME / Magic Byte Validation
- **Hosting**: Render (Web Service), Docker-ready

---

## Environment Variables

Copy `.env.example` to `.env` and configure your credentials:

```bash
cp .env.example .env
```

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP server port | `3000` |
| `NODE_ENV` | Environment mode (`development` or `production`) | `production` |
| `APP_URL` | Application root URL for email links and CORS | `https://catdesk.online` |
| `ADMIN_INITIAL_PASSWORD` | Initial password for admin on first database creation | *Random on boot if unset* |
| `SESSION_SECRET` | Secret key for signing session tokens | *64+ hex characters* |
| `GEMINI_API_KEY` | Google Gemini API key for AI features | *Google AI Studio key* |
| `SMTP_HOST` | Primary SMTP host for OTP delivery | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (`587` for TLS / `465` for SSL) | `587` |
| `SMTP_USERNAME` | SMTP authentication username / email | `admin@domain.com` |
| `SMTP_PASSWORD` | SMTP authentication password or App Password | `app_password` |
| `SMTP_FROM` | Sender display string | `"PrepDesk Security" <no-reply@domain.com>` |
| `RESEND_API_KEY` | Fallback Resend email API key | `re_...` |

---

## Local Development

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Ensure `.env` exists with valid configuration.

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`.

4. **Production Build**:
   ```bash
   npm run build
   npm start
   ```

---

## Security Audit & Hardening Checklist

- [x] Zero hardcoded passwords or backdoor credentials in codebase or git history.
- [x] Bcrypt password hashing (`$2a$12$...`) with zero plaintext storage and zero password leakage in API responses.
- [x] HttpOnly, SameSite server session cookies with Bearer token fallback.
- [x] Strict IDOR guards preventing student access to other student data.
- [x] Rate limiting on authentication (5 req/15 min) and Gemini AI (30 req/min).
- [x] Generic authentication error messages (`Invalid credentials.`) to prevent enumeration.
- [x] OTP codes masked from console and server logs.
- [x] PDF uploads restricted to Admins, verified by `%PDF-` magic bytes and MIME validation, capped at 15MB.
- [x] Gemini proxy secured with 4000-character input limits, model whitelisting, and authentication.
- [x] Test answer keys evaluated server-side and never leaked in client bundles.

