#!/bin/bash
# Vercel Deployment Helper Script
# This script helps deploy the Deklaro application to Vercel

set -e  # Exit on error

echo "🚀 Deklaro Vercel Deployment Helper"
echo "===================================="
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from frontend directory"
    exit 1
fi

# Check for git repository
if [ ! -d ".git" ]; then
    echo "⚠️  Warning: Not a git repository. Initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    exit 1
fi

# Function to deploy to Vercel
deploy_to_vercel() {
    local ENV=$1

    echo ""
    echo "📦 Deploying to Vercel ($ENV)..."
    echo ""

    if [ "$ENV" = "production" ]; then
        vercel --prod
    else
        vercel
    fi
}

# Main menu
echo "Select deployment type:"
echo ""
echo "1) Preview (test deployment)"
echo "2) Production (live deployment)"
echo "3) Link project to Vercel (first time setup)"
echo "4) Check deployment status"
echo "5) View logs"
echo "6) Cancel"
echo ""
read -p "Enter choice [1-6]: " choice

case $choice in
    1)
        echo ""
        echo "🔍 Creating preview deployment..."
        deploy_to_vercel "preview"
        ;;
    2)
        echo ""
        read -p "⚠️  Are you sure you want to deploy to PRODUCTION? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            # Run checks before production deploy
            echo ""
            echo "✅ Running pre-deployment checks..."

            echo "  → Running TypeScript check..."
            npm run build || {
                echo "❌ TypeScript errors found. Fix them before deploying."
                exit 1
            }

            echo "  → Running tests..."
            npm run test || {
                echo "⚠️  Tests failed. Continue anyway? (yes/no)"
                read -p "> " test_confirm
                if [ "$test_confirm" != "yes" ]; then
                    exit 1
                fi
            }

            echo ""
            echo "✅ All checks passed!"
            deploy_to_vercel "production"
        else
            echo "Cancelled."
        fi
        ;;
    3)
        echo ""
        echo "🔗 Linking project to Vercel..."
        echo ""
        echo "This will connect your local project to Vercel."
        echo "You'll be prompted to:"
        echo "  1. Log in to Vercel (if not already)"
        echo "  2. Select your Vercel account/team"
        echo "  3. Link to existing project or create new one"
        echo ""
        vercel link
        ;;
    4)
        echo ""
        echo "📊 Checking deployment status..."
        vercel inspect
        ;;
    5)
        echo ""
        echo "📜 Viewing deployment logs..."
        vercel logs
        ;;
    6)
        echo "Cancelled."
        exit 0
        ;;
    *)
        echo "Invalid choice."
        exit 1
        ;;
esac

echo ""
echo "✅ Done!"
echo ""
echo "📚 Next steps:"
echo "  → View your deployment: vercel inspect"
echo "  → Check logs: vercel logs"
echo "  → Manage environment variables: vercel env"
echo "  → View in dashboard: https://vercel.com/dashboard"
echo ""
