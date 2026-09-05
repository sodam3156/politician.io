param([string]$Directory=(Join-Path (Split-Path -Parent $PSScriptRoot) '.local/api-vault'))
$ErrorActionPreference='Stop'
$values=@{}
try {
  foreach ($name in @('ASSEMBLY_API_KEY','YOUTUBE_API_KEY','NAVER_CLIENT_ID','NAVER_CLIENT_SECRET')) {
    $path=Join-Path $Directory ($name+'.dpapi')
    if (-not (Test-Path -LiteralPath $path)) { continue }
    $secure=[IO.File]::ReadAllText($path) | ConvertTo-SecureString
    $pointer=[Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { $values[$name]=[Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $secure.Dispose() }
  }
  # Private pipe to the local Node server only. Never run this helper interactively.
  [Console]::Out.Write(($values | ConvertTo-Json -Compress))
} catch {
  [Console]::Error.Write('VAULT_FAILED')
  exit 1
} finally { $values.Clear() }
