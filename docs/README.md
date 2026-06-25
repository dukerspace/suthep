# Suthep Documentation

This folder is the source for the [VitePress](https://vitepress.dev/) documentation site.

## Local development

From this directory:

```bash
npm install
npm run dev
```

Or from the repo root:

```bash
npm run docs:dev
```

Open `http://localhost:5173/suthep/` (VitePress uses the `base` path from config).

## Build

From this directory:

```bash
npm run build
npm run preview
```

Or from the repo root:

```bash
npm run docs:build
npm run docs:preview
```

Static output is written to `docs/.vitepress/dist`.

## Languages

| Locale | Path |
|--------|------|
| English | `/` (root) |
| Thai | `/th/` |

Guide pages live as Markdown files in `docs/` (English) and `docs/th/` (Thai).

Published site: [dukerspace.github.io/suthep](https://dukerspace.github.io/suthep/)

For the project README, see [GitHub](https://github.com/dukerspace/suthep/blob/main/README.md).
