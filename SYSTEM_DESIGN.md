# NeuroView AI - System Architecture & AI Prompts

This document contains the complete system prompt templates, JSON schemas, structural flows, and database designs required to build the full "NeuroView AI" platform locally (in VS Code) and scale it into a robust product.

## 1. Core Database Schema (e.g., PostgreSQL / Prisma or Firestore)

### Users / Candidates
- `id`: String (UUID)
- `name`: String
- `email`: String (Unique)
- `university`: String
- `graduation_year`: Integer
- `base_resume_text`: Text
- `skills`: String[]
- `created_at`: Timestamp

### Companies
- `id`: String (UUID)
- `name`: String
- `domain`: String (Software, AI/ML, VLSI/RTL, Embedded, Civil, Mechanical, Architecture, Data Science)
- `logo_url`: String
- `careers_url`: String
- `hiring_level`: String (Intern, Fresher, Junior)
- `interview_style`: String (e.g., DSA Heavy, Project Heavy, Aptitude First)

### Roles
- `id`: String (UUID)
- `title`: String
- `domain`: String
- `required_skills`: String[]

### Interviews (Simulations)
- `id`: String (UUID)
- `user_id`: String (Foreign Key)
- `company_id`: String (Foreign Key)
- `role_id`: String (Foreign Key)
- `round`: String (Aptitude, HR, Technical, GD, Self-Intro/Project)
- `score`: Integer
- `feedback`: Text
- `status`: String (InProgress, Completed)
- `created_at`: Timestamp

### Transcripts (Q&A logs)
- `id`: String (UUID)
- `interview_id`: String (Foreign Key)
- `question_text`: Text
- `user_audio_url`: String
- `user_transcript`: Text
- `ai_feedback`: Text
- `timestamp`: Timestamp

### Roadmaps
- `id`: String (UUID)
- `user_id`: String (Foreign Key)
- `role`: String
- `skills_to_learn`: String[]
- `timeline_30d`: JSON
- `timeline_90d`: JSON
- `timeline_6m`: JSON
- `created_at`: Timestamp

---

## 2. Gemini AI Prompt Chains & JSON Schemas

### Prompt 1: Resume Parser & Matcher
**System Prompt:**
```text
You are an expert AI Resume Analyzer for college students in India.
Task:
Given the following resume content, extract technical skills, detect the ideal roles (from a 50+ role pool), and recommend EXACTLY 4 highly matched companies out of the top 50 Indian tech/startup ecosystem, filtering by domain. Provide a matchmaking reason.

Output must strictly adhere to the defined JSON schema. No markdown wrapping.
```
**JSON Schema:**
```json
{
  "type": "object",
  "properties": {
    "extracted_skills": { "type": "array", "items": { "type": "string" } },
    "ideal_roles": { "type": "array", "items": { "type": "string" } },
    "company_matches": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "company_name": { "type": "string" },
          "domain": { "type": "string" },
          "match_score": { "type": "integer" },
          "logo_search_term": { "type": "string" },
          "careers_link": { "type": "string", "format": "uri" },
          "match_reason": { "type": "string" }
        },
        "required": ["company_name", "domain", "match_score", "match_reason", "logo_search_term"]
      }
    }
  },
  "required": ["extracted_skills", "ideal_roles", "company_matches"]
}
```

### Prompt 2: VR Interview Engine Generator (Round Questions)
**System Prompt:**
```text
You are the NeuroView Mock Interview Engine. Generate a structured interview loop for a candidate applying for {ROLE} at {COMPANY}.
Generate 8 dynamic questions for the following round type: {ROUND_TYPE} (e.g., Technical, HR, Aptitude, GD, Project).
Include targeted follow-up logic and expected answer points for the AI evaluator to grade against.
```
**JSON Schema:**
```json
{
  "type": "object",
  "properties": {
    "round_type": { "type": "string" },
    "questions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "question_text": { "type": "string" },
          "follow_up_prompt": { "type": "string" },
          "expected_answer_points": { "type": "array", "items": { "type": "string" } },
          "difficulty": { "type": "string", "enum": ["Easy", "Medium", "Hard"] },
          "time_limit_seconds": { "type": "integer" }
        },
        "required": ["question_text", "follow_up_prompt", "expected_answer_points", "time_limit_seconds"]
      }
    }
  },
  "required": ["round_type", "questions"]
}
```

### Prompt 3: Dynamic Roadmap Generator
**System Prompt:**
```text
You are an AI Career Roadmap Planner. Given the target role "{ROLE}" and the user's current skill gaps "{SKILL_GAPS}", generate a dynamic, highly actionable learning roadmap based on 30-day, 90-day, and 6-month tracks. Suggest highly accessible courses and projects.
```
**JSON Schema:**
```json
{
  "type": "object",
  "properties": {
    "role": { "type": "string" },
    "skill_gaps": { "type": "array", "items": { "type": "string" } },
    "readiness_score_update": { "type": "integer" },
    "courses": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": { "type": "string" },
          "platform": { "type": "string" },
          "url": { "type": "string" }
        }
      }
    },
    "project_ideas": { "type": "array", "items": { "type": "string" } },
    "timeline": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "track": { "type": "string", "enum": ["30-day", "90-day", "6-month"] },
          "focus": { "type": "string" },
          "milestones": { "type": "array", "items": { "type": "string" } }
        },
        "required": ["track", "focus", "milestones"]
      }
    }
  },
  "required": ["role", "timeline", "courses", "project_ideas"]
}
```

---

## 3. Supported Data Lists (50+ Setup)

### Target 50+ Roles (Examples by Domain)
- **Software**: Full Stack Developer, Frontend Engineer, Backend Engineer, SRE, DevOps, iOS Developer, Android Developer, Cloud Architect, QA Engineer, Security Analyst...
- **AI/ML & Data**: ML Engineer, Data Scientist, Data Analyst, NLP Researcher, Computer Vision Engineer, Prompt Engineer, BI Developer, Data Engineer...
- **Core Engineering (VLSI/Embedded)**: RTL Verification Engineer, Analog Design Engineer, Embedded C Developer, IoT Solutions Architect, Firmware Engineer...
- **Mechanical/Civil/Arch**: AutoCAD Draftsman, Structural Engineer, HVAC Design Engineer, Thermal Analyst, Urban Planner...

### Target 50+ Companies
- **Product Giants**: Google, Microsoft, Amazon, Atlassian, Adobe, Intuit, Uber, Rubrik.
- **Indian Startups/Unicorns**: Razorpay, Cred, Swiggy, Zomato, Flipkart, Ola, Paytm, Groww, Zerodha, Postman.
- **Service & Consulting**: TCS, Infosys, Wipro, Accenture, Cognizant, Capgemini.
- **Hardware/Core**: NVIDIA, Intel, AMD, Qualcomm, Texas Instruments, Bosch, L&T Technology Services, Siemens.
- **Finance/Quant**: Tower Research, DE Shaw, JP Morgan, Goldman Sachs.

---

## 4. VR Interview Flow Strategy

**Architecture:**
- Use **WebXR / A-Frame** or Unity WebGL for the VR component.
- Keep the logic strictly driven by an external REST/GraphQL API.

**The Loop:**
1. User enters VR scene, presses "Start Round" button in 3D UI.
2. App fetches generated sequence (e.g., 8 questions).
3. **Timer Starts.** AI Avatar animates / speaks Question 1 (via TTS).
4. User speaks response (Microphone recorded -> Whisper/STT parsing).
5. Frontend hits `/api/evaluate` with the transcript.
6. Gemini responds with a follow-up OR grades the answer and transitions to Question 2.
7. Final question completes -> "Session Finished". Final comprehensive metrics generated.

---

## 5. UI Application Flow (Website Structure)

1. **Landing & Auth**: Marketing page, Institution sign-in, Student sign-in.
2. **Dashboard**: Profile stats, recent interview scores, current readiness indicator.
3. **Step 1: Resume Upload**: PDF Drag & Drop -> Triggers extraction pipeline -> returns structured parsed data & inferred domains.
4. **Step 2: Match Engine**: Presents 30+ tailored roles. User selects Target Role and Target Company.
5. **Step 3: Roadmap Generation**: Renders the 30/90/6M dynamic tracker based on selected role.
6. **Step 4: Interview Setup**: Select Round Type (Aptitude, HR, Tech, GD).
7. **Step 5: VR Room (or Browser Room)**: The interactive 3D Web interface with WebSpeech or actual VR Headset support.
8. **Step 6: Coach/Student Feedback Reports**: Detailed analytics view for trainers and students.
