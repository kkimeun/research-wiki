# Research Wiki

Research Wiki is a local-first personal wiki for organizing research notes, workflows, code references, figures, and technical documentation.

It runs locally on your computer and stores your research content as files. No hosted database or external server is required for normal use.

The application and your research content are designed to remain separate, so each researcher can clone the project and customize it for their own work.

## Features

- Workspace-based research organization
- Rich-text editing with Tiptap
- Headings, task lists, tables, and images
- Image upload and clipboard paste support
- HTML-based page storage
- Git-friendly research notes
- Manifest-based page management
- Wiki update import workflow
- Local-first operation without a hosted database
- Customizable workspaces and page hierarchies

## Requirements

- Git
- Node.js
- npm

The development environment currently uses Node.js 26.7.0. The version is recorded in `.nvmrc` for reproducibility.

If you use `nvm`:

```bash
nvm install
nvm use
```

## Installation

Clone the repository:

```bash
git clone https://github.com/kkimeun/research-wiki.git
cd research-wiki
```

Set up Node.js if you use `nvm`:

```bash
nvm install
nvm use
```

Install the dependencies:

```bash
npm ci
```

Start Research Wiki:

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

## Running the Wiki Again

After the initial installation, you normally only need:

```bash
cd research-wiki
npm run dev
```

Stop the development server with `Ctrl+C`.

Your Wiki content remains stored on your computer after the server is stopped.

## Updating Research Wiki

New stable features are published to the `main` branch.

To update an existing installation:

```bash
cd research-wiki
git switch main
git pull
```

If `package.json` or `package-lock.json` changed, update the installed dependencies:

```bash
npm ci
```

Then restart the Wiki:

```bash
npm run dev
```

Before pulling an update, commit or back up local changes that you want to keep.

## Branches

### `main`

`main` is the stable, generic version of Research Wiki. It contains the core application and is the recommended branch for normal use.

### `JAMCON`

`JAMCON` is an experimental branch for optional, playful, or non-core features.

To try the JAMCON version:

```bash
git switch JAMCON
npm ci
npm run dev
```

To return to the stable version:

```bash
git switch main
npm ci
npm run dev
```

Features developed in `JAMCON` are not necessarily intended to become part of the core Research Wiki.

## Storage

Research Wiki is local-first.

Wiki pages are stored as HTML files under `content/`.

Page metadata is stored in `content/manifest.json`.

Uploaded images are stored locally under `public/uploads/`.

Some optional features may use additional local data directories.

Because Research Wiki writes directly to the local filesystem, the files on your computer are the persistent storage for your Wiki. The application is primarily intended to run locally rather than as a stateless hosted web application.

## Customization

Workspace definitions are stored in `config/workspaces.js`.

The repository includes example workspaces that can be replaced or extended with your own research projects.

Research notes, workspace structures, and uploaded files can therefore be customized independently for each local installation.

## AI Workflow

Research Wiki does not require an OpenAI API key.

Page context can be copied to ChatGPT or another assistant, and structured Wiki updates can then be imported back into the application.

The Wiki itself remains usable without an AI service.

## Tech Stack

- Next.js
- React
- Tiptap / ProseMirror
- Prettier
- Node.js

Important editor packages include:

- `@tiptap/starter-kit`
- `@tiptap/react`
- `@tiptap/pm`
- `@tiptap/html`
- `@tiptap/extension-image`
- `@tiptap/extension-list`
- `@tiptap/extension-table`
- `@tiptap/extension-heading`

Exact dependency versions are recorded in `package-lock.json`.

## Build

To verify that the application builds successfully:

```bash
npm run build
```

A production-mode local server can then be started with:

```bash
npm start
```

For normal local development and personal use, `npm run dev` is sufficient.
