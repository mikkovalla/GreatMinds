# GreatMinds Copilot Instructions

## Project Overview

GreatMinds is a user & subscription management system built with Astro + Supabase. The main application is `mindchat-auth/` - an Astro web app focused on authentication with Vue.js integration.

## Architecture & Key Patterns

### Core Stack

- **Frontend**: Astro 5.x with Vue.js components (`@astrojs/vue`)
- **Backend**: Supabase (BaaS) for auth, database, and real-time features
- **Validation**: Zod for runtime type checking and input validation
- **Styling**: Custom CSS with CSS variables and 3D effects (see `global.css`)

### Authentication Flow

- **Supabase Client**: Configured in `src/lib/supabaseClient.ts` with persistent sessions
- **API Endpoints**: Located in `src/pages/api/auth/` (register.ts, signin.ts, signout.ts)
- **Session Management**: Uses HTTP-only cookies (`sb-access-token`, `sb-refresh-token`)
- **Environment**: TypeScript interfaces in `src/env.d.ts` define required env vars

### Project Structure

```
mindchat-auth/
├── src/
│   ├── lib/           # Shared utilities (Supabase client, validation schemas)
│   ├── pages/         # File-based routing
│   │   ├── api/       # Server endpoints
│   │   └── *.astro    # Page components
│   └── styles/        # Global CSS with custom properties
├── public/            # Static assets
└── .env               # Environment configuration
```

## Development Workflow

### Essential Commands

```bash
# Development server (runs on localhost:4321)
npm run dev

# Production build
npm run build && npm run preview

# Add integrations
npx astro add [integration]
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Configure Supabase credentials:
   - `PUBLIC_SUPABASE_URL`: Project URL from Supabase dashboard
   - `PUBLIC_SUPABASE_ANON_KEY`: Anonymous key for client-side auth

### MCP Integration

The project uses Model Context Protocol servers (see `.vscode/mcp.json`):

- **Supabase MCP**: Database operations and schema management
- **Stripe MCP**: Payment processing integration
- **Astro Docs MCP**: Framework documentation access

## Code Conventions

### API Endpoints

- Use `APIRoute` type from Astro for proper typing
- Follow RESTful patterns: POST for mutations, GET for reads
- Error responses should be consistent JSON format
- Always validate inputs with Zod schemas
- Handle Supabase errors gracefully

### Styling Approach

- CSS custom properties defined in `:root` for theming
- Component-scoped styles preferred over global
- 3D effects and animations are part of the design language
- Dark theme with gold accent colors (`--gold-bright`, `--gold-medium`)

### Security Patterns

- Environment variables must be prefixed with `PUBLIC_` for client access
- Sensitive operations happen server-side in API routes
- Input validation is mandatory for all user-facing endpoints
- Supabase RLS (Row Level Security) should be enabled for data protection

## Common Tasks

### Adding New Auth Endpoints

1. Create in `src/pages/api/auth/[name].ts`
2. Import Supabase client from `src/lib/supabaseClient.ts`
3. Add Zod validation schemas
4. Follow cookie management patterns for session handling

### Integrating External Services

- Stripe configuration already available via MCP
- Use environment variables for API keys
- External webhooks can be added to `src/pages/api/`

### Database Operations

- Use Supabase MCP server for schema changes
- Client operations through the configured Supabase client
- Real-time subscriptions supported via Supabase

## Critical Files

- `src/lib/supabaseClient.ts`: Core authentication client
- `src/env.d.ts`: TypeScript environment interface
- `astro.config.mjs`: Framework configuration
- `.vscode/mcp.json`: Development tooling setup
- `src/styles/global.css`: Global styles and CSS variables
- `src/lib/loggingConstants.ts`: Logging constants
- `src/lib/logging.ts`: Logging utilities
- `src/lib/validation.ts`: Input validation schemas
- `src/lib/security.ts`: Security-related utilities
- `.github/docs/database.schema.md`: Database schema documentation
- `.github/docs/Logging.md`: Logging documentation

## Critical thinking

After any context change (viewing new files, running commands, or receiving tool outputs), use the "mcp_think" tool to organize your reasoning before responding.

Specifically, always use the think tool when:

- After examining file contents or project structure
- After running terminal commands or analyzing their outputs
- After receiving search results or API responses
- Before making code suggestions or explaining complex concepts
- When transitioning between different parts of a task

When using the think tool:

- List the specific rules or constraints that apply to the current task
- Check if all required information is collected
- Verify that your planned approach is correct
- Break down complex problems into clearly defined steps
- Analyze outputs from other tools thoroughly
- Plan multi-step approaches before executing them

The think tool has been proven to improve performance by up to 54% on complex tasks, especially when working with multiple tools or following detailed policies.

- Always ensure you have the latest context before proceeding with any task
- Use the think tool to confirm your understanding of the task and context

## Documentation

- Every feature should have corresponding documentation
- Documentation should be kept up-to-date with code changes
- Documentation should be clear and concise
- Documentation should include examples where applicable
- Documentation should be versioned alongside the code
- Documentation is found at `.github/docs/`
