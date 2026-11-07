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

Vercel should detect Vite automatically. Production deployments are created from new commits pushed to the connected production branch (`main`).

## Current functionality and limits
- 3D hero scene is rendered in the browser with Three.js; it responds to pointer movement and respects reduced-motion preferences.
- Motion for React powers entrance/reveal and interaction animations.
- Mobile navigation and the guided chat preview work on the frontend.
- The enquiry form prepares and copies a project brief locally. It does not send data to a server.
- The chat is a scripted preview, not a connected AI agent.
- Project visuals are concept directions, not claimed client case studies.
- No backend, CRM, authentication, analytics, payment or email delivery is connected yet.

Before launch, add a real contact channel and connect the enquiry/chat flows to a secure backend. Never expose private API keys in frontend code.

## Connect the AI assistant and enquiry form

The repository includes server-side Vercel functions in `api/`. Configure these variables in Vercel → Project → Settings → Environment Variables, then redeploy:

- `GEMINI_API_KEY` — Google AI Studio API key for the chat assistant.
- `RESEND_API_KEY` — Resend API key for enquiry email delivery.
- `CONTACT_EMAIL` — inbox that should receive project enquiries.
- `RESEND_FROM` — verified sender identity/domain in Resend, for example `World Automates <hello@your-verified-domain.com>`.\n- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` — server-side lead inbox and review storage.\n- `GEMINI_API_KEY` — powers the website chat assistant.\n\nThe contact form now saves each enquiry in the `leads` table and sends an immediate acknowledgement email through Resend when configured. The private `/admin` Studio OS includes an Enquiries inbox (new/contacted/qualified/closed) and review moderation. Run the updated `supabase/reviews.sql` to create both tables.

Keep these as server-side variables (never use a `VITE_` prefix and never commit real secrets). The chat endpoint returns a clear configuration message until its key is added. The enquiry endpoint returns a clear configuration message until all three email variables are set.

The AI assistant is not a human or a sales representative; it should not make binding quotes or commitments. Add rate limiting / abuse protection before promoting the public endpoints widely.


## Reviews and admin moderation

- Public review form: visitors can submit a star rating and written feedback.
- Reviews are stored as `pending` and are not shown publicly until approved.
- Private admin dashboard: open `/admin`, sign in, then approve or reject submissions.
- Review API uses Supabase server-side with the service-role key. Do not expose that key in browser code.

### One-time Supabase setup

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/reviews.sql`.
3. In Vercel → Project → Settings → Environment Variables, add:
   - `SUPABASE_URL`: project URL
   - `SUPABASE_SERVICE_ROLE_KEY`: service-role key (server-side only)
   - `ADMIN_PASSWORD`: a long, unique admin password
   - `ADMIN_SESSION_SECRET`: a separate random secret (at least 32 random bytes)
4. Redeploy the Vercel production deployment.

Until those four environment variables and the SQL schema are configured, review submissions and admin login return a configuration error. Keep the Supabase service-role key and admin secrets private; never paste them into chat or commit them to Git.
