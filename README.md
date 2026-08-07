# NutriAI

AI-powered nutrition, fitness, and lifestyle coaching. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
for the stack and system design, and [docs/BILLING.md](docs/BILLING.md) for the subscription model.

## Stack

TanStack Start (React 19 + Vite), Tailwind v4, Supabase (Postgres + Auth + storage), and the Gemini API.

## Development

Requires Node.js and npm.

```sh
git clone <this-repository-url>
cd nurture-glow-16
npm install
npm run dev
```

Copy `.env.example` to `.env` and fill in your own Supabase project URL/keys
and `GEMINI_API_KEY` before running the app.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run preview` — preview a production build locally
- `npm run lint` — lint + format check
- `npm run format` — auto-format with Prettier
