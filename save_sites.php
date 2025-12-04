<?php
// save_sites.php (Corrected Version)

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST method required.']);
    exit;
}

$user_file = 'user.json';
$notices_file = 'notices.json';
$scraper_config_file = 'scraper_config.json';

try {
    // --- Input Data Processing ---
    $input_data = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON received: ' . json_last_error_msg());
    }

    if (!isset($input_data['userId']) || !isset($input_data['sites'])) {
        throw new Exception('User ID or sites data not provided.');
    }
    $current_user_id = $input_data['userId'];
    $new_sites = $input_data['sites'];

    // --- user.json Processing ---
    if (!file_exists($user_file)) {
        throw new Exception('User data file not found.');
    }
    $users_data = json_decode(file_get_contents($user_file), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error decoding user JSON.');
    }

    $user_found = false;
    $name_changes = [];

    foreach ($users_data as &$user) {
        if ($user['id'] === $current_user_id) {
            $user_found = true;
            
            // Site name change detection logic (remains the same)
            $old_sites = isset($user['registered_sites']) ? $user['registered_sites'] : [];
            $old_sites_map = [];
            foreach ($old_sites as $old_site) {
                if (isset($old_site['site_name'])) {
                    $old_sites_map[$old_site['site_url']] = $old_site['site_name'];
                }
            }
            foreach ($new_sites as $new_site) {
                if (isset($new_site['site_url']) && isset($old_sites_map[$new_site['site_url']])) {
                    $old_name = $old_sites_map[$new_site['site_url']];
                    $new_name = $new_site['site_name'];
                    if ($old_name !== $new_name) {
                        $name_changes[] = ['old' => $old_name, 'new' => $new_name];
                    }
                }
            }

            // Update user's registered sites
            $user['registered_sites'] = $new_sites;
            break;
        }
    }

    if (!$user_found) {
        throw new Exception('User not found.');
    }

    // Save user.json
    if (file_put_contents($user_file, json_encode($users_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        throw new Exception('Failed to write to user data file.');
    }

    // --- notices.json Update Logic (remains the same) ---
    if (!empty($name_changes) && file_exists($notices_file)) {
        $notices_data = json_decode(file_get_contents($notices_file), true);
        if ($notices_data) {
            $notices_updated = false;
            foreach ($notices_data as &$notice) {
                foreach ($name_changes as $change) {
                    if (isset($notice['site']) && $notice['site'] === $change['old']) {
                        $notice['site'] = $change['new'];
                        $notices_updated = true;
                    }
                }
            }
            if ($notices_updated) {
                file_put_contents($notices_file, json_encode($notices_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            }
        }
    }

    // --- [CORRECTED] scraper_config.json Update Logic ---
    $scraper_configs = [];
    if (file_exists($scraper_config_file)) {
        $scraper_configs = json_decode(file_get_contents($scraper_config_file), true);
        if (!is_array($scraper_configs)) {
            $scraper_configs = []; // In case the file is empty or corrupt
        }
    }

    // Add or update the config with the user's newly saved sites
    foreach ($new_sites as $site) {
        if (!empty($site['site_name']) && !empty($site['notice_list_selector'])) {
            $scraper_configs[$site['site_name']] = [
                // Add any other scraper-specific fields here if needed, like encoding
                'encoding' => 'UTF-8', // Assuming default, can be a field later
                'list_selector' => $site['notice_list_selector'],
                'title_selector' => $site['notice_title_selector'],
                'date_selector' => $site['notice_date_selector']
            ];
        }
    }

    // Save the updated map back to scraper_config.json
    if (file_put_contents($scraper_config_file, json_encode($scraper_configs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        error_log('Failed to update scraper_config.json.');
    } else {
        // --- [CORRECTED] Trigger Scraper ---
        $php_executable = 'C:\\php8\\php.exe';
        $scraper_script_path = __DIR__ . '\\scraper.php';
        
        if (file_exists($scraper_script_path)) {
            $command = escapeshellcmd($php_executable) . ' ' . escapeshellarg($scraper_script_path);
            pclose(popen("start /B " . $command, "r"));
        } else {
            error_log('scraper.php not found for immediate execution.');
        }
    }

    // Success response
    echo json_encode(['success' => true, 'message' => 'Sites saved and scraper started.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

?>
