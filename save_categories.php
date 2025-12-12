<?php
// 사용자가 설정한 카테고리 목록을 user.json 파일에 저장

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

    if (!isset($request_data['userId']) || !isset($request_data['categories'])) {
        throw new Exception('User ID or categories not provided.', 400);
    }

    $current_user_id = $request_data['userId'];
    $new_categories = $request_data['categories'];

    if (!is_array($new_categories)) {
        throw new Exception('Categories must be an array.', 400);
    }

    if (!file_exists($user_file)) {
        throw new Exception('User data file not found.', 500);
    }

    // 파일 잠금 및 데이터 처리
    $fp = fopen($user_file, 'r+');
    if (!$fp || !flock($fp, LOCK_EX)) {
        throw new Exception('Could not lock user file for writing.', 503);
    }

    // 파일 내용을 읽고 JSON 디코딩
    $users_data_json = fread($fp, filesize($user_file) ?: 1); // 파일이 비어있는 경우 에러 방지
    $users_data = json_decode($users_data_json, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error decoding user JSON.', 500);
    }

    // 해당 사용자를 찾아 카테고리 정보 업데이트
    $user_found = false;
    foreach ($users_data as &$user) {
        if ($user['id'] === $current_user_id) {
            $user['categories'] = $new_categories;
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
        throw new Exception('Failed to write to user data file.', 500);
    }

    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    $fp = null;

    echo json_encode(['success' => true, 'message' => 'Categories updated successfully.']);

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