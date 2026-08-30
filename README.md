# Research Wiki

A local-first personal research wiki for organizing research notes, workflows,
code references, figures, and technical documentation.

The project is designed so that the wiki application and the user's research
content remain separate. Researchers can clone the project and customize the
workspace structure for their own work.

## Features

- Workspace-based research organization
- Rich-text editing with Tiptap
- Headings, task lists, tables, and images
- Image upload and clipboard paste support
- HTML-based page storage
- Git-friendly research notes
- Manifest-based page management
- Wiki update import workflow
- Local-first operation without requiring a hosted database
- Customizable workspaces and page hierarchies

## Tech Stack

- Next.js
- React
- Tiptap / ProseMirror
- Prettier
- Node.js

Important editor packages currently include:

- `@tiptap/starter-kit`
- `@tiptap/react`
- `@tiptap/pm`
- `@tiptap/html`
- `@tiptap/extension-image`
- `@tiptap/extension-list`
- `@tiptap/extension-table`
- `@tiptap/extension-heading`

Exact dependency versions are recorded in `package-lock.json`.

## Requirements

This project currently uses Node.js 26.7.0.

The expected Node.js version is recorded in `.nvmrc`.

If you use `nvm`:

```bash
nvm install
nvm use
```

## Installation

```bash
npm ci
npm run dev
```

Then open `http://localhost:3000` in your browser.

## Storage

Wiki pages are stored as HTML files under `content/`.
Page metadata is stored in `content/manifest.json`.
Uploaded images are stored locally under `public/uploads/`.

Because the application writes directly to the local filesystem, persistent
storage is required when deploying outside a local machine.

## Customization

Workspace definitions are stored in `config/workspaces.js`.
The included Getting Started and Example Project workspaces can be replaced
with your own research projects.

## AI workflow

Research Wiki does not require an OpenAI API key.
You can copy page context to ChatGPT and import structured Wiki updates back
into the application.
