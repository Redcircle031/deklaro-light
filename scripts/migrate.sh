#!/bin/bash

# Database Migration Script for Deklaro
# This script handles database migrations safely

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL environment variable is not set"
    print_info "Please set it in .env.production.local or export it"
    exit 1
fi

print_info "Starting database migration process..."

# Step 1: Check database connection
print_info "Step 1: Checking database connection..."
if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    print_info "✓ Database connection successful"
else
    print_error "✗ Cannot connect to database"
    print_error "Please check your DATABASE_URL and database availability"
    exit 1
fi

# Step 2: Backup database (optional but recommended)
print_info "Step 2: Creating database backup..."
BACKUP_FILE="backup-$(date +%Y%m%d-%H%M%S).sql"
if pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>/dev/null; then
    print_info "✓ Backup created: $BACKUP_FILE"
    gzip "$BACKUP_FILE"
    print_info "✓ Backup compressed: $BACKUP_FILE.gz"
else
    print_warn "⚠ Backup failed or skipped"
fi

# Step 3: Generate Prisma Client
print_info "Step 3: Generating Prisma Client..."
if npx prisma generate; then
    print_info "✓ Prisma Client generated"
else
    print_error "✗ Failed to generate Prisma Client"
    exit 1
fi

# Step 4: Run migrations
print_info "Step 4: Running database migrations..."
print_warn "This will modify your database schema"
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if npx prisma migrate deploy; then
        print_info "✓ Migrations applied successfully"
    else
        print_error "✗ Migration failed"
        print_error "Database might be in an inconsistent state"
        print_info "Consider restoring from backup: $BACKUP_FILE.gz"
        exit 1
    fi
else
    print_warn "Migration cancelled by user"
    exit 0
fi

# Step 5: Verify migration
print_info "Step 5: Verifying migration..."
if psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM _prisma_migrations;" > /dev/null 2>&1; then
    print_info "✓ Migration verification successful"
    MIGRATION_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM _prisma_migrations;")
    print_info "Total migrations applied: $MIGRATION_COUNT"
else
    print_warn "⚠ Could not verify migrations"
fi

# Step 6: Seed data (optional)
if [ -f "prisma/seed.ts" ]; then
    print_info "Step 6: Running database seed..."
    read -p "Run seed data? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if npx prisma db seed; then
            print_info "✓ Database seeded successfully"
        else
            print_warn "⚠ Seed failed or skipped"
        fi
    fi
else
    print_info "Step 6: No seed file found, skipping..."
fi

print_info ""
print_info "═══════════════════════════════════"
print_info "✓ Migration completed successfully!"
print_info "═══════════════════════════════════"
print_info ""
print_info "Next steps:"
print_info "1. Verify your application can connect to the database"
print_info "2. Run smoke tests"
print_info "3. Monitor application logs for errors"
print_info ""
print_info "Backup location: $BACKUP_FILE.gz"
