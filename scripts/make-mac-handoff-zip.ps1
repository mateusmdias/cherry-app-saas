# Regenerates the Mac handoff ZIP from the current git tree (no node_modules).
# Run from the repository root on Windows (PowerShell) or any machine with git.

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Set-Location $repoRoot
$out = Join-Path $repoRoot "cherry-app-saas-mac-handoff.zip"
if (Test-Path $out) { Remove-Item $out -Force }
git archive --format=zip -o $out HEAD
Write-Host "Created: $out"
(Get-Item $out).Length | ForEach-Object { Write-Host ("Size: {0:N0} bytes" -f $_) }
