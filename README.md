# AI Recruiter Evaluation

An automated technical screening tool built on Cloudflare Workers and Durable Objects. It uses Llama 3.1 to analyze job descriptions, and generate candidate scorecards and openai whisper to transcribe interview recordings to text.

## Workflow

1. **Job Description Analysis**: User submits a JD for analysis by Llama 3.1.
2. **Question Generation**: The system generates 5 questions (2 technical, 3 behavioral) based on the JD.
3. **Voice Interview**: Candidates record audio responses for each question. Audio is transcribed using the Whisper model.
4. **Scoring**: Responses are evaluated against the JD to generate a report with a 1-10 mark and feedback.

## Tech Stack

- **Frontend**: React + tailwind
- **Backend**: Cloudflare Workers & Durable Objects
- **AI Models**: Llama 3.1 (text) and Whisper (speech-to-text) via Cloudflare Workers AI
- **SDKs**: @cloudflare/ai-chat

## Project Structure

- [src/server.ts](src/server.ts): Agent logic, state management, and evaluation.
- [src/app.tsx](src/app.tsx): Main application and phase orchestration.
- [src/features/](src/features/): Interview room and recruiter UI components.

## Development

1. **Install dependencies**: `npm install`
2. **set up variables in.dev.vars**: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
2. **Run locally**: `npm run start`
