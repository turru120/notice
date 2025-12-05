<?php
header('Content-Type: application/json');
$php_executable = 'C:\\php8\\php.exe';
$scraper_script_path = __DIR__ . '\\scraper.php';
$notifier_script_path = __DIR__ . '\\send_notifications.php';

if (!file_exists($scraper_script_path)) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Scraper script not found.']);
    exit;
}
if (!file_exists($notifier_script_path)) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Notifier script not found.']);
    exit;
}

$output = [];
$status = 'success';
$message = 'Scraper and Notifier executed.';

$scraper_command = escapeshellcmd($php_executable) . ' ' . escapeshellarg($scraper_script_path);
$scraper_output = shell_exec($scraper_command);
$output['scraper'] = $scraper_output;

$notifier_command = escapeshellcmd($php_executable) . ' ' . escapeshellarg($notifier_script_path);
$notifier_output = shell_exec($notifier_command);
$output['notifier'] = $notifier_output;

echo json_encode([
    'status' => $status,
    'message' => $message,
    'output' => $output
]);

?>