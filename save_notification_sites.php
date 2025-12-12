<?php
//사용자가 알림 받기로 선택한 사이트 목록을 user.json 파일에 저장

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

    if (!isset($request_data['userId']) || !isset($request_data['siteIds'])) {
        throw new Exception('User ID or Site IDs not provided.', 400);
    }

    $current_user_id = $request_data['userId'];
    $selected_site_ids = $request_data['siteIds'];

    if (!is_array($selected_site_ids)) {
        throw new Exception('Site IDs must be an array.', 400);
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

    // 해당 사용자를 찾아 사이트별 알림 설정을 업데이트
    $user_found = false;
    foreach ($users_data as &$user) {
        if ($user['id'] === $current_user_id) {
            $user_found = true;
            if (isset($user['registered_sites']) && is_array($user['registered_sites'])) {
                foreach ($user['registered_sites'] as &$site) {
                    // 클라이언트에서 받은 ID 목록에 포함되어 있는지 여부에 따라 true/false 설정
                    $site['receiveNotification'] = in_array($site['id'], $selected_site_ids);
                }
            }
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


    echo json_encode(['success' => true, 'message' => 'Notification sites updated successfully.']);

} catch (Exception $e) {
    // 예외 처리
    if (isset($fp) && is_resource($fp)) {
        flock($fp, LOCK_UN);
        fclose($fp);
    }

    //[수정] 에러 코드 구분 - 에러 명확화
    $message = $e->getMessage();
    $statusCode = $e->getCode() >= 400 ? $e->getCode() : 500;

    http_response_code($statusCode);
    echo json_encode(['success' => false, 'message' => $message]);
}
?>