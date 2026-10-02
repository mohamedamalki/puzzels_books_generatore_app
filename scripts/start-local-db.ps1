$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$databaseRoot = Join-Path $projectRoot '.storage\postgres'
if (!(Test-Path -LiteralPath (Join-Path $databaseRoot 'PG_VERSION'))) { throw 'Run setup-local-db.ps1 first.' }
$postgresBin = 'C:\Program Files\PostgreSQL\18\bin'
$pgCtl = Join-Path $postgresBin 'pg_ctl.exe'
if (!(Test-Path -LiteralPath $pgCtl)) { throw 'PostgreSQL 18 is not installed at the expected location.' }
& $pgCtl -D $databaseRoot status | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Output 'Local PostgreSQL is already running.'
  exit 0
}
& $pgCtl -D $databaseRoot -l (Join-Path $projectRoot '.storage\postgres.log') -o '-p 55474 -h 127.0.0.1' -w -t 60 start
exit $LASTEXITCODE
