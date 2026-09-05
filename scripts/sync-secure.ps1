param([switch]$Full)
$ErrorActionPreference = 'Stop'
$assemblySecureInput = Read-Host 'Assembly API key (hidden; not saved)' -AsSecureString
$assemblySecretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($assemblySecureInput)
$previousAssemblyKey = $env:ASSEMBLY_API_KEY
try {
  $env:ASSEMBLY_API_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($assemblySecretPointer)
  Push-Location (Split-Path -Parent $PSScriptRoot)
  try {
    if ($Full) { & node scripts/sync-assembly.mjs --full }
    else { & node scripts/sync-assembly.mjs }
    if ($LASTEXITCODE -ne 0) { throw 'Assembly sync failed. Existing snapshot is unchanged.' }
  } finally { Pop-Location }
} finally {
  $env:ASSEMBLY_API_KEY = $previousAssemblyKey
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($assemblySecretPointer)
  $assemblySecureInput.Dispose()
  $previousAssemblyKey = $null
}
