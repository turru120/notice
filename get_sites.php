<?php
header('Content-Type: application/json');
$user_file = 'user.json';
if (!isset($_GET['user_id']) || empty($_GET['user_id'])) {
    throw new Exception('User ID is required.');
}
//현재 요청된 user_id 가져오기
$current_user_id = $_GET['user_id'];

try {
    if (!file_exists($user_file)) {
        throw new Exception('User data file not found.');
    }

    $users_data = json_decode(file_get_contents($user_file), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error decoding user JSON: ' . json_last_error_msg());
    }

    $found_user = null;

    // 요청된 user_id와 일치하는 사용자 찾기
    foreach ($users_data as $user) {
        if ($user['id'] === $current_user_id) {
            $found_user = $user;
            break;
        }
    }

    if (!$found_user) {
        throw new Exception('User not found.');
    }

    //찾은 사용자 정보 반환
    echo json_encode($found_user);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

?>