#!/bin/bash

# Pre-Deployment Environment Validation Script
# Validates that all required environment variables are set

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TOTAL=0
PASSED=0
FAILED=0
WARNINGS=0

print_header() {
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}   Deklaro Pre-Deployment Validation   ${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo ""
}

check_var() {
    local var_name=$1
    local required=$2
    local description=$3

    TOTAL=$((TOTAL + 1))

    if [ -z "${!var_name}" ]; then
        if [ "$required" = "true" ]; then
            echo -e "${RED}✗${NC} $var_name - ${RED}MISSING (Required)${NC}"
            echo -e "  Description: $description"
            FAILED=$((FAILED + 1))
        else
            echo -e "${YELLOW}⚠${NC} $var_name - ${YELLOW}Not Set (Optional)${NC}"
            echo -e "  Description: $description"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${GREEN}✓${NC} $var_name - ${GREEN}OK${NC}"
        PASSED=$((PASSED + 1))
    fi
}

check_url() {
    local var_name=$1
    local url="${!var_name}"

    if [ ! -z "$url" ]; then
        if [[ $url =~ ^https?:// ]]; then
            echo -e "  ${GREEN}✓${NC} Valid URL format"
        else
            echo -e "  ${YELLOW}⚠${NC} URL should start with http:// or https://"
        fi
    fi
}

# Load environment file if exists
if [ -f ".env.production.local" ]; then
    echo -e "${GREEN}Loading .env.production.local...${NC}"
    export $(grep -v '^#' .env.production.local | xargs)
    echo ""
elif [ -f ".env.local" ]; then
    echo -e "${YELLOW}Warning: Using .env.local (should use .env.production.local for production)${NC}"
    export $(grep -v '^#' .env.local | xargs)
    echo ""
else
    echo -e "${YELLOW}No environment file found. Checking system environment variables...${NC}"
    echo ""
fi

print_header

echo -e "${BLUE}──── Core Application ────${NC}"
check_var "NODE_ENV" "true" "Node environment (should be 'production')"
if [ "$NODE_ENV" != "production" ]; then
    echo -e "  ${YELLOW}⚠${NC} NODE_ENV should be 'production' for deployment"
fi
echo ""

echo -e "${BLUE}──── Database (Supabase) ────${NC}"
check_var "DATABASE_URL" "true" "PostgreSQL connection string"
check_var "NEXT_PUBLIC_SUPABASE_URL" "true" "Supabase project URL"
check_url "NEXT_PUBLIC_SUPABASE_URL"
check_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "true" "Supabase anonymous/public key"
check_var "SUPABASE_SERVICE_ROLE_KEY" "true" "Supabase service role key (admin access)"
echo ""

echo -e "${BLUE}──── Authentication ────${NC}"
check_var "JWT_SECRET" "false" "JWT secret for token signing"
echo ""

echo -e "${BLUE}──── Email Service (Resend) ────${NC}"
check_var "RESEND_API_KEY" "true" "Resend API key for sending emails"
check_var "RESEND_FROM_EMAIL" "true" "From email address"
echo ""

echo -e "${BLUE}──── AI/OCR (OpenAI) ────${NC}"
check_var "OPENAI_API_KEY" "true" "OpenAI API key for invoice OCR"
echo ""

echo -e "${BLUE}──── Error Monitoring (Sentry) ────${NC}"
check_var "SENTRY_ENABLED" "false" "Enable Sentry error tracking (true/false)"
check_var "SENTRY_DSN" "false" "Sentry Data Source Name"
check_url "SENTRY_DSN"
check_var "SENTRY_ENVIRONMENT" "false" "Sentry environment label"
echo ""

echo -e "${BLUE}──── Payments (Stripe) ────${NC}"
check_var "STRIPE_SECRET_KEY" "true" "Stripe secret key (sk_live_xxx for production)"
if [ ! -z "$STRIPE_SECRET_KEY" ]; then
    if [[ $STRIPE_SECRET_KEY == sk_live_* ]]; then
        echo -e "  ${GREEN}✓${NC} Using live Stripe key"
    elif [[ $STRIPE_SECRET_KEY == sk_test_* ]]; then
        echo -e "  ${YELLOW}⚠${NC} Using test Stripe key (should use live key for production)"
    fi
fi
check_var "STRIPE_PUBLISHABLE_KEY" "true" "Stripe publishable key"
check_var "STRIPE_WEBHOOK_SECRET" "true" "Stripe webhook signing secret"
check_var "STRIPE_PRICE_ID_PRO" "false" "Stripe Price ID for Pro plan"
check_var "STRIPE_PRICE_ID_ENTERPRISE" "false" "Stripe Price ID for Enterprise plan"
echo ""

echo -e "${BLUE}──── KSeF (Polish e-Invoice) ────${NC}"
check_var "KSEF_ENVIRONMENT" "true" "KSeF environment (test/production)"
if [ "$KSEF_ENVIRONMENT" != "production" ] && [ "$KSEF_ENVIRONMENT" != "test" ]; then
    echo -e "  ${YELLOW}⚠${NC} KSEF_ENVIRONMENT should be 'production' or 'test'"
fi
check_var "KSEF_USE_CERT_AUTH" "true" "Use certificate authentication (true/false)"
if [ "$KSEF_USE_CERT_AUTH" = "true" ]; then
    check_var "KSEF_CERT_PATH" "false" "Path to KSeF certificate (.pfx file)"
    check_var "KSEF_CERT_BASE64" "false" "Base64 encoded certificate (alternative to file)"
    check_var "KSEF_CERT_PASSWORD" "true" "Certificate password"

    if [ -z "$KSEF_CERT_PATH" ] && [ -z "$KSEF_CERT_BASE64" ]; then
        echo -e "  ${RED}✗${NC} Either KSEF_CERT_PATH or KSEF_CERT_BASE64 must be set"
        FAILED=$((FAILED + 1))
    fi
fi
echo ""

echo -e "${BLUE}──── Security (Virus Scanning) ────${NC}"
check_var "VIRUS_SCAN_ENABLED" "false" "Enable virus scanning (true/false)"
check_var "VIRUS_SCAN_PROVIDER" "false" "Virus scan provider (clamav/virustotal/none)"
if [ "$VIRUS_SCAN_PROVIDER" = "clamav" ]; then
    check_var "CLAMAV_HOST" "true" "ClamAV daemon host"
    check_var "CLAMAV_PORT" "true" "ClamAV daemon port"
elif [ "$VIRUS_SCAN_PROVIDER" = "virustotal" ]; then
    check_var "VIRUSTOTAL_API_KEY" "true" "VirusTotal API key"
fi
echo ""

echo -e "${BLUE}──── Rate Limiting (Optional Redis) ────${NC}"
check_var "REDIS_URL" "false" "Redis connection URL for rate limiting"
check_url "REDIS_URL"
echo ""

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "${BLUE}            Validation Summary          ${NC}"
echo -e "${BLUE}════════════════════════════════════════${NC}"
echo -e "Total checks:    $TOTAL"
echo -e "${GREEN}Passed:          $PASSED${NC}"
echo -e "${YELLOW}Warnings:        $WARNINGS${NC}"
echo -e "${RED}Failed:          $FAILED${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}✗ Validation FAILED${NC}"
    echo -e "${RED}Please fix the missing required variables before deploying${NC}"
    echo ""
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ Validation passed with WARNINGS${NC}"
    echo -e "${YELLOW}Review optional variables and ensure security settings are correct${NC}"
    echo ""
    exit 0
else
    echo -e "${GREEN}✓ Validation PASSED${NC}"
    echo -e "${GREEN}All required environment variables are configured${NC}"
    echo ""
    exit 0
fi
