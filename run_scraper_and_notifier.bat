@echo off
cd /d "C:\Apache24\htdocs\TP-6"

echo [DEBUG %date% %time%] Running scraper... >> debug.log
C:\php8\php.exe C:\Apache24\htdocs\TP-6\scraper.php >> debug.log 2>&1

echo [DEBUG %date% %time%] Running notifier... >> debug.log
C:\php8\php.exe C:\Apache24\htdocs\TP-6\send_notifications.php >> debug.log 2>&1