# AI Resume builder 🚀

**AI Resume builder** is a premium, AI-powered resume builder designed to help you create ATS-optimized resumes with ease. Featuring advanced AI parsing, a conversational guided builder, and professional multi-page PDF exporting, it’s the ultimate tool for modern job seekers.

## ✨ Key Features

-   **Multi-format AI Parsing**: Instantly extract data from PDF, DOCX, TXT, and Images (scans/screenshots) with high accuracy.
-   **Guided AI Resume Builder**: Create your resume through a conversational interface that asks the right questions.
-   **ATS Score & AI Review**: Get a real-time keyword match score and detailed AI feedback on how to improve your resume.
-   **Apply with AI**: Automatically optimize your resume for specific job descriptions with one click.
-   **Premium PDF Export**: Generate professional, multi-page PDFs with consistent margins and no browser artifacts.
-   **Theme Studio**: Choose from curated themes like *Classic*, *Executive*, *Modern*, and *Minimal*.
-   **Local & Cloud AI**: Support for Google Gemini (Cloud) and Ollama (Local/Cloud) for privacy and flexibility.
-   **Android Support**: Built-in Capacitor support for running as a native Android application.

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18+)
-   [npm](https://www.npmjs.com/)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-repo/ai-resume-builder.git
    cd ai-resume-builder
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the development server:
    ```bash
    npm run dev
    ```

### Mobile Development (Android)

AI Resume builder uses Capacitor for Android support:

-   **Sync**: `npm run android:sync`
-   **Open in Studio**: `npm run android:open`
-   **Run on Device**: `npm run android:run`
-   **Build APK**: `npm run android:apk`

## 🤖 AI Configuration

Open **Settings** in the app header to configure your AI providers.

### Supported Providers

-   **Google Gemini**: Recommended for the best parsing and optimization results.
-   **Ollama**: Support for local LLMs via the Ollama Bridge or direct Cloud API access.

#### Ollama Setup
1.  Run your local Ollama instance.
2.  Set the Base URL to `http://localhost:11434`.
3.  Choose your text and vision models in the Settings.

## 🛠️ Product Workflow

1.  **Import**: Upload an existing resume (PDF, DOCX, Image) or start fresh.
2.  **Clean & Structure**: Use AI cleanup to fix OCR issues and normalize data.
3.  **Guided Build**: Chat with the Resume Assistant to add details or polish sections.
4.  **Optimize**: Paste a Job Description and let the AI tailor your resume for a >80% ATS score.
5.  **Review**: Check the ATS Match score and implement "Apply with AI" suggestions.
6.  **Export**: Download your professional resume as a multi-page PDF.

## 📁 Technical Architecture

-   **Frontend**: React + Vite + Vanilla CSS
-   **Mobile**: Capacitor (Android)
-   **AI Integration**: Gemini 2.5 Flash, Ollama
-   **Libraries**: `html2pdf.js` (Export), `pdfjs-dist` (PDF Parsing), `mammoth` (DOCX Parsing)

### Main Components
-   [src/App.jsx](./src/App.jsx) - Main Entry
-   [src/components/ResumeChat/ResumeChat.jsx](./src/components/ResumeChat/ResumeChat.jsx) - Guided AI Builder
-   [src/components/Editor/Editor.jsx](./src/components/Editor/Editor.jsx) - Resume Content Management
-   [src/components/Preview/Preview.jsx](./src/components/Preview/Preview.jsx) - Live Rendering Engine
-   [src/utils/aiParser.js](./src/utils/aiParser.js) - AI Logic & Prompts

---

*Built with ❤️ for job seekers everywhere.*
