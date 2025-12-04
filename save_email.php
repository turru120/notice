<?php
// save_email.php

header('Content-Type: application/json');

// 사용자 데이터 파일 경로
$user_file = 'user.json';

try {
    // POST 요청인지 확인
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method.');
    }

    // 요청 본문에서 JSON 데이터 읽기
    $request_data = json_decode(file_get_contents('php://input'), true);

    // 이메일과 사용자 ID 데이터가 있는지 확인
    if (!isset($request_data['email']) || !isset($request_data['userId'])) {
        throw new Exception('Email or User ID not provided.');
    }
    $new_email = $request_data['email'];
    $current_user_id = $request_data['userId'];

    // 이메일 형식 유효성 검사 (기본)
    if (!filter_var($new_email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format.');
    }

    // user.json 파일 읽기
    if (!file_exists($user_file)) {
        throw new Exception('User data file not found.');
    }
    $users_data = json_decode(file_get_contents($user_file), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error decoding user JSON.');
    }

    $user_found = false;
    // 해당 사용자를 찾아 이메일 주소와 알림 설정을 업데이트
    foreach ($users_data as &$user) { // & 참조를 사용하여 배열 직접 수정
        if ($user['id'] === $current_user_id) {
            $user['email'] = $new_email;
            $user['notification'] = true; // 이메일 저장 시 알림 자동 활성화
            $user_found = true;
            break;
        }
    }

    if (!$user_found) {
        throw new Exception('User not found.');
    }

    // 수정된 데이터로 user.json 파일 덮어쓰기
    if (file_put_contents($user_file, json_encode($users_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        throw new Exception('Failed to save user data.');
    }

    // 성공 응답
    echo json_encode(['success' => true, 'message' => 'Email updated successfully.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>
