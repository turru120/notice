<?php
// 사용자의 이메일 주소를 user.json 파일에 저장

header('Content-Type: application/json');

$user_file = 'user.json';
$fp = null;

try {
    // 요청 유효성 검사
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method.', 405);
    }

    $request_data = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON format.', 400);
    }

    if (!isset($request_data['email']) || !isset($request_data['userId'])) {
        throw new Exception('Email or User ID not provided.', 400);
    }
    $new_email = $request_data['email'];
    $current_user_id = $request_data['userId'];

    if (!filter_var($new_email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format.', 400);
    }

    if (!file_exists($user_file)) {
        throw new Exception('User data file not found.', 500);
    }

    // 파일 잠금 및 데이터 처리
    $fp = fopen($user_file, 'r+');
    if (!$fp || !flock($fp, LOCK_EX)) {
        throw new Exception('Could not lock user file for writing.', 503);
    }

    $users_data_json = fread($fp, filesize($user_file) ?: 1);
    $users_data = json_decode($users_data_json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error decoding user JSON.', 500);
    }

    // 해당 사용자를 찾아 이메일 및 알림 설정 업데이트
    $user_found = false;
    foreach ($users_data as &$user) {
        if ($user['id'] === $current_user_id) {
            $user['email'] = $new_email;
            $user['notification'] = true; // 이메일 저장 시 알림 자동 활성화
            $user_found = true;
            break;
        }
    }

    if (!$user_found) {
        throw new Exception('User not found.', 404);
    }

    // 파일 쓰기 및 잠금 해제
    ftruncate($fp, 0);
    rewind($fp);
    if (fwrite($fp, json_encode($users_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        throw new Exception('Failed to save user data.', 500);
    }

    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    $fp = null;

    echo json_encode(['success' => true, 'message' => 'Email updated successfully.']);

} catch (Exception $e) {
    // 예외 처리
    if (isset($fp) && is_resource($fp)) {
        flock($fp, LOCK_UN);
        fclose($fp);
    }

    $statusCode = $e->getCode() >= 400 ? $e->getCode() : 500;
    http_response_code($statusCode);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>