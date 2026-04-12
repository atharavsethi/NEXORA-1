# Start Swasth Samaj Django Backend
# Run from the Swaasth_samaj directory
Write-Host "🚀 Starting Swasth Samaj Django Backend on http://localhost:5000" -ForegroundColor Green
Write-Host "📦 Using in-memory store (no database needed)" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow
Set-Location backend_django
python manage.py runserver 5000
