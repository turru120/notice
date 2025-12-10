<?php
header('Content-Type: application/json');

$file = 'notices.json';

// 파일이 존재 여부 확인
if (file_exists($file)) {
    $lastModifiedTime = filemtime($file);
} else {
    $lastModifiedTime = 0;
}

// JSON 형식으로 최종 수정 시간 응답
echo json_encode(['last_modified' => $lastModifiedTime]);
?>
