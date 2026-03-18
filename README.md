# 🔮 Jellopy Strategist (Media Coworker)

**Jellopy** is an AI-powered Google Ads strategist designed to automate the heavy lifting of media management. It connects directly to your Google Ads accounts, analyzes performance metrics daily, and generates actionable, executive-ready insights using Large Language Models (Gemini/OpenAI).

## 🚀 Product Overview

Jellopy transforms raw Google Ads data into strategic narratives. Instead of digging through spreadsheets, media buyers and agency owners get a daily "Pulse" on their accounts, ready-to-send client updates, and proactive budget recommendations.

### Key Features

*   **🔗 Seamless Google Ads Integration**: Secure OAuth2 connection supporting both individual Client accounts and complex Manager (MCC) hierarchies.
*   **🤖 AI-Driven Analysis**: Utilizes Google Gemini and OpenAI to interpret performance trends, identify "winners and losers," and suggest optimizations.
*   **automations Daily Automation**: Automated Vercel Cron jobs sync metrics every night and generate a fresh batch of reports.
*   **📄 Executive Output Suite**:
    *   **The Pulse**: A high-level internal summary of what happened yesterday.
    *   **Budget Adjust**: Proactive suggestions on where to scale or pull back.
    *   **Client Update**: Polished, professional summaries formatted for immediate sharing.
    *   **Strategic Optimizer**: Deep-dive AI analysis of campaign structures and long-term trends.
*   **💎 Workspace Management**: Built-in support for Free and Pro tiers with configurable data retention.
*   **🔒 Enterprise Security**: AES-256-GCM encryption for refresh tokens, aggregate-only metric storage, and secure identity management via Clerk.

---

## 🛠 Tech Stack

*   **Framework**: [Next.js 14](https://nextjs.org/) (App Router, Server Components)
*   **Authentication**: [Clerk](https://clerk.com/)
*   **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
*   **AI Engines**: [Google Gemini](https://ai.google.dev/) & [OpenAI GPT-4](https://openai.com/)
*   **API**: Google Ads API (REST v23)
*   **Styling**: Tailwind CSS + Vanilla CSS for custom components
*   **Deployment**: Vercel

---

## 📦 Getting Started

### Prerequisites

*   Node.js 20+
*   A Google Cloud Project with the **Google Ads API** enabled.
*   A Google Ads **Developer Token**.
*   A Clerk account for authentication.
*   A Supabase project.

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-repo/media-coworker.git
    cd media-coworker
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Variables**:
    Create a `.env.local` file in the root and fill in the following:

    ```env
    # Clerk Auth
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
    CLERK_SECRET_KEY=

    # Database (Supabase)
    SUPABASE_URL=
    SUPABASE_SERVICE_ROLE_KEY=

    # Google OAuth
    GOOGLE_OAUTH_CLIENT_ID=
    GOOGLE_OAUTH_CLIENT_SECRET=
    GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/google/callback
    GOOGLE_ADS_DEVELOPER_TOKEN=

    # AI Providers
    GOOGLE_GENERATIVE_AI_API_KEY=
    OPENAI_API_KEY=

    # Encryption (32-byte hex string)
    TOKEN_ENC_KEY=
    ```

4.  **Database Setup**:
    Run the contents of `schema.sql` and the files in `migrations/` in your Supabase SQL Editor to set up the necessary tables and RLS policies.

5.  **Run the development server**:
    ```bash
    npm run dev
    ```

---

## 🏗 Project Structure

*   `/app`: Next.js 14 App Router (Routes, APIs, and Layouts).
*   `/components`: Reusable UI components.
*   `/lib`: Core business logic.
    *   `googleAds.ts`: REST client for Google Ads API.
    *   `ai.ts` & `gemini.ts`: AI orchestration.
    *   `jobRunner.ts`: Orchestrates the daily sync process.
    *   `outputGen.ts`: Prompt engineering and report formatting.
    *   `db.ts`: Data access layer for Supabase.
*   `/migrations`: SQL migration files for database versioning.

---

## 🛡 Security Note

This application handles sensitive OAuth tokens. Ensure that `TOKEN_ENC_KEY` is kept secret and rotated regularly. The application uses AES-256-GCM to ensure that even if the database is compromised, your Google Ads refresh tokens remain encrypted at rest.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
