<?php
header('Content-Type: application/json');
$php_executable = 'C:\\php8\\php.exe';
$worker_script_path = __DIR__ . '\\worker.php';

if (!file_exists($worker_script_path)) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Worker script not found.']);
    exit;
}

// 워커 스크립트를 백그라운드에서 실행
$command = escapeshellcmd($php_executable) . ' ' . escapeshellarg($worker_script_path);
pclose(popen("start /B " . $command, "r"));

// 즉시 응답 반환
echo json_encode([
    'status' => 'success',
    'message' => 'Scraper and Notifier process started in background.'
]);

?>