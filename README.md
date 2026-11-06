# World Automates — Website

A React + Vite studio website with a live Three.js hero scene and Motion-powered interface animations.

## Stack
- React 18 + Vite
- Motion for React (`motion/react`)
- Three.js for the interactive 3D hero object
- Responsive CSS with reduced-motion support

## Run locally
```bash
npm install
npm run dev
```

## Production build
```bash
npm run build
npm run preview
```

## Vercel deployment
Import this repository into Vercel. Use:
- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

Vercel should detect Vite automatically once the project is imported/redeployed.

## Current functionality and limits
- 3D hero scene is rendered in the browser with Three.js; it responds to pointer movement and respects reduced-motion preferences.
- Motion for React powers entrance/reveal and interaction animations.
- Mobile navigation and the guided chat preview work on the frontend.
- The enquiry form prepares and copies a project brief locally. It does not send data to a server.
- The chat is a scripted preview, not a connected AI agent.
- Project visuals are concept directions, not claimed client case studies.
- No backend, CRM, authentication, analytics, payment or email delivery is connected yet.

Before launch, add a real contact channel and connect the enquiry/chat flows to a secure backend. Never expose private API keys in frontend code.
