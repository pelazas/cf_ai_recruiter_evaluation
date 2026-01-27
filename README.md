# AI Auto-Recruiter
Optional assignment for Cloudflare Software Engineer Internship

This project demonstrates a functional "Vertical Slice" of an AI application. It is an automated hiring assistant that generates technical questions based on a Job Description, captures audio responses, and asynchronously evaluates the candidate's fit.

## Project Scope

### Phase 1: Setup
- User submits a Job Description (JD).
- System uses Workers AI (Llama 3.3) to generate 5 fixed technical questions.
- Questions are stored in a Durable Object.

### Phase 2: Interview Loop
- User iterates through questions 1–5.
- Action: Record Audio → Upload → Transcribe (Whisper) → Save Text to State.
- State is persisted in the Durable Object to ensure session consistency.

### Phase 3: Analysis
- Once Question 5 is saved, a Workflow is triggered.
- The Workflow performs a long-running analysis of the full transcript to generate a "Hiring Scorecard."

## Tech Stack
- Interface: HTML5 / MediaRecorder (Static assets served via Worker)
- AI: Workers AI (Llama 3.3 & Whisper)
- State: Durable Objects (Session Management)
- Coordination: Workflows (Async Reporting)
