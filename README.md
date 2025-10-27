# 🚀 Deklaro - Invoice Automation Platform

**Automated invoice processing and e-Invoice submission for Polish businesses**

Deklaro is a production-ready invoice automation platform featuring OCR extraction, team collaboration, Polish KSeF integration, and comprehensive security features.

---

## ✨ Features

### Core Capabilities
- 📄 **Automated Invoice Processing** - Upload PDF/images, extract data with AI-powered OCR
- 🇵🇱 **KSeF Integration** - Direct submission to Polish National e-Invoice System
- 👥 **Team Collaboration** - Role-based access with invitations
- 🏢 **Company Management** - NIP validation with GUS registry
- 💳 **Subscription Management** - Stripe-powered billing
- 🌍 **Multi-language** - Full Polish and English support

### Security & Compliance
- 🔒 **Enterprise Security** - Rate limiting, virus scanning, error monitoring
- 🛡️ **Data Protection** - Row-level security, encrypted storage
- 📊 **Error Tracking** - Sentry integration for production monitoring
- ✅ **Certificate-based Auth** - Production KSeF authentication

### Developer Experience
- ⚡ **Modern Stack** - Next.js 15, React 19, TypeScript
- 🧪 **Comprehensive Testing** - 594 E2E tests with Playwright
- 🐳 **Docker Ready** - Production Docker configuration
- 📚 **Complete Documentation** - Deployment, API, User & Admin guides

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase account)
- npm or yarn

### Installation

\`\`\`bash
# Clone repository
git clone https://github.com/your-org/deklaro-light.git
cd deklaro-light

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local

# Generate Prisma Client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
\`\`\`

Open [http://localhost:4000](http://localhost:4000) in your browser.

---

## 📋 Environment Configuration

Create \`.env.local\` with required variables:

\`\`\`bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/deklaro"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Email
RESEND_API_KEY="re_xxxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# AI/OCR
OPENAI_API_KEY="sk-xxxxxxxxxxxxx"

# Payments
STRIPE_SECRET_KEY="sk_test_xxxxxxxxxxxxx"
STRIPE_PUBLISHABLE_KEY="pk_test_xxxxxxxxxxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxx"

# KSeF (Optional for development)
KSEF_ENVIRONMENT="test"
KSEF_USE_CERT_AUTH="false"
\`\`\`

See [\`.env.example\`](./.env.example) for complete list.

---

## 📚 Documentation

Comprehensive guides available:

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide (Vercel, Docker, Railway)
- **[API.md](./API.md)** - Full API reference with examples
- **[USER_GUIDE.md](./USER_GUIDE.md)** - End-user documentation
- **[ADMIN_SETUP.md](./ADMIN_SETUP.md)** - Admin configuration (KSeF, Stripe)
- **[IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)** - Technical implementation details

---

## 🧪 Testing

### Unit Tests

\`\`\`bash
npm test
\`\`\`

### E2E Tests (Playwright)

\`\`\`bash
# Run all tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific browser
npx playwright test --project=chromium
\`\`\`

### Test Coverage

- **594 E2E tests** across 7 comprehensive suites
- Coverage: Authentication, Invoices, Companies, KSeF, Payments, i18n, Security
- Rate limiting, virus scanning, error handling

---

## 🐳 Docker Deployment

### Development

\`\`\`bash
docker-compose up
\`\`\`

### Production

\`\`\`bash
# Build and start
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop
docker-compose -f docker-compose.prod.yml down
\`\`\`

Production setup includes:
- Application container
- Redis for rate limiting
- ClamAV for virus scanning
- Nginx reverse proxy

---

## 🔧 Scripts

Useful automation scripts in \`scripts/\`:

\`\`\`bash
# Validate environment variables
./scripts/validate-env.sh

# Run database migrations
./scripts/migrate.sh
\`\`\`

---

## 🏗️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **next-intl** - Internationalization

### Backend
- **Next.js API Routes** - Serverless functions
- **Prisma** - Database ORM
- **Supabase** - PostgreSQL + Auth + Storage
- **Zod** - Schema validation

### External Services
- **OpenAI** - Invoice OCR
- **Stripe** - Payment processing
- **Resend** - Email delivery
- **Sentry** - Error monitoring
- **KSeF** - Polish e-Invoice system

### Security
- **ClamAV/VirusTotal** - Virus scanning
- **Rate Limiting** - API protection
- **Row-Level Security** - Data isolation

---

## 📊 Project Structure

\`\`\`
deklaro-light/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Auth pages (login, signup)
│   │   ├── (dashboard)/       # Dashboard pages
│   │   ├── api/               # API routes
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   ├── lib/                   # Utilities & services
│   │   ├── email/            # Email templates
│   │   ├── ksef/             # KSeF integration
│   │   ├── rate-limit/       # Rate limiting
│   │   ├── security/         # Virus scanning
│   │   └── stripe/           # Payment processing
│   └── i18n.ts               # Internationalization config
├── prisma/
│   └── schema.prisma         # Database schema
├── tests/
│   └── e2e/                  # Playwright E2E tests
├── messages/                  # i18n translations
│   ├── en.json               # English
│   └── pl.json               # Polish
├── scripts/                   # Automation scripts
├── .github/
│   └── workflows/            # CI/CD pipelines
├── docs/                      # Documentation
└── docker-compose.prod.yml   # Production Docker config
\`\`\`

---

## 🚦 CI/CD

GitHub Actions pipelines included:

### On Push/PR
- ✅ Linting & formatting
- ✅ TypeScript type checking
- ✅ Unit tests
- ✅ Build validation
- ✅ E2E tests (Chromium, Firefox)
- ✅ Security scanning
- ✅ Docker build test

### On Main Branch Push
- 🚀 Automatic deployment to Vercel
- 📦 Docker image build & push

### On Tag (Release)
- 📝 GitHub release creation
- 🐳 Multi-platform Docker images
- 🚀 Production deployment

---

## 🔐 Security

### Implemented Features
- **Authentication** - Supabase Auth with JWT
- **Authorization** - Role-based access control (Owner, Accountant, Client)
- **Rate Limiting** - Configurable limits per endpoint
- **Virus Scanning** - ClamAV/VirusTotal integration
- **Input Validation** - Zod schemas on all endpoints
- **SQL Injection Protection** - Prisma parameterized queries
- **XSS Protection** - Input sanitization
- **CSRF Protection** - Built-in Next.js protection
- **Secure Headers** - CSP, HSTS, X-Frame-Options
- **Error Monitoring** - Sentry with PII filtering

---

## 🌍 Internationalization

Supported languages:
- 🇬🇧 English (\`en\`)
- 🇵🇱 Polski (\`pl\`)

Translation files: \`messages/en.json\`, \`messages/pl.json\`

Switch language in user preferences or via URL: \`/pl\` or \`/en\`

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) file

---

## 💬 Support

- **Documentation**: See \`docs/\` directory
- **Issues**: [GitHub Issues](https://github.com/your-org/deklaro-light/issues)
- **Email**: support@yourdomain.com

---

## 📊 Status

**Version**: 1.0.0  
**Status**: Production Ready 🚀  
**Last Updated**: 2025-10-27

---

**Made with ❤️ for Polish businesses**

🤖 Generated with [Claude Code](https://claude.com/claude-code)
