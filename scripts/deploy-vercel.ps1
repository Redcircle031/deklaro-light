# Vercel Deployment Helper Script (PowerShell)
# This script helps deploy the Deklaro application to Vercel

$ErrorActionPreference = "Stop"

Write-Host "🚀 Deklaro Vercel Deployment Helper" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
try {
    $null = Get-Command vercel -ErrorAction Stop
} catch {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
}

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Must run from frontend directory" -ForegroundColor Red
    exit 1
}

# Check for git repository
if (-not (Test-Path ".git")) {
    Write-Host "⚠️  Warning: Not a git repository. Initialize git first:" -ForegroundColor Yellow
    Write-Host "   git init"
    Write-Host "   git add ."
    Write-Host "   git commit -m 'Initial commit'"
    exit 1
}

# Function to deploy to Vercel
function Deploy-ToVercel {
    param($Environment)

    Write-Host ""
    Write-Host "📦 Deploying to Vercel ($Environment)..." -ForegroundColor Cyan
    Write-Host ""

    if ($Environment -eq "production") {
        vercel --prod
    } else {
        vercel
    }
}

# Main menu
Write-Host "Select deployment type:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1) Preview (test deployment)"
Write-Host "2) Production (live deployment)"
Write-Host "3) Link project to Vercel (first time setup)"
Write-Host "4) Check deployment status"
Write-Host "5) View logs"
Write-Host "6) Cancel"
Write-Host ""
$choice = Read-Host "Enter choice [1-6]"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🔍 Creating preview deployment..." -ForegroundColor Cyan
        Deploy-ToVercel "preview"
    }
    "2" {
        Write-Host ""
        $confirm = Read-Host "⚠️  Are you sure you want to deploy to PRODUCTION? (yes/no)"
        if ($confirm -eq "yes") {
            # Run checks before production deploy
            Write-Host ""
            Write-Host "✅ Running pre-deployment checks..." -ForegroundColor Green

            Write-Host "  → Running TypeScript check..." -ForegroundColor Gray
            try {
                npm run build
            } catch {
                Write-Host "❌ TypeScript errors found. Fix them before deploying." -ForegroundColor Red
                exit 1
            }

            Write-Host "  → Running tests..." -ForegroundColor Gray
            try {
                npm run test
            } catch {
                Write-Host "⚠️  Tests failed. Continue anyway? (yes/no)" -ForegroundColor Yellow
                $testConfirm = Read-Host "> "
                if ($testConfirm -ne "yes") {
                    exit 1
                }
            }

            Write-Host ""
            Write-Host "✅ All checks passed!" -ForegroundColor Green
            Deploy-ToVercel "production"
        } else {
            Write-Host "Cancelled." -ForegroundColor Yellow
        }
    }
    "3" {
        Write-Host ""
        Write-Host "🔗 Linking project to Vercel..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "This will connect your local project to Vercel."
        Write-Host "You'll be prompted to:"
        Write-Host "  1. Log in to Vercel (if not already)"
        Write-Host "  2. Select your Vercel account/team"
        Write-Host "  3. Link to existing project or create new one"
        Write-Host ""
        vercel link
    }
    "4" {
        Write-Host ""
        Write-Host "📊 Checking deployment status..." -ForegroundColor Cyan
        vercel inspect
    }
    "5" {
        Write-Host ""
        Write-Host "📜 Viewing deployment logs..." -ForegroundColor Cyan
        vercel logs
    }
    "6" {
        Write-Host "Cancelled." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host "Invalid choice." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Next steps:" -ForegroundColor Yellow
Write-Host "  → View your deployment: vercel inspect"
Write-Host "  → Check logs: vercel logs"
Write-Host "  → Manage environment variables: vercel env"
Write-Host "  → View in dashboard: https://vercel.com/dashboard"
Write-Host ""
