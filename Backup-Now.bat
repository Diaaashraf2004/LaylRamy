@echo off
echo Backing up testing environment...
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%
set BACKUP_DIR=D:\الشركة\بيئة اختبار_Backup_%TIMESTAMP%
xcopy "D:\الشركة\بيئة اختبار" "%BACKUP_DIR%" /E /I /H /C /Y
echo Backup complete! Saved to: %BACKUP_DIR%
pause
