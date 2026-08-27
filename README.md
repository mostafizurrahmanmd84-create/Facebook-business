# Nova AI Chatbot

A modern AI chat web application built with React, Vite, Tailwind CSS, and an Express backend using the Groq API.

## Features
- Premium ChatGPT-style UI
- Dark mode by default
- Sidebar with chat history and actions
- Markdown and code rendering
- Copy message/code actions
- Groq API integration with server-side API key storage
- Local storage persistence
- Responsive layout for desktop, tablet, and mobile
- Server-side Google Sheets FAQ and mobile product knowledge sources
- Per-conversation memory, handoff/HUMAN_MODE state, and unanswered-question review endpoints

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy the environment file and add your Groq API key:
   ```bash
   cp .env.example .env
   ```
3. Start the backend:
   ```bash
   npm run server
   ```
4. Start the frontend:
   ```bash
   npm run dev
   ```

For Render, use a single Web Service with build command `npm install && npm run build` and start command `npm run server`. The backend serves the production frontend from `frontend/dist`; set `PORT` from Render automatically and add the remaining values from `.env.example` as Render environment variables.

For Google Sheets, configure the spreadsheet IDs and existing Google credentials in `.env`. Share private spreadsheets with the configured service-account email. Set `INGEST_KEY` to protect the `/api/admin/*` endpoints used by the admin dashboard. `ADMIN_TOKEN` remains supported for backward compatibility. These state and feedback stores are in memory and reset when the backend restarts.

## Project Structure
- frontend/
- backend/
# AI-assistant
