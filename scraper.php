<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

$log_file = 'scraper.log';
$user_file = 'user.json';
$notices_file = 'notices.json';
$new_notices_file = 'new_notices.json';

function write_log($message) {
    global $log_file;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($log_file, "[$timestamp] $message\n", FILE_APPEND);
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
        if (!is_array($old_notices)) $old_notices = [];
    }
    $existing_notices_set = [];
    foreach ($old_notices as $notice) {
        $existing_notices_set[$notice['title'] . '::' . $notice['site']] = true;
    }

    if (!file_exists($user_file)) throw new Exception("user.json 파일을 찾을 수 없습니다.");
    $users_data = json_decode(file_get_contents($user_file), true);
    if (json_last_error() !== JSON_ERROR_NONE) throw new Exception('user.json 파일 디코딩 오류: ' . json_last_error_msg());

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
    if (empty($sites_to_scrape)) throw new Exception("No sites are registered by any user.");

    $all_notices = [];
    $newly_added_notices = [];

    foreach ($sites_to_scrape as $site) {
        $site_name = $site['site_name'];
        $url = $site['site_url'];
        write_log("Scraping site: {$site_name} ({$url})");

        if (!isset($scraper_configs[$site_name])) {
            write_log("Warning: '{$site_name}' 사이트에 대한 스크레이퍼 설정이 없습니다. 건너뜁니다.");
            continue;
        }
        $config = $scraper_configs[$site_name];

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

        $dom = new DOMDocument();
        @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', $config['encoding']), LIBXML_NOWARNING | LIBXML_NOERROR);
        $xpath = new DOMXPath($dom);
        $rows = $xpath->query($config['list_selector']);
        write_log("Found " . $rows->length . " rows for {$site_name}.");

        foreach ($rows as $row) {
            $first_td = $xpath->query('.//td[1]', $row)->item(0);
            if ($first_td && !is_numeric(trim($first_td->textContent))) continue;

            $title_node = $xpath->query($config['title_selector'], $row)->item(0);
            $date_node = $xpath->query($config['date_selector'], $row)->item(0);

            if ($title_node && $date_node) {
                $title = trim($title_node->textContent);
                $date = date('Y-m-d', strtotime(trim($date_node->textContent)));
                $raw_url = trim($title_node->getAttribute('href'));

                if (filter_var($raw_url, FILTER_VALIDATE_URL)) {
                    $notice_url = $raw_url;
                } else {
                    $page_base_path = explode('?', $url)[0];
                    if (strpos($raw_url, './') === 0) {
                        $notice_url = $page_base_path . substr($raw_url, 2);
                    } else if ($raw_url[0] === '/') {
                        $parsed_url = parse_url($url);
                        $base_url = $parsed_url['scheme'] . '://' . $parsed_url['host'];
                        $notice_url = $base_url . $raw_url;
                    } else {
                         $notice_url = $page_base_path . $raw_url;
                    }
                }

                if (!empty($title) && $date !== '1970-01-01') {
                    $current_notice_key = $title . '::' . $site_name;
                    $notice_data = [
                        'date' => $date,
                        'title' => $title,
                        'site' => $site_name,
                        'notice_url' => $notice_url
                    ];
                    
                    $all_notices[] = $notice_data;

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

        if (file_put_contents($notices_file, json_encode($final_notices, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) === false) {
            throw new Exception('Failed to write to notices.json.');
        }
        write_log("Successfully updated notices.json with " . count($final_notices) . " total notices.");

    } else {
        write_log("No notices were scraped. 'notices.json' will not be updated to prevent data loss.");
    }

    if (file_put_contents($new_notices_file, json_encode($newly_added_notices, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) !== false) {
        write_log("Successfully created new_notices.json with ". count($newly_added_notices) . " new notices.");
    } else {
        throw new Exception('Failed to write to new_notices.json.');
    }

    echo "Successfully scraped and updated. Found " . count($newly_added_notices) . " new notices.";


} catch (Exception $e) {
    write_log("An error occurred: " . $e->getMessage());
    echo "An error occurred: " . $e->getMessage();
}

write_log("======== Scraper-Job-End ========\n");
?>
