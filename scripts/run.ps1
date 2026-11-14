param(
  [ValidateSet('dev','build','preview','typecheck','lint','test','test:e2e','install')]
  [string]$Task='dev'
)
$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
Push-Location -LiteralPath $projectRoot
try {
  $pnpmCommand=Get-Command pnpm.cmd,pnpm -ErrorAction SilentlyContinue | Select-Object -First 1
  if($pnpmCommand){$runner=$pnpmCommand.Source}
  else {
    $nodeCommand=Get-Command node -ErrorAction Stop
    $dependenciesRoot=Split-Path (Split-Path (Split-Path $nodeCommand.Source -Parent) -Parent) -Parent
    $runner=Join-Path $dependenciesRoot 'bin\fallback\pnpm.cmd'
    if(!(Test-Path -LiteralPath $runner)){throw 'Install pnpm 11.25.0 or run from the bundled development environment.'}
  }
  if($Task -eq 'install'){& $runner install --frozen-lockfile}
  else {& $runner run $Task}
  exit $LASTEXITCODE
} finally {Pop-Location}
