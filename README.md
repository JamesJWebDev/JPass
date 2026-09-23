# JPass

Chrome extension password manager (monorepo). Firebase Auth for accounts; Firestore stores **encrypted** vault payloads. Vault crypto uses [libsodium](https://libsodium.gitbook.io/) (`crypto_pwhash` + `crypto_secretbox`) via `libsodium-wrappers` in `@jpass/core`.

## Prerequisites

- [Node.js](https://nodejs.org/) (LTS) and npm
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`) for deploying Firestore rules
- A Firebase project with **Authentication** (Email/Password) and **Firestore** enabled

## Environment

Copy the example env file at the repo root and fill in your Firebase web app values (Firebase console → Project settings → Your apps):

```bash
cp .env.example .env
```

Required variables (all prefixed with `VITE_` so the extension build can embed them):

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |

Do not commit `.env` (it is gitignored).

## Install and build

From the repo root:

```bash
npm install
npm run typecheck
npm run build
```

Extension output: `packages/extension/dist`. UI-only build: `npm run build:ui`. Extension-only: `npm run build:extension`.

After changing `.env`, run `npm run build:extension` again so the service worker and popup pick up config.

## Load the extension in Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `packages/extension/dist`.
4. Pin the JPass icon, open the popup, and sign in or register.

When you change code, rebuild and click **Reload** on the extension card.

## Deploy Firestore rules

Vault data lives at `users/{uid}/entries`. Security rules are in `firestore.rules`. Deploy them whenever rules change (and once when setting up a new Firebase project):

```bash
firebase login
firebase use jpass-f7971   # or your project ID in .firebaserc
firebase deploy --only firestore:rules
```

Without deployed rules, signed-in users will get permission errors when saving or listing entries.

To verify Auth + Firestore + rules against your project (creates a temporary test user):

```bash
npm run smoke:vault
```

## Packages

| Package | Role |
|---------|------|
| `packages/extension` | MV3 extension (popup, service worker, Firestore) |
| `packages/ui` | Shared React UI (`Login`, `Vault`) |
| `packages/core` | Shared TypeScript types |
