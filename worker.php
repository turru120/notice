<?php
$php_executable = 'C:\php8\php.exe';
$scraper_script_path = __DIR__ . '\scraper.php';
$notifier_script_path = __DIR__ . '\send_notifications.php';

shell_exec(escapeshellcmd($php_executable) . ' ' . escapeshellarg($scraper_script_path));
shell_exec(escapeshellcmd($php_executable) . ' ' . escapeshellarg($notifier_script_path));
?>
