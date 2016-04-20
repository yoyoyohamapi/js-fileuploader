<?php

header('Content-type:text/json');

// 允许跨域
header('Access-Control-Allow-Origin:*');


// 设置文件保存路径
const UPLOAD_DIR = './files/';
// 设置分片保存路径
const SHAREDS_BASE_DIR = './shareds/';

$sharedDir = SHAREDS_BASE_DIR.$_POST['name'];

if (!file_exists($sharedDir)) {
    mkdir($sharedDir);
}

try {
    if (is_array($_FILES['data']['error'])) {
        throw new RuntimeException('Invalid parameters');
    }

    switch ($_FILES['data']['error']) {
        case UPLOAD_ERR_OK:
            break;
        case UPLOAD_ERR_NO_FILE:
            throw new RuntimeException('No file sent.');
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            throw new RuntimeException('Exceeded filesize limit.');
        default:
            throw new RuntimeException('Unknown errors');
    }

    // 存储分片
    $sharedName = $sharedDir.'/'.$_POST['index'];
    if (!move_uploaded_file($_FILES['data']['tmp_name'], $sharedName)) {
        throw new RuntimeException('File is invalid');
    };

    // 如果分片上传完毕, 则合并文件
    if ($_POST['index'] == $_POST['count']) {
        // 设置合并文件名
        $uploadFile = UPLOAD_DIR.basename($_POST['name']);
        // 遍历分片文件夹下的文件
        for ($i = 1, $total = $_POST['count']; $i <= $total; $i++) {
            $sharedFile = $sharedDir."/$i";
            if (!file_put_contents($uploadFile, file_get_contents($sharedFile), FILE_APPEND)) {
                header("HTTP/1.0 500 INTERNAL ERROR");
                echo json_encode('error');
            }
        }
    }

} catch (Exception $e) {
    header("HTTP/1.0 500 INTERNAL ERROR");
    echo json_encode($e);
}
?>
