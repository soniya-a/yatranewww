# 🎯 Yatranew AI: VR-Based Interview Training & Career Recommendation Platform

Welcome to **Yatranew AI**, the state-of-the-art enterprise-grade mock-interview simulation, coaching, and career guidance platform designed specifically for top engineering colleges across India. Built natively for desktop, mobile, and WebXR-ready VR headsets, Yatranew AI bridges the gap between classroom education and high-stakes software engineering job requirements.

It features **Naya**, the world's most advanced AI interview coach and career mentor.

---

## 🤖 Meet Naya (Your AI Interview Coach)

Naya acts as your primary evaluator and mentor throughout the Yatranew platform. Built around a strictly enforced AI persona:
- **Professional, Warm, Encouraging, Sharp:** Naya speaks like a senior Google or Microsoft employee who genuinely wants the student to succeed.
- **Brutally Honest & Constructive:** While encouraging, Naya provides rigorous, realistic feedback on technical depth and communication skills.
- **Company-Specific Targeting:** Naya dynamically adapts her interview style to match the exact mechanics of whichever company is specified (e.g., Google's focus on algorithmic scaling, Microsoft's focus on system architecture).
- **A Dream-Job Standard:** Naya treats every candidate as if they are preparing for their ultimate dream role.

---

## 🛠 Tech Stack & Ecosystem

```text
   ┌────────────────────────────────────────────────────────────────────────┐
   │                          BROWSER / CLIENT VIEW                         │
   │                                                                        │
   │   ┌────────────────────┐    ┌────────────────────┐    ┌────────────┐   │
   │   │     React Pages    │    │   WebXR Assembly   │    │  Doc/JSON  │   │
   │   │  (Home, Dashboard, │    │  (A-Frame Board-   │    │  Roadmap   │   │
   │   │  Roadmap, Reports) │    │  room Simulation)  │    │   Viewer   │   │
   │   └─────────┬──────────┘    └─────────┬──────────┘    └──────┬─────┘   │
   │             │                         │                      │         │
   └─────────────┼─────────────────────────┼──────────────────────┼─────────┘
                 │                         │                      │
                 └─────────────────────────┼──────────────────────┘
                                           ▼ (JSON REST APIs + Auth Tokens)
   ┌────────────────────────────────────────────────────────────────────────┐
   │                        NODE.JS EXPRESS SERVER ENTRY                    │
   │                                                                        │
   │   ┌───────────────────────┐  ┌────────────────────┐  ┌─────────────┐   │
   │   │    GoogleGenAI SDK    │  │  Firebase Auth/Admin│  │  Error/Rate │   │
   │   │     (Gemini API)      │  │   Verification     │  │   Limiters  │   │
   │   └───────────┬───────────┘  └─────────┬──────────┘  └─────────────┘   │
   └───────────────┼────────────────────────┼───────────────────────────────┘
                   │                        │
                   ▼ (HTTPS Secure calls)   ▼ (Zero-Trust Rules)
   ┌───────────────────────────────┐   ┌───────────────────────────┐
   │  ✨ Gemini 3.5 Pro AI Engine  │   │ 🔥 Google Cloud Firestore │
   │   - Resume Parsing Fallback   │   │  - Persistent Records     │
   │   - Adaptive Quest Generator  │   │  - Privacy-Secured (PII)  │
   │   - Audio Answer Evaluation   │   └───────────────────────────┘
   └───────────────────────────────┘
```

The system implements a secure, highly modular multi-tier full-stack architecture:

1. **Frontend Core (Single-Page App)**
   - **Framework:** React 19 + TypeScript + React Router Dom (v7).
   - **Design UI & Style:** Tailwind CSS v4, `motion/react` layout animations, and an interactive **Three.js** global map background.
   - **Immersive View:** A-Frame custom integrations for WebXR virtual environments, featuring interactive spatial telemetry and immersive audio design.

2. **Backend Engine (Custom Node.js Server)**
   - **Framework:** Node.js Express platform routing secure requests from `/api/*`.
   - **Static Compilation:** ESBuild server pipeline producing a robust, bundled runtime entry point (`dist/server.cjs`).
   - **Graceful Fallbacks Layer:** Custom token matching algorithms integrated with resume categories to protect against external rate limits and ensure offline resilience.

3. **Database and Identity**
   - **Authentication:** Firebase Auth integration (Google OAuth).
   - **Data Layer:** Google Cloud Firestore storing structured interview session logs, user profiles, and adaptive goals securely.

---

## 🧭 Dynamic Methodology

Yatranew AI applies an iterative, data-driven methodology tailored to career prep:

* **EVALUATION ENGINE:**
  Generates questions and feedback strictly through structural JSON parsing using the Gemini API. In the event of latency or rate limiting, the platform routes instantly to a high-grade local question bank so the student's flow is never interrupted.
* **IMMERSIVE EXPERIENCES (WebXR):**
  Uses spatial distance modeling and responsive audio to simulate pressure-inducing corporate conference rooms where candidate performance is tested in a real situational context.
* **COACHING LOOP:**
  Combines standard tech rating criteria (Structuring, Clarity, Core Relevancy) with real-world soft skill checks to formulate highly actionable, positive mentoring checklists directly from Naya.

---

## 🚀 Local Development & Environment Setup

All APIs run strictly on the server-side to guarantee client protection. 

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Configuration (`.env`):**
   ```env
   # Port 3000 is externally bound by the reverse proxy
   PORT=3000
   
   # Required for Naya's core evaluation engine
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *Firebase Web Config keys are handled securely via `firebase-applet-config.json`.*

3. **Run Application in Development Mode:**
   ```bash
   npm run dev
   ```
   *Boots both the Vite client server and the Express API, bound to port 3000.*

4. **Compile for Production:**
   ```bash
   npm run build
   npm start
   ```

---

## 📈 Resiliency & Fallback Systems

To ensure robust deployment under high load across college networks:
- **Resilient Fallback Middleware:** All parsing, content generation, and chatbot requests utilize an intelligent JSON-parsing pipeline and exponential backoff wrappers (`retryWithBackoff`) that gracefully revert to local question banks upon API quotas.
- **Data Integrity Strictness:** When querying for structured intelligence, the AI enforces JSON responses strictly.
- **Production Safety:** Tested to verify clean type generation (`tsc --noEmit`) to maintain stability for concurrent access.
