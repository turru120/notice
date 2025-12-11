<?php

header('Content-Type: application/json');

$user_file = 'user.json';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method.');
    }

    $request_data = json_decode(file_get_contents('php://input'), true);

    // 필수 데이터 존재 여부 확인
    if (!isset($request_data['email']) || !isset($request_data['userId'])) {
        throw new Exception('Email or User ID not provided.');
    }
    $new_email = $request_data['email'];
    $current_user_id = $request_data['userId'];

    // 이메일 형식 유효성 검사
    if (!filter_var($new_email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid email format.');
    }

    if (!file_exists($user_file)) {
        throw new Exception('User data file not found.');
    }
    $users_data = json_decode(file_get_contents($user_file), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error decoding user JSON.');
    }

    $user_found = false;
    // 사용자 정보 업데이트
    foreach ($users_data as &$user) {
        if ($user['id'] === $current_user_id) {
            $user['email'] = $new_email;
            $user['notification'] = true;
            $user_found = true;
            break;
        }
    }

    if (!$user_found) {
        throw new Exception('User not found.');
    }

    if (file_put_contents($user_file, json_encode($users_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        throw new Exception('Failed to save user data.');
    }

    echo json_encode(['success' => true, 'message' => 'Email updated successfully.']);

} catch (Exception $e) {
    $message = $e->getMessage();
    $statusCode = 500; // Default to Internal Server Error

    if (strpos($message, 'Invalid request method.') !== false ||
        strpos($message, 'Email or User ID not provided.') !== false ||
        strpos($message, 'Invalid email format.') !== false) {
        $statusCode = 400; // Bad Request
    } elseif (strpos($message, 'User not found.') !== false) {
        $statusCode = 404; // Not Found
    }

    http_response_code($statusCode);
    echo json_encode(['success' => false, 'message' => $message]);
}
?>