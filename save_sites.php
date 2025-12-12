<?php
//사용자가 사이트 관리 페이지에서 수정한 사이트 목록을 저장하고 필요 시 스크래퍼 즉시 실행

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST method required.']);
    exit;
}

// 설정 및 파일 경로
$user_file = 'user.json';
$notices_file = 'notices.json';
$scraper_config_file = 'scraper_config.json';

try {
    // 입력 데이터 수신 및 유효성 검사
    $input_data = json_decode(file_get_contents('php://input'), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON received: ' . json_last_error_msg());
    }

    if (!isset($input_data['userId']) || !isset($input_data['sites'])) {
        throw new Exception('User ID or sites data not provided.');
    }
    $current_user_id = $input_data['userId'];
    $new_sites_raw = $input_data['sites'];

    $unique_sites = [];
    $normalized_urls_seen = [];

    foreach ($new_sites_raw as $site) {
        if (empty($site['site_url'])) {
            continue;
        }

        // URL을 파싱하여 정규화
        $url_parts = parse_url($site['site_url']);
        if ($url_parts === false) {
            continue; // Invalid URL, skip
        }

        // 쿼리 파라미터에서 불필요한 부분 제거
        if (isset($url_parts['query'])) {
            parse_str($url_parts['query'], $query_params);
            unset($query_params['GotoPage']);
            unset($query_params['skey']);
            unset($query_params['sval']);
            unset($query_params['ntt_tag']);
            $url_parts['query'] = http_build_query($query_params);
        }

        // 정규화된 URL 재조립
        $normalized_url = (isset($url_parts['scheme']) ? $url_parts['scheme'] . '://' : '') .
                          (isset($url_parts['host']) ? $url_parts['host'] : '');
        if (isset($url_parts['path'])) {
            $normalized_url .= $url_parts['path'];
        }
        if (isset($url_parts['query']) && !empty($url_parts['query'])) {
            $normalized_url .= '?' . $url_parts['query'];
        }
        // URL 끝에 '?'가 남는 경우 제거
        if (substr($normalized_url, -1) === '?') {
            $normalized_url = rtrim($normalized_url, '?');
        }

        if (!in_array($normalized_url, $normalized_urls_seen)) {
            $normalized_urls_seen[] = $normalized_url;
            // 정규화된 URL로 사이트 정보 업데이트 후 추가
            $site['site_url'] = $normalized_url;
            $unique_sites[] = $site;
        }
    }
    $new_sites = $unique_sites;

    if (!file_exists($user_file)) {
        throw new Exception('User data file not found.');
    }
    $users_data = json_decode(file_get_contents($user_file), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error decoding user JSON.');
    }

    // 사용자 정보 업데이트 및 이름 변경 감지
    $user_found = false;
    $name_changes = [];

    foreach ($users_data as &$user) {
        if ($user['id'] === $current_user_id) {
            $user_found = true;

            // 사이트 이름 변경을 감지하여 나중에 notices.json을 업데이트할 때 사용
            $old_sites = isset($user['registered_sites']) ? $user['registered_sites'] : [];
            $old_sites_map = [];
            foreach ($old_sites as $old_site) {
                if (isset($old_site['site_url'])) {
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

            $user['registered_sites'] = $new_sites;
            break;
        }
    }

    if (!$user_found) {
        throw new Exception('User not found.');
    }

    // 변경된 사용자 데이터를 user.json 파일에 저장
    if (file_put_contents($user_file, json_encode($users_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        throw new Exception('Failed to write to user data file.');
    }

    // 이름 변경 시 notices.json 업데이트
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

    // 모든 사용자의 사이트 정보를 다시 읽어 scraper_config.json 재생성
    $all_scraper_configs = [];
    $all_registered_site_names = [];

    foreach ($users_data as $user_info) {
        if (isset($user_info['registered_sites']) && is_array($user_info['registered_sites'])) {
            foreach ($user_info['registered_sites'] as $site) {
                if (!empty($site['site_url']) && !empty($site['notice_list_selector'])) {
                    $all_scraper_configs[$site['site_url']] = [
                        'encoding' => 'UTF-8',
                        'list_selector' => $site['notice_list_selector'],
                        'title_selector' => $site['notice_title_selector'],
                        'date_selector' => $site['notice_date_selector']
                    ];
                    // 삭제된 사이트의 공지를 정리하기 위해 현재 사용 중인 모든 사이트 이름을 추적
                    if (!in_array($site['site_name'], $all_registered_site_names)) {
                        $all_registered_site_names[] = $site['site_name'];
                    }
                }
            }
        }
    }

    // 업데이트된 스크래퍼 설정을 파일에 저장
    if (file_put_contents($scraper_config_file, json_encode($all_scraper_configs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
        error_log('Failed to update scraper_config.json.');
    } else {
        // 워커 즉시 실행
        $php_executable = 'C:\\php8\\php.exe';
        $worker_script_path = __DIR__ . '\\worker.php';

        if (file_exists($worker_script_path)) {
            $command = escapeshellcmd($php_executable) . ' ' . escapeshellarg($worker_script_path);
            pclose(popen("start /B " . $command, "r"));
        } else {
            error_log('worker.php not found for immediate execution.');
        }
    }

    // [추가] 삭제된 사이트의 공지사항 정리 - 사용자 편의성 
    if (file_exists($notices_file)) {
        $notices_data = json_decode(file_get_contents($notices_file), true);
        if ($notices_data) {
            $filtered_notices = array_filter($notices_data, function ($notice) use ($all_registered_site_names) {
                return in_array($notice['site'], $all_registered_site_names);
            });
            if (count($filtered_notices) !== count($notices_data)) {
                file_put_contents($notices_file, json_encode(array_values($filtered_notices), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            }
        }
    }

    echo json_encode(['success' => true, 'message' => 'Sites saved and scraper started.']);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

?>