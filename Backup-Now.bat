@echo off
echo Backing up testing environment...
for /f "tokens=*" %%a in ('powershell -NoProfile -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"') do set TIMESTAMP=%%a
set BACKUP_DIR=D:\الشركة\بيئة اختبار_Backup_%TIMESTAMP%
xcopy "D:\الشركة\بيئة اختبار" "%BACKUP_DIR%" /E /I /H /C /Y
echo Backup complete! Saved to: %BACKUP_DIR%
pause
