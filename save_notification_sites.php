<?php
header('Content-Type: application/json');

$user_file = 'user.json';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method.');
    }

    $request_data = json_decode(file_get_contents('php://input'), true);

    // 필수 데이터 존재 여부 확인
    if (!isset($request_data['userId']) || !isset($request_data['siteIds'])) {
        throw new Exception('User ID or Site IDs not provided.');
    }

    $current_user_id = $request_data['userId'];
    $selected_site_ids = $request_data['siteIds'];

    if (!is_array($selected_site_ids)) {
        throw new Exception('Site IDs must be an array.');
    }

    // 사용자 데이터 파일 존재 여부 확인
    if (!file_exists($user_file)) {
        throw new Exception('User data file not found.');
    }
    $users_data = json_decode(file_get_contents($user_file), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error decoding user JSON.');
    }

    $user_found = false;
    // 사용자의 등록 사이트 알림 설정 업데이트
    foreach ($users_data as &$user) {
        if ($user['id'] === $current_user_id) {
            $user_found = true;
            if (isset($user['registered_sites']) && is_array($user['registered_sites'])) {
                foreach ($user['registered_sites'] as &$site) {
                    $site['receiveNotification'] = in_array($site['id'], $selected_site_ids);
                }
            }
            break;
        }
    }

    if (!$user_found) {
        throw new Exception('User not found.');
    }

    // 변경된 사용자 데이터를 JSON 파일에 저장
    if (file_put_contents($user_file, json_encode($users_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        throw new Exception('Failed to save user data.');
    }

    echo json_encode(['success' => true, 'message' => 'Notification sites updated successfully.']);

} catch (Exception $e) {
    //[수정] 에러 코드 구분 - 에러 명확화
    $message = $e->getMessage();
    $statusCode = 500;

    if (strpos($message, 'Invalid request method.') !== false ||
        strpos($message, 'User ID or Site IDs not provided.') !== false ||
        strpos($message, 'Site IDs must be an array.') !== false) {
        $statusCode = 400;
    } elseif (strpos($message, 'User data file not found.') !== false ||
              strpos($message, 'User not found.') !== false) {
        $statusCode = 404;
    }

    http_response_code($statusCode);
    echo json_encode(['success' => false, 'message' => $message]);
}
?>