$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootDir = Split-Path -Parent $scriptDir
$backupDir = Join-Path $rootDir "_backups"

$dateStr = Get-Date -Format "yyyyMMdd_HHmmss"
$targetDir = Join-Path $backupDir "auto_backup_$dateStr"

# Create backup directory
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null

# Files and folders to backup
$itemsToBackup = @("js", "css", "finance.html", "firestore.rules", "finance-styles.css")

foreach ($item in $itemsToBackup) {
    $sourcePath = Join-Path $rootDir $item
    if (Test-Path $sourcePath) {
        Copy-Item -Path $sourcePath -Destination $targetDir -Recurse -Force
    }
}

Write-Host "Backup successfully created at: $targetDir" -ForegroundColor Green

# Keep only the latest 30 backups
$allBackups = Get-ChildItem -Path $backupDir -Directory -Filter "auto_backup_*" | Sort-Object CreationTime -Descending

if ($allBackups.Count -gt 30) {
    $backupsToDelete = $allBackups | Select-Object -Skip 30
    foreach ($oldBackup in $backupsToDelete) {
        Remove-Item -Path $oldBackup.FullName -Recurse -Force
        Write-Host "Deleted old backup: $($oldBackup.Name)" -ForegroundColor Yellow
    }
}
