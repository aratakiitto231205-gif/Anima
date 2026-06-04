# Cleanup script for ST Anima — 2026-06-05
# Run this once to finish the cleanup that Claude started.
# Safe to re-run: skips files that don't exist at source.
#
# Usage (PowerShell, from project root `c:\Users\DMX HUNG HOA\Desktop\ST Anima`):
#   .\cleanup_20260605.ps1
#
# Or one-liner:
#   powershell -ExecutionPolicy Bypass -File .\cleanup_20260605.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
Set-Location $root

function Move-IfExists {
    param([string]$Source, [string]$Destination)
    if (Test-Path $Source) {
        Move-Item -Path $Source -Destination $Destination -Force
        Write-Host "[OK] moved $Source -> $Destination" -ForegroundColor Green
    } else {
        Write-Host "[SKIP] not found: $Source" -ForegroundColor DarkGray
    }
}

Write-Host "=== ST Anima cleanup 2026-06-05 ===" -ForegroundColor Cyan
Write-Host "Working dir: $root"
Write-Host ""

# 1. Move stale .md files to archive/docs_archive_20260605/
Move-IfExists "ANIMA_ENGINE_OVERVIEW.md" "archive\docs_archive_20260605\ANIMA_ENGINE_OVERVIEW_old_technical.md"
Move-IfExists "HITSUJI_MIND.md"          "archive\docs_archive_20260605\HITSUJI_MIND_original_vision_20260528.md"
Move-IfExists "COGNITIVE_INTERVIEW.md"   "archive\docs_archive_20260605\COGNITIVE_INTERVIEW_unanswered_20260528.md"

# 2. Move cleanup log to docs/history/
Move-IfExists "AGENT_ACTIVITY_LOG.md" "docs\history\cleanup_log_20260531.md"

# 3. Move privacy-sensitive debug JSON to archive/debug/
Move-IfExists "server_request_debug.json" "archive\debug\server_request_debug_20260605.json"

# 4. Verify
Write-Host ""
Write-Host "=== Result ===" -ForegroundColor Cyan
Write-Host "Root .md files (should only be AGENTS.md):"
Get-ChildItem -Path $root -Filter "*.md" -File | ForEach-Object { "  - $($_.Name)" }
Write-Host ""
Write-Host "Archived:"
Get-ChildItem -Path "$root\archive\docs_archive_20260605" -File | ForEach-Object { "  - archive\docs_archive_20260605\$($_.Name)" }
Get-ChildItem -Path "$root\docs\history" -File | ForEach-Object { "  - docs\history\$($_.Name)" }
Get-ChildItem -Path "$root\archive\debug" -File | ForEach-Object { "  - archive\debug\$($_.Name)" }
