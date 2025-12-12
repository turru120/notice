<?php
// 백그라운드에서 비동기적으로 스크래핑 및 worker.php 실행

header('Content-Type: application/json');
$php_executable = 'C:\\php8\\php.exe';
$worker_script_path = __DIR__ . '\\worker.php';

if (!file_exists($worker_script_path)) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Worker script not found.']);
    exit;
}

$command = escapeshellcmd($php_executable) . ' ' . escapeshellarg($worker_script_path);
pclose(popen("start /B " . $command, "r"));


// 클라이언트에게 즉시 성공 응답 반환
echo json_encode([
    'status' => 'success',
    'message' => 'Scraper and Notifier process started in background.'
]);

?>