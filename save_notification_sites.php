<?php
header('Content-Type: application/json');

$user_file = 'user.json';

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Invalid request method.');
    }

    $request_data = json_decode(file_get_contents('php://input'), true);

    if (!isset($request_data['userId']) || !isset($request_data['siteIds'])) {
        throw new Exception('User ID or Site IDs not provided.');
    }

    $current_user_id = $request_data['userId'];
    $selected_site_ids = $request_data['siteIds'];

    if (!is_array($selected_site_ids)) {
        throw new Exception('Site IDs must be an array.');
    }

    if (!file_exists($user_file)) {
        throw new Exception('User data file not found.');
    }
    $users_data = json_decode(file_get_contents($user_file), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error decoding user JSON.');
    }

    $user_found = false;
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

    if (file_put_contents($user_file, json_encode($users_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        throw new Exception('Failed to save user data.');
    }

    echo json_encode(['success' => true, 'message' => 'Notification sites updated successfully.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
?>