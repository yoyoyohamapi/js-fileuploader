<?php

header('Content-type:text/json');

// 允许跨域
header('Access-Control-Allow-Origin:*');


// 设置文件保存路径
const UPLOAD_DIR = './files/';
// 设置分片保存路径
const SHAREDS_BASE_DIR = './shareds/';

$sharedDir = SHAREDS_BASE_DIR.$_POST['hash'];

// 如果是合并请求
if($_POST['hash'] && !$_FILES) {
    // 设置合并文件名
    $uploadFile = UPLOAD_DIR.basename($_POST['hash']);
    // 如果已经合并的文件已经存在了,删除,防止合并错误
    if(file_exists($uploadFile)) {
        unlink($uploadFile);
    }
    // 遍历分片文件夹下的文件
    for ($i = 1, $total = $_POST['count']; $i <= $total; $i++) {
        $sharedFile = $sharedDir."/$i";
        if (!file_put_contents($uploadFile, file_get_contents($sharedFile), FILE_APPEND)) {
            header("HTTP/1.0 500 INTERNAL ERROR");
            echo json_encode('error');
        }
    }
    header('HTTP/1.0 200 OK');
    return  json_encode('ok');
}


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
    header('HTTP/1.0 204 CREATED');
    return json_encode('ok');
} catch (Exception $e) {
    header("HTTP/1.0 500 INTERNAL ERROR");
    return  json_encode($e);
}
?>
