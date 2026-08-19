# Vietnam Industrial Gateway demo

Bilingual Vite, React, and TypeScript demo for industrial park discovery, industrial assets, assisted Find Demand/Find Supply requests, Industrial Expo, and VIG Admin operations.

## Run locally

```bash
npm install
npm run dev
```

Open the URL printed by Vite. Public screens start at `#/home`. The credentials-free admin entry is `#/login`.

## Quality checks

```bash
npm test
npm run build
```

The application is an in-memory mock. Refreshing the page restores fixture data; it does not provide real authentication, APIs, uploads, chat, meetings, or AI matching.

## Data notes

- VSIP Thái Bình is the full-fidelity reference profile.
- The other 19 industrial park profiles are explicitly marked as demo data.
- Sourced fields preserve unit, date, verification, and disclosure metadata.
- Restricted corporate documents expose verification metadata to public users while keeping file content admin-only.
