# ResumePro Builder

AI-powered resume builder with image parsing, guided editing, ATS review, theme switching, and direct PDF export.

## Current Feature Set

- AI image import for resume screenshots or scans
- AI cleanup pass for parsed resumes with safer non-destructive merging
- Resume chat assistant for targeted edits
- ATS keyword score plus AI ATS review
- `Apply with AI` for ATS recommendations
- Revert and alternative AI optimization flow
- Multiple resume themes
- Ollama Cloud / Local Bridge support
- Gemini support
- Direct client-side PDF export using the current preview

## Local Development

Install dependencies:

```powershell
npm install
```

Start the app:

```powershell
npm run dev
```

Build for production:

```powershell
npm run build
```

## AI Provider Setup

Open `Settings` in the app header.

Supported providers:

- `Google Gemini`
- `Ollama Cloud`

### Ollama Modes

- `Local Bridge (Recommended)`
- `Direct Cloud API`

For local bridge:

1. Run your local Ollama instance.
2. Use base URL `http://localhost:11434`.
3. If you want cloud-backed Ollama models through the local app, sign in with:

```powershell
ollama signin
```

### Ollama Models

Settings supports:

- preset text model selection
- preset vision model selection
- custom text model override
- custom vision model override
- reset to recommended models
- test Ollama connection

## Product Workflow

### 1. Import Resume

Use `Auto-Fill from Image (AI)` to parse a resume image into editable fields.

Supported import behavior:

- personal info extraction
- experience parsing
- education parsing
- projects parsing
- skills extraction
- experience-level metadata extraction such as:
  - `Project`
  - `Client`
  - `Testing Platform`

### 2. Clean Parsed Resume

If OCR merges lines or sections badly, use `Clean Up Parsed Resume with AI`.

Current cleanup behavior:

- restructures merged lines
- improves bullet formatting
- moves labeled experience details into structured fields
- preserves original data through a safe merge
- keeps existing skills if the AI returns them in the wrong shape

Important:

- cleanup is intended to reorganize existing data, not invent new data
- it should no longer wipe skills or drop entries when the AI response is incomplete

### 3. Edit Resume

Use the editor to update:

- personal info
- experience
- education
- skills
- projects

Experience entries now support:

- role
- company
- start date
- end date
- project name
- client
- testing platform
- bullet-style description

### 4. Use Resume Chat

The `Resume Assistant` chat can update the resume directly.

Current chat behavior includes:

- updating specific sections from plain language
- appending new work details to the most relevant experience
- extending the latest role to `Present` when the user indicates they are still working there
- preserving untouched sections

### 5. Run ATS Review

ATS tooling includes two layers:

- instant keyword compatibility score
- `AI ATS Review`

AI ATS review returns:

- summary
- score estimate
- strengths
- gaps
- recommended fixes

Each ATS recommendation supports `Apply with AI`, which:

- updates the resume
- refreshes the AI ATS review
- refreshes the visible AI ATS score

### 6. Optimize Resume

Paste a job description and use:

- `Auto-Optimize for this Job`
- `Alternative`
- `Revert`

This flow keeps an AI snapshot so generated edits can be rolled back.

### 7. Choose a Theme

Available themes:

- `Classic`
- `Executive`
- `Modern`
- `Minimal`

Theme selection persists in local storage.

### 8. Export PDF

`Export PDF` now uses direct client-side PDF generation instead of browser-only `window.print()`.

Current export behavior:

- exports the live resume preview
- avoids browser timestamp/header/footer artifacts
- preserves the current theme
- loads the PDF library only when export is requested

## Parsing and Preview Behavior

### Experience Metadata Highlighting

When experience includes project metadata, the preview highlights it above the role details:

- `Project`
- `Client`
- `Platform`

This is useful for QA, automation, consulting, and client-facing resume formats.

### Nested Projects

Projects can be:

- standalone, or
- attached to a specific experience entry

Attached projects appear inside the related experience block in the preview.

### Bullet Handling

The preview currently:

- removes obvious duplicate bullet lines
- preserves nested bullet indentation
- indents sub-bullets more clearly

## Notes

- The app stores settings and preferences in browser local storage.
- Ollama local/cloud behavior depends on your local server availability and model access.
- PDF export currently adds a large lazy-loaded chunk because of the export library, but that chunk is not loaded during normal app use.

## Main Files

- [src/App.jsx](C:/Users/qdnmu/OneDrive/Documents/Antigravity/src/App.jsx)
- [src/components/Editor/Editor.jsx](C:/Users/qdnmu/OneDrive/Documents/Antigravity/src/components/Editor/Editor.jsx)
- [src/components/Preview/Preview.jsx](C:/Users/qdnmu/OneDrive/Documents/Antigravity/src/components/Preview/Preview.jsx)
- [src/components/AtsChecker/AtsChecker.jsx](C:/Users/qdnmu/OneDrive/Documents/Antigravity/src/components/AtsChecker/AtsChecker.jsx)
- [src/components/ResumeChat/ResumeChat.jsx](C:/Users/qdnmu/OneDrive/Documents/Antigravity/src/components/ResumeChat/ResumeChat.jsx)
- [src/components/ThemeStudio/ThemeStudio.jsx](C:/Users/qdnmu/OneDrive/Documents/Antigravity/src/components/ThemeStudio/ThemeStudio.jsx)
- [src/utils/aiParser.js](C:/Users/qdnmu/OneDrive/Documents/Antigravity/src/utils/aiParser.js)
- [src/utils/resumeData.js](C:/Users/qdnmu/OneDrive/Documents/Antigravity/src/utils/resumeData.js)
