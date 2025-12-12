<?php
// 웹 스크래핑과 이메일 알림 프로세스를 순차적으로 실행

$lockFile = __DIR__ . '/scraper.lock';
$lockTimeout = 5 * 60;

if (file_exists($lockFile)) {
    if (time() - filemtime($lockFile) > $lockTimeout) {
        unlink($lockFile); // 오래된 잠금 파일 제거
    } else {
        exit("Scraper is already running.");
    }
}

// 잠금 파일 생성
file_put_contents($lockFile, getmypid());

// 스크립트 종료 시 잠금 파일 자동 삭제 등록
register_shutdown_function(function() use ($lockFile) {
    if (file_exists($lockFile)) {
        unlink($lockFile);
    }
});

// 설정
$php_executable = 'C:\php8\php.exe';
$scraper_script_path = __DIR__ . '\scraper.php';
$notifier_script_path = __DIR__ . '\send_notifications.php';

// 스크래퍼 스크립트를 실행하여 모든 사이트의 공지사항을 수집
shell_exec(escapeshellcmd($php_executable) . ' ' . escapeshellarg($scraper_script_path));

// 알림 스크립트를 실행하여 새로운 공지사항을 사용자에게 이메일로 보냄
shell_exec(escapeshellcmd($php_executable) . ' ' . escapeshellarg($notifier_script_path));
?>