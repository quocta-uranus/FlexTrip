[CmdletBinding()]
param()

$repositoryRoot = Split-Path -Parent $PSScriptRoot
& node (Join-Path $repositoryRoot 'scripts/dev-up.mjs')
exit $LASTEXITCODE
