## JavaScript + HTML5 文件上传工具
----------

## IE 兼容
IE 10+

### 安装
```html
<script type="text/javascript" src="fileuploader.js"></script>
```

### demo启动
```
php -S localhost:8080
```

### 文件对象
在使用fileuploader的过程中, 注意__file__对象有如下属性:

```javascript
file = {
    file: File; // 持有的文件对象
    succeed: 10, // 当前文件完成片数
    sharedCount: 20, // 当前文件的总片数
    index: 0, // 当前文件在文件序列中的位置
    status: 0,// 文件状态: 0=>等待发送, 1=>发送中, 2=>发送完成, 3=>已删除
    hash: '' // 文件hash
}
```

### 配置说明
```javascript
var loader = new FileUploader({

    // 文件框选择器, 支持CSS选择器
    selector: '#file',

    // 指定后端分片处理程序
    url: 'http://localhost:8080/demo/uploader.php',

    // 分片大小,最小为2M(2*1024*1024), 最大为4M(4*1024*1024)
    sharedSize: 4 * 1024 * 1024,

    /**
     * 文件列表变动时回调
     * @param info {object} 变化信息
     * info.newFiles: 新的文件
     * info.totalSize: 当前上传队列的文件总大小
     */
    onAppend: function (info) {
      // ...
    },

    /**
     * 单个文件的上传进度回调
     * @param index {int} 当且上传分片的索引
     * @param total {int} 当前文件总的分片数
     * @param file {object} 当前上传的文件
     */
    progressEach: function (index, total, file) {
        // ...
    },

    /**
     * 文件队列的上传进度
     * @param completed {int} 已完成的文件队列字节数
     * @param total {int} 总的文件体积(字节)
     **/
    progressAll: function (completed, total) {
        // ...
    },

    /**
     * 文件上传成功以后的回调
     * @param file {object} 完成的文件
     **/
    success: function (file) {
        // ..
    },

    /**
     * 某个文件分片上传失败的回调
     * @param file {object} 失败的文件
     */
    error: function (file) {
        // ...
    },

    /**
     * 暂停之后的的回调
     */
    onPause: function () {
        // ...
    },

    /**
     * 开始/继续上传之后的回调
     */
    onStart: function () {
        // ...
    },

    /**
     * 删除文件后的回调
     * @param file {object} 删除的文件
     */
    onRemove: function(file) {
        // ...
    },
});
```

### API
```javascript
/**
 * 开始上传
 */
loader.start();

/**
 * 暂停上传
 */
loader.pause();

/**
 * 删除文件
 * @param index {int} 待删除文件索引
 */
loader.remove(index);

```