<?php
// new_notices.json에 있는 새로운 공지사항을 사용자들에게 이메일로 알림

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// PHPMailer 라이브러리 로드
require 'vendor/autoload.php';

// 이메일 전송 설정을 포함하는 설정 파일 로드
$config = require 'config.php';

// 설정 및 전역 변수
$log_file = 'scraper.log';
$user_file = 'user.json';
$new_notices_file = 'new_notices.json';

// 로그 기록
function write_log($message)
{
    global $log_file;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($log_file, "[" . $timestamp . "] [Notifier] " . $message . "\n", FILE_APPEND);
}

try {

    write_log("Notification script started.");

    // 새 공지사항 로드
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

    // 보낼 새로운 공지사항이 없는 경우 스크립트 종료
    if (empty($new_notices)) {
        write_log("No new notices to send. Exiting.");
        exit;
    }

    write_log(count($new_notices) . " new notices found. Proceeding with notification process.");

    // 사용자 데이터 로드
    if (!file_exists($user_file)) {
        write_log("Error: user.json not found. Exiting.");
        exit;
    }
    $users = json_decode(file_get_contents($user_file), true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        write_log("Error decoding user.json. Exiting.");
        exit;
    }

    // 사용자별 알림 처리
    foreach ($users as $user) {
        // 사용자가 이메일 수신 설정을 했고, 이메일 주소가 있으며, 등록한 사이트가 있는지 확인
        if (empty($user['notification']) || empty($user['email']) || empty($user['registered_sites'])) {
            continue;
        }

        write_log("Checking notifications for user: " . $user['id']);

        // 사용자가 알림을 받기로 설정한 사이트 이름 목록 생성
        $notification_sites = [];
        if (!empty($user['registered_sites'])) {
            foreach ($user['registered_sites'] as $site) {
                if (isset($site['receiveNotification']) && $site['receiveNotification'] === true) {
                    $notification_sites[] = $site['site_name'];
                }
            }
        }

        if (empty($notification_sites)) {
            write_log("User " . $user['id'] . " has no sites enabled for notifications. Skipping.");
            continue;
        }

        // 새 공지사항 중 사용자가 알림 설정한 사이트의 공지만 필터링
        $notices_for_user = [];
        foreach ($new_notices as $notice) {
            if (in_array($notice['site'], $notification_sites)) {
                $notices_for_user[] = $notice;
            }
        }

        // 사용자에게 보낼 공지사항이 있는 경우 이메일 발송
        if (!empty($notices_for_user)) {
            $mail = new PHPMailer(true);

            try {
                // [보완] 이메일 멘트 보완 - 사용자 편의성
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

                // PHPMailer 서버 설정
                $mail->isSMTP();
                $mail->Host = $config['smtp_host'];
                $mail->SMTPAuth = true;
                $mail->Username = $config['smtp_username'];
                $mail->Password = $config['smtp_password'];
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                $mail->Port = $config['smtp_port'];
                $mail->Timeout = 10;
                $mail->CharSet = 'UTF-8';

                // 발신자 및 수신자 설정
                $mail->setFrom($config['smtp_from_address'], $config['smtp_from_name']);
                $mail->addAddress($user['email'], $user['name']);

                // 이메일 내용 설정
                $mail->isHTML(false);
                $mail->Subject = $subject;
                $mail->Body = $message;

                $mail->send();
                write_log("Successfully sent email to " . $user['email'] . " with " . count($notices_for_user) . " notices.");
            } catch (Exception $e) {
                write_log("Failed to send email to " . $user['email'] . ". Mailer Error: {$mail->ErrorInfo}");
            }
        } else {
            write_log("No new notices for user: " . $user['id']);
        }
    }

    // 처리 완료 후 $new_notices_file 초기화
    file_put_contents($new_notices_file, json_encode([], JSON_PRETTY_PRINT));
    write_log("Cleared new_notices.json.");

} catch (Exception $e) {
    write_log("An unexpected error occurred: " . $e->getMessage());
}

write_log("======== Notification-Job-End ========\n");

echo "Notification script finished.";
?>