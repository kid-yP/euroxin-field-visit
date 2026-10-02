
---

#  `Euroxin_FieldVisit`

```markdown
# Euroxin Field Visit — Mobile Field Data App

Repo: :contentReference[oaicite:4]{index=4}

**One-line**  
An offline-first Expo React Native app for planning, tracking, and reporting field visits with GPS check-ins, exactly-once sync semantics, and supervisor admin integration.

---

## Tags
`#reactnative` `#expo` `#firebase` `#offline-first` `#field-tech` `#gps` `#reliability`

---

## Status
Active maintenance for mobile client; backend integrations available (Firestore).

**Sole developer contribution**  
I was the sole developer for major parts of this app, including the offline sync queue, GPS check-in, and photo-upload retry logic.

---

## Key features

- **GPS check-ins with POI support**  
- **Offline queue** that caches visits locally and retries uploads when connectivity returns  
- **Exactly-once sync** using idempotent submission tokens to avoid duplicates  
- **Photo uploads with robust retry logic and resume support** (use Firebase Storage recommended)  
- **Supervisor/admin integration:** consistent timestamps, server-side deduplication, and dashboard sync patterns  
- **Task management & visit logs:** plan visits, mark outcomes, attach photos and notes

---

## Tech stack

**Client:** Expo React Native (JavaScript / TypeScript)  
**Backend / Data:** Firebase Auth, Firestore  
**Storage:** Firebase Storage (photos & media)  
**Maps:** Google Maps API  
**Admin web:** Vercel

---

## Getting started (local dev)

**Prerequisites**

- Node.js 18+  
- Expo CLI (`npm install -g expo-cli`)  
- Firebase account (for Firestore & Storage)  
- Google Maps API key (for Map screens)

**Quick start**

```bash
git clone <repo-url>
cd euroxin-field-visit
cp .env.example .env
# Edit .env with FIREBASE config and MAP keys
npm install
npx expo start
