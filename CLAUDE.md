# Seeky - AI-Powered Domain Finder

AI-powered domain name suggestions with real-time WHOIS availability checking.

## Package Manager

**This project uses `yarn`** (not npm)

## Tech Stack

- **Next.js** - React framework with App Router
- **TypeScript** - Type safety
- **Hono** - API framework with OpenAPI/Zod validation
- **Anthropic AI** - Domain name generation
- **WHOIS** - Domain availability checking
- **Cloudflare Workers** - Deployment platform
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **Radix UI** - Headless components

## Project Structure

```
src/
├── app/
│   ├── api/[...rest]/       # Hono API routes (domain-lookup, domain-suggest)
│   └── page.tsx             # Main UI
├── components/ui/           # shadcn/ui components
├── lib/                     # Utilities, validation, prompts
└── services/                # AI service, WHOIS lookup, parsers
```

## Development

```bash
yarn dev              # Dev server (port 4000)
yarn build            # Production build
yarn deploy           # Deploy to Cloudflare
yarn lint             # ESLint
yarn format           # Prettier
```

## API Routes

- `POST /api/domain-suggest` - Generate domain suggestions
- `POST /api/domain-lookup/bulk` - Check domain availability
- `/api/reference` - OpenAPI documentation

## Conventions

- Use `@/` import alias for `src/` directory
- Use `"use client"` for client components
- API routes use Hono with Zod validation
- Service classes extend base `Service` class
