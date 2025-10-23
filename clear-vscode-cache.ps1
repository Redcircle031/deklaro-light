# PowerShell script to clear VSCode TypeScript cache
# Run this if VSCode shows errors for files that don't exist

Write-Host "Clearing VSCode and TypeScript caches..." -ForegroundColor Yellow

# Clear TypeScript build info
Remove-Item -Path "tsconfig.tsbuildinfo" -ErrorAction SilentlyContinue
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Build caches cleared!" -ForegroundColor Green

# Check if the phantom file exists
$phantomFile = "src/index.ts"
if (Test-Path $phantomFile) {
    Write-Host "WARNING: $phantomFile still exists and will be deleted!" -ForegroundColor Red
    Remove-Item $phantomFile -Force
} else {
    Write-Host "Confirmed: $phantomFile does not exist on disk" -ForegroundColor Green
}

Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. In VSCode, press Ctrl+Shift+P" -ForegroundColor White
Write-Host "2. Type: 'TypeScript: Restart TS Server'" -ForegroundColor White
Write-Host "3. Press Enter" -ForegroundColor White
Write-Host "`nIf errors persist:" -ForegroundColor Cyan
Write-Host "- Close ALL editor tabs" -ForegroundColor White
Write-Host "- Press Ctrl+Shift+P and select 'Developer: Reload Window'" -ForegroundColor White
Write-Host "- Or completely close and reopen VSCode" -ForegroundColor White

Write-Host "`nDone!" -ForegroundColor Green
