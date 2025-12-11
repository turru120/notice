<?php
header('Content-Type: application/json');

$user_file = 'user.json';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method.');
    }

    $request_data = json_decode(file_get_contents('php://input'), true);

    // 필수 데이터 존재 여부 확인
    if (!isset($request_data['userId']) || !isset($request_data['categories'])) {
        throw new Exception('User ID or categories not provided.');
    }

    $current_user_id = $request_data['userId'];
    $new_categories = $request_data['categories'];

    if (!is_array($new_categories)) {
        throw new Exception('Categories must be an array.');
    }

    if (!file_exists($user_file)) {
        throw new Exception('User data file not found.');
    }

    // 파일 잠금 설정
    $fp = fopen($user_file, 'r+');
    if (!flock($fp, LOCK_EX)) {
        throw new Exception('Could not lock user file!');
    }

    $users_data_json = fread($fp, filesize($user_file));
    $users_data = json_decode($users_data_json, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        flock($fp, LOCK_UN);
        fclose($fp);
        throw new Exception('Error decoding user JSON.');
    }

    $user_found = false;
    foreach ($users_data as &$user) {
        if ($user['id'] === $current_user_id) {
            $user['categories'] = $new_categories;
            $user_found = true;
            break;
        }
    }

    if (!$user_found) {
        flock($fp, LOCK_UN);
        fclose($fp);
        throw new Exception('User not found.');
    }

    ftruncate($fp, 0);
    rewind($fp);

    if (fwrite($fp, json_encode($users_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        flock($fp, LOCK_UN);
        fclose($fp);
        throw new Exception('Failed to save user data.');
    }

    // 잠금 해제 및 파일 닫기
    flock($fp, LOCK_UN);
    fclose($fp);

    echo json_encode(['success' => true, 'message' => 'Categories updated successfully.']);

} catch (Exception $e) {
    if (isset($fp) && is_resource($fp)) {
        flock($fp, LOCK_UN);
        fclose($fp);
    }

    $message = $e->getMessage();
    $statusCode = 500;

    if (
        strpos($message, 'Invalid request method.') !== false ||
        strpos($message, 'User ID or categories not provided.') !== false ||
        strpos($message, 'Categories must be an array.') !== false
    ) {
        $statusCode = 400;
    } elseif (strpos($message, 'User not found.') !== false) {
        $statusCode = 404;
    }

    http_response_code($statusCode);
    echo json_encode(['success' => false, 'message' => $message]);
}
?>