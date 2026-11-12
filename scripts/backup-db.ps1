<#
.SYNOPSIS
  Full PostgreSQL backup of the Portfolio database (everything, including the profile photo and the admin account).

.DESCRIPTION
  Uses pg_dump in the compressed "custom" format. The password is never taken as an argument:
  set PGPASSWORD in your shell first (or use a ~/.pgpass file), so it does not end up in the shell history.

  Restore into an EMPTY database with:
    pg_restore --no-owner --dbname=<database> --host=<host> --username=<user> <file>.dump
  The file contains the admin password hash: keep it private and never commit it (*.dump is git-ignored).

.EXAMPLE
  $env:PGPASSWORD = Read-Host "Database password"
  ./scripts/backup-db.ps1 -Database jobhunter -User jobhunter_app
#>
[CmdletBinding()]
param(
  [string]$DbHost = 'localhost',
  [int]$Port = 5432,
  [Parameter(Mandatory)] [string]$Database,
  [Parameter(Mandatory)] [string]$User,
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\backups'),
  [int]$KeepLast = 14
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  throw 'pg_dump was not found. Install the PostgreSQL client tools and make sure they are on PATH.'
}
if (-not $env:PGPASSWORD -and -not (Test-Path (Join-Path $env:APPDATA 'postgresql\pgpass.conf'))) {
  throw 'Set $env:PGPASSWORD (or create pgpass.conf) before running the backup.'
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
$file = Join-Path $OutputDirectory ("{0}-{1:yyyyMMdd-HHmmss}.dump" -f $Database, (Get-Date))

& pg_dump --host $DbHost --port $Port --username $User --format=custom --no-owner --file $file $Database
if ($LASTEXITCODE -ne 0) {
  Remove-Item $file -ErrorAction SilentlyContinue
  throw "pg_dump failed with exit code $LASTEXITCODE."
}

# Keep only the newest backups.
Get-ChildItem $OutputDirectory -Filter "$Database-*.dump" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip $KeepLast |
  Remove-Item -Force

Write-Host "Backup written to $file"
