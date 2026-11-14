<#
.SYNOPSIS
  Stores the local development secrets (database, admin login, JWT key) in .NET user-secrets.

.DESCRIPTION
  Nothing is written to the repository: user-secrets live in your user profile.
  Run from the repository root:  ./scripts/setup-dev-secrets.ps1
#>
$ErrorActionPreference = 'Stop'
$project = Join-Path $PSScriptRoot '../src/backend/JobHunter.Api/JobHunter.Api.csproj'

function Set-Secret([string]$Name, [string]$Value) {
    dotnet user-secrets set $Name $Value --project $project | Out-Null
}

$existing = dotnet user-secrets list --project $project
$hasConnection = $existing -match '^ConnectionStrings:DefaultConnection'

if (-not $hasConnection) {
    $dbPassword = Read-Host 'PostgreSQL password for jobhunter_app' -AsSecureString
    $plain = [System.Net.NetworkCredential]::new('', $dbPassword).Password
    Set-Secret 'ConnectionStrings:DefaultConnection' "Host=localhost;Port=5432;Database=jobhunter;Username=jobhunter_app;Password=$plain"
}

if (-not ($existing -match '^Jwt:SigningKey')) {
    # Create() + GetBytes($buffer) works on Windows PowerShell 5.1 and PowerShell 7.
    $bytes = New-Object byte[] 48
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $rng.GetBytes($bytes)
    $rng.Dispose()
    Set-Secret 'Jwt:SigningKey' ([Convert]::ToBase64String($bytes))
}

$username = Read-Host 'Admin username (default: admin)'
if ([string]::IsNullOrWhiteSpace($username)) { $username = 'admin' }
Set-Secret 'Admin:Username' $username

# Build quietly first, so compiler messages can never end up inside the hash we capture below.
dotnet build $project -p:UseAppHost=false --nologo -v q | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'The API does not build. If it is running, stop it and try again.' }

Write-Host 'Choose the admin password (at least 12 characters). It is stored only as a hash.'
$output = dotnet run --project $project --no-build --no-launch-profile -- hash-password
if ($LASTEXITCODE -ne 0) { throw 'Could not create the password hash.' }
$hash = @($output | Where-Object { $_ -match '^pbkdf2-sha256\$' }) | Select-Object -Last 1
if (-not $hash) { throw 'The password hash was not produced. Run the script again.' }
Set-Secret 'Admin:PasswordHash' $hash.Trim()

Write-Host 'Done. Configured keys:'
dotnet user-secrets list --project $project | ForEach-Object { '  ' + ($_ -split ' = ')[0] }
