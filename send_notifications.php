<?php
// 목표: new_notices.json 파일을 읽어, 알림을 설정한 사용자에게 이메일로 새 공지사항을 전송합니다.

// PHPMailer 클래스 로드
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';

// 설정 파일 로드
$config = require 'config.php';

ini_set('display_errors', 1);
error_reporting(E_ALL);

$log_file = 'scraper.log';
$user_file = 'user.json';
$new_notices_file = 'new_notices.json';

// 로그 함수
function write_log($message) {
    global $log_file;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($log_file, "[" . $timestamp . "] [Notifier] " . $message . "\n", FILE_APPEND);
}

write_log("Notification script started.");

// 1. 새 공지사항 파일 확인
if (!file_exists($new_notices_file)) {
    write_log("new_notices.json not found. Exiting.");
    exit;
}

$new_notices_json = file_get_contents($new_notices_file);
$new_notices = json_decode($new_notices_json, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($new_notices)) {
    write_log("Error decoding new_notices.json or it's not an array. Exiting.");
    exit;
}

// 새 공지사항이 없으면 종료
if (empty($new_notices)) {
    write_log("No new notices to send. Exiting.");
    exit;
}

write_log(count($new_notices) . " new notices found. Proceeding with notification process.");

// 2. 사용자 정보 로드
if (!file_exists($user_file)) {
    write_log("Error: user.json not found. Exiting.");
    exit;
}
$users = json_decode(file_get_contents($user_file), true);
if (json_last_error() !== JSON_ERROR_NONE) {
    write_log("Error decoding user.json. Exiting.");
    exit;
}

// 3. 사용자별 알림 전송
foreach ($users as $user) {
    // 알림 설정이 켜져 있고, 이메일 주소가 있으며, 등록된 사이트가 있는지 확인
    if (empty($user['notification']) || empty($user['email']) || empty($user['registered_sites'])) {
        continue;
    }

    write_log("Checking notifications for user: " . $user['id']);

    // 사용자가 알림을 받기로 설정한 사이트 목록 필터링
    $notification_sites = [];
    if (!empty($user['registered_sites'])) {
        foreach ($user['registered_sites'] as $site) {
            // receiveNotification 플래그가 true인 사이트의 이름만 추출합니다.
            if (isset($site['receiveNotification']) && $site['receiveNotification'] === true) {
                $notification_sites[] = $site['site_name'];
            }
        }
    }

    // 알림을 받기로 한 사이트가 없으면 다음 사용자로 넘어갑니다.
    if (empty($notification_sites)) {
        write_log("User " . $user['id'] . " has no sites enabled for notifications. Skipping.");
        continue;
    }

    // 사용자에게 보낼 공지사항 목록
    $notices_for_user = [];
    foreach ($new_notices as $notice) {
        // 새 공지의 사이트 이름이 사용자가 알림받기로 한 사이트 목록에 있는지 확인합니다.
        if (in_array($notice['site'], $notification_sites)) {
            $notices_for_user[] = $notice;
        }
    }

    // 보낼 공지사항이 있으면 이메일 전송
    if (!empty($notices_for_user)) {
        $to = $user['email'];
        $subject = "[공지사항] " . count($notices_for_user) . "개의 새로운 공지사항이 있습니다.";
        
        $message = "안녕하세요, " . $user['name'] . "님.\n\n";
        $message .= "즐겨찾기한 사이트에 새로운 공지사항이 등록되었습니다.\n\n";
        
        foreach ($notices_for_user as $notice) {
            $message .= "----------------------------------------\n";
            $message .= "사이트: " . $notice['site'] . "\n";
            $message .= "제목: " . $notice['title'] . "\n";
            $message .= "날짜: " . $notice['date'] . "\n";
        }
        
        $message .= "----------------------------------------\n\n";
        $message .= "자세한 내용은 웹사이트에서 확인해주세요.\n";

        // PHPMailer 인스턴스 생성
        $mail = new PHPMailer(true);

        try {
            // SMTP 서버 설정 (config.php 에서 읽어오기)
            $mail->isSMTP();
            $mail->Host       = $config['smtp_host'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $config['smtp_username'];
            $mail->Password   = $config['smtp_password'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port       = $config['smtp_port'];

            // 문자 인코딩 설정
            $mail->CharSet = 'UTF-8';

            // 보내는 사람, 받는 사람 설정
            $mail->setFrom($config['smtp_from_address'], $config['smtp_from_name']);
            $mail->addAddress($user['email'], $user['name']);

            // 메일 내용
            $mail->isHTML(false); // 메일을 텍스트 형식으로 보냄
            $mail->Subject = $subject;
            $mail->Body    = $message;

            $mail->send();
            write_log("Successfully sent email to " . $to . " with " . count($notices_for_user) . " notices using PHPMailer.");
        } catch (Exception $e) {
            write_log("Failed to send email to " . $to . " using PHPMailer. Mailer Error: {$mail->ErrorInfo}");
        }
    } else {
        write_log("No new notices for user: " . $user['id']);
    }
}

// 처리가 끝난 후 new_notices.json 파일 비우기
file_put_contents($new_notices_file, json_encode([], JSON_PRETTY_PRINT));
write_log("Cleared new_notices.json.");

write_log("======== Notification-Job-End ========\n");

echo "Notification script finished.";
?>
