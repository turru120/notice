<?php
// get_sites.php

// 응답 헤더를 JSON으로 설정
header('Content-Type: application/json');

// 사용자 데이터 파일 경로
$user_file = 'user.json';

// GET 파라미터에서 현재 사용자 ID를 가져옵니다.
if (!isset($_GET['user_id']) || empty($_GET['user_id'])) {
    throw new Exception('User ID is required.');
}
$current_user_id = $_GET['user_id'];

try {
    // user.json 파일이 없는 경우 에러 처리
    if (!file_exists($user_file)) {
        throw new Exception('User data file not found.');
    }

    // user.json 파일 읽기
    $users_data = json_decode(file_get_contents($user_file), true);

    // JSON 디코딩 실패 시 에러 처리
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error decoding user JSON: ' . json_last_error_msg());
    }

    $found_user = null;

    // 현재 사용자를 찾아 전체 사용자 객체를 추출
    foreach ($users_data as $user) {
        if ($user['id'] === $current_user_id) {
            $found_user = $user;
            break;
        }
    }

    // 사용자를 찾지 못한 경우 에러 처리
    if (!$found_user) {
        throw new Exception('User not found.');
    }

    // 성공적으로 전체 사용자 객체를 JSON으로 출력
    echo json_encode($found_user);

} catch (Exception $e) {
    // 에러 발생 시 HTTP 500 상태 코드와 함께 에러 메시지를 JSON으로 출력
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

?>
