<?php
//user.json 파일에서 특정 사용자의 모든 정보를 조회하여 JSON 형식으로 반환

header('Content-Type: application/json');
$user_file = 'user.json';

try {
    // 요청 유효성 검사
    if (!isset($_GET['user_id']) || empty($_GET['user_id'])) {
        throw new Exception('User ID is required.', 400);
    }
    // 현재 요청된 user_id 가져오기
    $current_user_id = $_GET['user_id'];

    // 데이터 파일 읽기
    if (!file_exists($user_file)) {
        throw new Exception('User data file not found.', 500);
    }
    $users_data = json_decode(file_get_contents($user_file), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error decoding user JSON: ' . json_last_error_msg(), 500);
    }

    // 사용자 검색 및 반환
    $found_user = null;
    foreach ($users_data as $user) {
        if ($user['id'] === $current_user_id) {
            $found_user = $user;
            break;
        }
    }

    if (!$found_user) {
        throw new Exception('User not found.', 404);
    }

    // 찾은 사용자 정보 반환
    echo json_encode($found_user);

} catch (Exception $e) {
    $statusCode = $e->getCode() >= 400 ? $e->getCode() : 500;
    http_response_code($statusCode);
    echo json_encode(['error' => $e->getMessage()]);
}
?>