param([ValidateSet('assembly','youtube','naver','all')][string]$Provider='all')
$ErrorActionPreference='Stop'
if (-not $IsWindows -and $PSVersionTable.PSEdition -eq 'Core') { throw 'Windows encrypted registration requires Windows.' }
$vaultDirectory=Join-Path (Split-Path -Parent $PSScriptRoot) '.local/api-vault'
New-Item -ItemType Directory -Path $vaultDirectory -Force | Out-Null
$approvedShell=(Get-Process -Id $PID).Path
[IO.File]::WriteAllText((Join-Path $vaultDirectory 'runtime.json'), (@{powerShell=$approvedShell} | ConvertTo-Json -Compress))
$fields=@()
if ($Provider -in @('all','assembly')) { $fields+='ASSEMBLY_API_KEY' }
if ($Provider -in @('all','youtube')) { $fields+='YOUTUBE_API_KEY' }
if ($Provider -in @('all','naver')) { $fields+=@('NAVER_CLIENT_ID','NAVER_CLIENT_SECRET') }
Write-Host 'Hidden input. Leave blank to keep an existing value. Never paste keys into GitHub or chat.'
foreach ($field in $fields) {
  $secureValue=Read-Host $field -AsSecureString
  try {
    if ($secureValue.Length -gt 0) {
      $encryptedValue=ConvertFrom-SecureString $secureValue
      [IO.File]::WriteAllText((Join-Path $vaultDirectory ($field+'.dpapi')), $encryptedValue)
      Write-Host ($field+': encrypted registration saved for this Windows account.')
    }
  } finally { $secureValue.Dispose(); $encryptedValue=$null }
}
Write-Host 'Registration complete. Run npm start, then open Data connections in the website.'
