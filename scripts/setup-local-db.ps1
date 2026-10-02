$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$databaseRoot = Join-Path $projectRoot '.storage\postgres'
$environmentFile = Join-Path $projectRoot '.env'
$postgresBin = 'C:\Program Files\PostgreSQL\18\bin'
if (Test-Path -LiteralPath $environmentFile) { throw '.env already exists; preserve it and configure the database manually.' }
if (Test-Path -LiteralPath $databaseRoot) { throw 'Database directory already exists; start the existing database instead.' }
if (!(Test-Path -LiteralPath (Join-Path $postgresBin 'initdb.exe'))) { throw 'PostgreSQL 18 is not installed at the expected location.' }
$storageRoot = Join-Path $projectRoot '.storage'
New-Item -ItemType Directory -Force -Path $storageRoot | Out-Null
$passwordFile = Join-Path $storageRoot 'postgres-bootstrap-password'
$databasePassword = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
[System.IO.File]::WriteAllText($passwordFile, $databasePassword)
try {
  & (Join-Path $postgresBin 'initdb.exe') -D $databaseRoot -U nicheforge --auth=scram-sha-256 --pwfile=$passwordFile --encoding=UTF8 --locale=C
  if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL initialization failed.' }
} finally {
  if (Test-Path -LiteralPath $passwordFile) { Remove-Item -LiteralPath $passwordFile }
}
& (Join-Path $postgresBin 'pg_ctl.exe') -D $databaseRoot -l (Join-Path $storageRoot 'postgres.log') -o '-p 55474 -h 127.0.0.1' -w start
if ($LASTEXITCODE -ne 0) { throw 'Could not start local PostgreSQL on port 55474.' }
$env:PGPASSWORD = $databasePassword
try {
  & (Join-Path $postgresBin 'createdb.exe') -h 127.0.0.1 -p 55474 -U nicheforge nicheforge
  if ($LASTEXITCODE -ne 0) { throw 'Could not create application database.' }
} finally { Remove-Item Env:PGPASSWORD }
$config = "DATABASE_URL=postgresql://nicheforge:$databasePassword@127.0.0.1:55474/nicheforge`nSTORAGE_ROOT=.storage`nAPP_ORIGIN=http://localhost:3000`n"
[System.IO.File]::WriteAllText($environmentFile, $config)
Write-Output 'Local PostgreSQL configured on port 55474. Credentials saved privately in .env.'
