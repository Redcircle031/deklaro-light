# Prisma Database Setup - Deklaro MVP

**Status**: ✅ Schema Created | ⏳ Pending Migration
**Date**: 2025-10-08

---

## ✅ What's Been Set Up

### 1. Prisma Schema (`prisma/schema.prisma`)
Complete multi-schema database design with:

**Public Schema** (System-wide):
- ✅ `Tenant` - Multi-tenant organizations
- ✅ `TenantUser` (`tenant_members`) - User-tenant relationships with roles
- ✅ `UsageRecord` - Subscription usage tracking
- ✅ Enums: `SubscriptionTier`, `UserRole`

**Tenant Schema** (RLS-isolated business data):
- ✅ `Invoice` - Core invoice records with OCR & KSeF integration
- ✅ `InvoiceLineItem` - Invoice line items with VAT calculations
- ✅ `Company` - Suppliers/buyers with NIP validation
- ✅ `OCRJob` - Background OCR processing tracking
- ✅ `KSeFSubmission` - Polish tax authority submissions
- ✅ `AuditLog` - Immutable audit trail
- ✅ Enums: `InvoiceStatus`, `InvoiceType`, `KSeFStatus`, `CompanyStatus`, `OCRJobStatus`, `KSeFSubmissionStatus`

**Total**: 9 models, 7 enums, ~30 fields with proper indexing

### 2. Prisma Client
- ✅ Generated at `node_modules/@prisma/client`
- ✅ Singleton instance at `src/lib/prisma.ts`
- ✅ Development logging enabled

### 3. Seed Script (`prisma/seed.ts`)
Demo data includes:
- 1 demo tenant: "ACME Accounting"
- 2 demo companies (supplier + buyer)
- Usage record for current month
- Run with: `npm run db:seed`

### 4. Database Scripts (package.json)
```json
"db:generate": "prisma generate"    // Regenerate Prisma Client
"db:push": "prisma db push"         // Push schema without migrations
"db:migrate": "prisma migrate dev"  // Create & apply migration
"db:seed": "tsx prisma/seed.ts"     // Seed demo data
"db:studio": "prisma studio"        // Open Prisma Studio GUI
```

---

## ⏳ Next Steps to Make Database Functional

### Step 1: Configure Real Supabase Connection

Update `.env.local` with your Supabase credentials:

```env
# Get these from Supabase Dashboard → Settings → Database
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

**How to get these:**
1. Go to https://supabase.com/dashboard
2. Open your project (or create one)
3. Settings → Database → Connection string
4. Copy "Session mode" URL → Use as `DATABASE_URL` (with `pgbouncer=true`)
5. Copy "Transaction mode" URL → Use as `DIRECT_URL`
6. Replace `[YOUR-PASSWORD]` with your database password

### Step 2: Push Schema to Supabase

```bash
cd deklaro/frontend

# Push schema (creates tables without migration files)
npm run db:push

# OR create a migration (recommended for production)
npm run db:migrate
```

### Step 3: Enable Row-Level Security (RLS)

After pushing schema, run this SQL in Supabase SQL Editor:

```sql
-- Enable RLS on all tenant tables
ALTER TABLE tenant.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant.ocr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant.ksef_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy (example for invoices)
CREATE POLICY "Users can only access their tenant's invoices"
  ON tenant.invoices
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id
      FROM public.tenant_members
      WHERE user_id = auth.uid()
    )
  );

-- Repeat similar policies for other tables
```

### Step 4: Seed Demo Data

```bash
npm run db:seed
```

### Step 5: Verify Setup

```bash
# Open Prisma Studio to browse database
npm run db:studio
```

---

## 🔍 Schema Highlights

### Multi-Tenant Architecture
- **Tenant isolation** via RLS policies (not application logic)
- **Shared `public` schema** for system tables (tenants, users)
- **Isolated `tenant` schema** for business data (invoices, companies)

### Key Relationships
```
Tenant
  ├─< TenantUser (many users per tenant with roles)
  ├─< Company (tenant-scoped companies)
  ├─< Invoice (tenant-scoped invoices)
  └─< UsageRecord (monthly billing)

Invoice
  ├─1:1─ OCRJob (processing status)
  ├─1:1─ KSeFSubmission (tax submission)
  ├─< InvoiceLineItem (invoice lines)
  └── Company (supplier/buyer)
```

### Workflow States

**Invoice Status Flow:**
```
UPLOADED → PROCESSING → PROCESSED → REVIEWING
  → APPROVED → SUBMITTED → COMPLETED
  └─> ERROR (any stage)
```

**OCR Job Status Flow:**
```
QUEUED → PREPROCESSING → OCR_RUNNING → AI_PROCESSING
  → COMPLETED
  └─> FAILED → RETRYING
```

**KSeF Submission Flow:**
```
PENDING → SUBMITTING → SUBMITTED → ACCEPTED → UPO_DOWNLOADED
  └─> REJECTED/FAILED → RETRYING
```

---

## 📊 Database Statistics

- **9 models** defined
- **7 enums** for type safety
- **15 indexes** for query optimization
- **10 unique constraints** for data integrity
- **RLS policies** on 6 tenant tables

---

## 🚨 Important Notes

### Multi-Schema Support
- Prisma's `multiSchema` feature is now stable (removed from preview)
- Uses `@@schema("public")` and `@@schema("tenant")` directives

### Connection Pooling
- `DATABASE_URL` uses PgBouncer (`?pgbouncer=true`) for connection pooling
- `DIRECT_URL` bypasses pooler for migrations

### Supabase Auth Integration
- `TenantUser.userId` references `auth.users.id` (managed by Supabase)
- Not a Prisma foreign key (different schema)
- Validated via RLS policies

---

## 🛠️ Troubleshooting

### Issue: "Can't reach database server"
**Solution**: Check `DATABASE_URL` and `DIRECT_URL` in `.env.local`

### Issue: "Table already exists"
**Solution**: Use `npm run db:push --accept-data-loss` to reset

### Issue: "Role 'postgres' does not exist"
**Solution**: Ensure using Supabase connection strings, not local PostgreSQL

### Issue: "Schema 'tenant' does not exist"
**Solution**: Run `CREATE SCHEMA IF NOT EXISTS tenant;` in Supabase SQL Editor

---

## ✅ Completion Checklist

- [x] Prisma schema created
- [x] Prisma Client generated
- [x] Seed script created
- [x] Database scripts added to package.json
- [x] Prisma singleton created
- [ ] **Supabase connection configured**
- [ ] **Schema pushed to database**
- [ ] **RLS policies applied**
- [ ] **Seed data loaded**
- [ ] **Verified with Prisma Studio**

---

**Once database is connected**, the app can:
- ✅ Create tenants
- ✅ Manage users with roles
- ✅ Upload & process invoices
- ✅ Track OCR jobs
- ✅ Submit to KSeF
- ✅ Generate reports

**Current Blocker**: Supabase connection string needed in `.env.local`
