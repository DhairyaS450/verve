# One-time setup

Verve needs one Google Cloud project (the Firebase project) with four things switched on.

## 1. Firebase Authentication → Google

Firebase console → Authentication → Sign-in method → **Google** → Enable.
Copy the **Web client ID** and **Web client secret** shown under "Web SDK configuration". These are your `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

## 2. OAuth client redirect URIs

Google Cloud console → APIs & Services → Credentials → the web client from step 1 → **Authorized redirect URIs**:

```
http://localhost:3000/api/auth/google/callback
https://<your-vercel-domain>/api/auth/google/callback
```

Also add `https://<your-vercel-domain>` to **Authorized JavaScript origins**.

## 3. Google Drive API

Google Cloud console → APIs & Services → Library → **Google Drive API** → Enable.
Verve only requests the `drive.file` scope (files it created), which is a non-sensitive scope and needs no verification.

## 4. Firestore rules

Firebase console → Firestore → Rules → paste `firestore.rules` (or `firebase deploy --only firestore:rules`). All Verve data lives under `verveUsers/{uid}` and is readable only by its owner.

## 5. Environment

```
GEMINI_API_KEY=            # Google AI Studio
GEMINI_MODEL=gemini-3.8-flash
FIREBASE_API_KEY=          # Firebase web config (public)
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
GOOGLE_CLIENT_ID=          # step 1
GOOGLE_CLIENT_SECRET=      # step 1
TOKEN_ENC_KEY=             # 32 random bytes, base64:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
NEXT_PUBLIC_APP_URL=       # https://<your-vercel-domain>
```

On Vercel, add the same variables under Project → Settings → Environment Variables (or `vercel env add`).
