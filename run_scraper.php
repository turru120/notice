<?php
// run_scraper.php
header('Content-Type: application/json');

// 웹 서버 컨텍스트에서 안정성을 위해 절대 경로 사용
$php_executable = 'C:\\php8\\php.exe';
$scraper_script_path = __DIR__ . '\\scraper.php';
$notifier_script_path = __DIR__ . '\\send_notifications.php'; // Add path to notifier

// 기본적인 보안: 실행 전 스크립트 파일 존재 여부 확인
if (!file_exists($scraper_script_path)) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Scraper script not found.']);
    exit;
}
if (!file_exists($notifier_script_path)) { // Check notifier script
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Notifier script not found.']);
    exit;
}

$output = [];
$status = 'success';
$message = 'Scraper and Notifier executed.';

// 스크래퍼 명령어 구성 및 실행
$scraper_command = escapeshellcmd($php_executable) . ' ' . escapeshellarg($scraper_script_path);
$scraper_output = shell_exec($scraper_command);
$output['scraper'] = $scraper_output;

// 알림 전송기 명령어 구성 및 실행
$notifier_command = escapeshellcmd($php_executable) . ' ' . escapeshellarg($notifier_script_path);
$notifier_output = shell_exec($notifier_command);
$output['notifier'] = $notifier_output;

echo json_encode([
    'status' => $status,
    'message' => $message,
    'output' => $output // 디버깅을 위해 스크래퍼와 알림 전송기의 출력 모두 포함
]);

?>