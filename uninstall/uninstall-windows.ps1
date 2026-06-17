# Fusion Grade Sheet - complete uninstaller for Windows (PowerShell).
#
# The Setup .exe already registers an uninstaller in "Add or remove programs"
# (and with deleteAppDataOnUninstall it also clears app data). Use this script to
# fully purge everything - including the portable build and any leftovers.
#
# Run:  Right-click > "Run with PowerShell"  (or)  powershell -ExecutionPolicy Bypass -File uninstall-windows.ps1

$App   = "Fusion Grade Sheet"
$Name  = "fusion-grade-sheet"

Write-Host "This will completely remove `"$App`" and ALL of its data." -ForegroundColor Yellow
$ans = Read-Host "Continue? [y/N]"
if ($ans -notmatch '^[Yy]') { Write-Host "Cancelled."; exit }

# 1) Stop the app if running.
Get-Process -Name $App -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 2) Run the installed uninstaller if present (silent).
$uninstallers = @(
  "$env:LOCALAPPDATA\Programs\$Name\Uninstall $App.exe",
  "$env:PROGRAMFILES\$App\Uninstall $App.exe",
  "${env:PROGRAMFILES(X86)}\$App\Uninstall $App.exe"
)
foreach ($u in $uninstallers) {
  if (Test-Path $u) { Write-Host "  running uninstaller: $u"; Start-Process -FilePath $u -ArgumentList "/S" -Wait -ErrorAction SilentlyContinue }
}

# 3) Remove data / install / cache folders (every name variant).
$paths = @(
  "$env:APPDATA\$App",
  "$env:APPDATA\$Name",
  "$env:LOCALAPPDATA\$App",
  "$env:LOCALAPPDATA\$Name",
  "$env:LOCALAPPDATA\Programs\$Name",
  "$env:LOCALAPPDATA\$Name-updater"
)
foreach ($p in $paths) {
  if (Test-Path $p) { Write-Host "  removing: $p"; Remove-Item -Recurse -Force $p -ErrorAction SilentlyContinue }
}

# 4) Registry leftovers.
foreach ($key in @("HKCU:\Software\$App", "HKCU:\Software\$Name")) {
  if (Test-Path $key) { Write-Host "  removing registry: $key"; Remove-Item -Recurse -Force $key -ErrorAction SilentlyContinue }
}

Write-Host "Done. `"$App`" and all its data have been removed." -ForegroundColor Green
