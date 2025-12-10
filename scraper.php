<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$log_file = 'scraper.log';
$user_file = 'user.json';
$notices_file = 'notices.json';
$new_notices_file = 'new_notices.json';

function write_log($message)
{
    global $log_file;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($log_file, "[$timestamp] $message\n", FILE_APPEND);
}

function resolve_url($base_url, $relative_url)
{
    // 상대경로 URL 변환 로직
    if (filter_var($relative_url, FILTER_VALIDATE_URL)) {
        return $relative_url;
    }

    $base_parts = parse_url($base_url);
    if (empty($base_parts['scheme']) || empty($base_parts['host'])) {
        return $relative_url;
    }
    $scheme = $base_parts['scheme'];
    $host = $base_parts['host'];

    if (substr($relative_url, 0, 1) === '/') {
        return $scheme . '://' . $host . $relative_url;
    }

    $path = isset($base_parts['path']) ? $base_parts['path'] : '/';

    $last_slash_pos = strrpos($path, '/');
    $base_path_dir = ($last_slash_pos !== false) ? substr($path, 0, $last_slash_pos + 1) : '/';

    if (substr($relative_url, 0, 2) === './') {
        $relative_url = substr($relative_url, 2);
    }

    return $scheme . '://' . $host . $base_path_dir . $relative_url;
}

write_log("======== Scraper-Job-Start ========");

try {
    $scraper_config_file = 'scraper_config.json';
    if (!file_exists($scraper_config_file)) {
        throw new Exception("Scraper config file not found: {$scraper_config_file}");
    }
    $scraper_configs = json_decode(file_get_contents($scraper_config_file), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Error decoding scraper_config.json: ' . json_last_error_msg());
    }

    $old_notices = [];
    if (file_exists($notices_file)) {
        $old_notices_json = file_get_contents($notices_file);
        $old_notices = json_decode($old_notices_json, true);
        if (!is_array($old_notices))
            $old_notices = [];
    }
    $existing_notices_set = [];
    foreach ($old_notices as $notice) {
        $existing_notices_set[$notice['title'] . '::' . $notice['site']] = true;
    }

    if (!file_exists($user_file))
        throw new Exception("user.json 파일을 찾을 수 없습니다.");
    $users_data = json_decode(file_get_contents($user_file), true);
    if (json_last_error() !== JSON_ERROR_NONE)
        throw new Exception('user.json 파일 디코딩 오류: ' . json_last_error_msg());

    $sites_to_scrape = [];
    foreach ($users_data as $user) {
        if (isset($user['registered_sites']) && is_array($user['registered_sites'])) {
            foreach ($user['registered_sites'] as $site) {
                if (!isset($sites_to_scrape[$site['site_url']])) {
                    $sites_to_scrape[$site['site_url']] = $site;
                }
            }
        }
    }
    if (empty($sites_to_scrape))
        throw new Exception("No sites are registered by any user.");

    $all_notices = [];
    $newly_added_notices = [];

    // 등록된 모든 사이트를 순회하며 공지사항을 스크랩
    foreach ($sites_to_scrape as $site) {
        $site_name = $site['site_name'];
        $url = $site['site_url'];
        write_log("Scraping site: {$site_name} ({$url})");

        if (!isset($scraper_configs[$site_name])) {
            write_log("Warning: '{$site_name}' 사이트에 대한 스크레이퍼 설정이 없습니다. 건너뜁니다.");
            continue;
        }
        $config = $scraper_configs[$site_name];

        // 사이트의 HTML 내용을 가져옴
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36');
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        $html = curl_exec($ch);
        if (curl_errno($ch)) {
            write_log("cURL Error for {$site_name}: " . curl_error($ch));
            curl_close($ch);
            continue;
        }
        curl_close($ch);

        // 설정된 선택자로 공지사항 목록을 찾음
        $dom = new DOMDocument();
        @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', $config['encoding']), LIBXML_NOWARNING | LIBXML_NOERROR);
        $xpath = new DOMXPath($dom);
        $rows = $xpath->query($config['list_selector']);
        write_log("Found " . $rows->length . " rows for {$site_name}.");

        foreach ($rows as $row) {
            $title_node = $xpath->query($config['title_selector'], $row)->item(0);
            $date_node = $xpath->query($config['date_selector'], $row)->item(0);

            if ($title_node && $date_node) {
                $title = trim($title_node->textContent);
                $raw_url = trim($title_node->getAttribute('href'));

                // [보완] 날짜 형식이 표준이 아닌 경우 스크래핑하는 날짜로, 기존 데이터 있으면 그 날짜로 유지 - 사용자 혼란 방지
                $date_text = trim($date_node->textContent);
                $parsed_timestamp = strtotime($date_text);
                $scraped_date = date('Y-m-d');

                if ($parsed_timestamp === false || date('Y', $parsed_timestamp) < 2000) {
                    $date = $scraped_date;
                    foreach ($old_notices as $old_notice) {
                        if (isset($old_notice['title']) && isset($old_notice['site']) && $old_notice['title'] === $title && $old_notice['site'] === $site_name && $old_notice['date'] !== '1970-01-01') {
                            $date = $old_notice['date'];
                            break;
                        }
                    }
                } else {
                    $date = date('Y-m-d', $parsed_timestamp);
                }

                // 절대/상대 경로를 판단해 완전한 공지사항 URL을 생성
                $notice_url = resolve_url($url, $raw_url);

                if (!empty($title)) {
                    $current_notice_key = $title . '::' . $site_name;
                    $notice_data = [
                        'date' => $date,
                        'title' => $title,
                        'site' => $site_name,
                        'notice_url' => $notice_url
                    ];

                    $all_notices[] = $notice_data;

                    // 기존에 없던 새로운 공지사항인지 확인
                    if (!isset($existing_notices_set[$current_notice_key])) {
                        $newly_added_notices[] = $notice_data;
                    }
                }
            }
        }
    }

    write_log("Total notices scraped: " . count($all_notices));
    write_log("New notices found: " . count($newly_added_notices));

    if (count($all_notices) > 0) {
        usort($all_notices, fn($a, $b) => strtotime($b['date']) - strtotime($a['date']));

        $final_notices = [];
        foreach ($all_notices as $notice) {
            $unique_string = $notice['title'] . '::' . $notice['notice_url'];
            $final_notices[] = array_merge(['id' => crc32($unique_string)], $notice);
        }

        write_log("Attempting to write " . count($final_notices) . " notices to notices.json.");
        if (file_put_contents($notices_file, json_encode($final_notices, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
            write_log("Failed to write to notices.json.");
            throw new Exception('Failed to write to notices.json.');
        }
        write_log("Successfully updated notices.json with " . count($final_notices) . " total notices.");

    } else {
        write_log("No notices were scraped. 'notices.json' will not be updated to prevent data loss.");
    }

    write_log("Attempting to write " . count($newly_added_notices) . " new notices to new_notices.json.");
    if (file_put_contents($new_notices_file, json_encode($newly_added_notices, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) !== false) {
        write_log("Successfully created new_notices.json with " . count($newly_added_notices) . " new notices.");
    } else {
        write_log("Failed to write to new_notices.json.");
        throw new Exception('Failed to write to new_notices.json.');
    }

    echo "Successfully scraped and updated. Found " . count($newly_added_notices) . " new notices.";


} catch (Exception $e) {
    write_log("An error occurred: " . $e->getMessage());
    echo "An error occurred: " . $e->getMessage();
}

write_log("======== Scraper-Job-End ========\n");
?>