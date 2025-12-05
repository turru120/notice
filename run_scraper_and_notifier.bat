@echo off
cd /d "C:\Apache24\htdocs\TP-5"

:: scraper.php를 실행해 새로운 공지사항이 있는지 확인하고 가져 옴
echo [DEBUG %date% %time%] Running scraper... >> debug.log
C:\php8\php.exe C:\Apache24\htdocs\TP-5\scraper.php >> debug.log 2>&1

:: send_notifications.php를 실행하여 새로운 공지사항이 있으면 사용자에게 이메일을 보냄
echo [DEBUG %date% %time%] Running notifier... >> debug.log
C:\php8\php.exe C:\Apache24\htdocs\TP-5\send_notifications.php >> debug.log 2>&1