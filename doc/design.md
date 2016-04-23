## 文件分片上传设计

### 面向组件的状态设计
我们将以面向组件的思路来开发文件分片上传，在“文件上传”组件中，我们考虑在全局维护这些组件状态：

* ___config__: 配置信息
* ___input__: 持有一个文件输入框应用，为其绑定文件域的变化监听
* ___files__: 上传文件队列,满足多文件上传
* ___pausing__: 一个暂停标识,当组件落入暂停态时，未发送的XMLHttpRequest对象将会被终止
* ___current__: 当前正在上传文件, 提供便捷访问当前文件的能力
* ___totalSize__: 总传输文件大小
* ___completedSize__: 当前完成文件大小

对于文件对象，这样设计：

* __file__：持有一个HTML文件对象的应用
* __status__：当前文件状态
* __succeed__：当前文件的完成片数
* __sharedCount__： 当前文件的总片数
* __index__：文件在传输队列中的位置
* __hash__：文件的唯一索引

为使该组件与UI解耦，并且提供更可能多的扩展性， 组件的支持如下配置：

```javascript
var config = {
    // 文件框选择器, 支持CSS选择器
    selector: '#file',

    // 指定后端分片处理程序
    url: 'http://localhost:8080/demo/uploader.php',

	// 合并文件处理程序，默认为url
	mergeUrl: '',  

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
};
```

### 业务流程

1. 上传文件

![上传文件](http://7pulhb.com2.z0.glb.clouddn.com/jsfileuploader-%E4%B8%8A%E4%BC%A0%E6%96%87%E4%BB%B6.png)

2. 上传分片

![上传分片](http://7pulhb.com2.z0.glb.clouddn.com/jsfileuploader-%E4%B8%8A%E4%BC%A0%E5%88%86%E7%89%87.png)

3. 暂停上传

![暂停上传](http://7pulhb.com2.z0.glb.clouddn.com/jsfileuploader-%E6%9A%82%E5%81%9C%E4%B8%8A%E4%BC%A0.png)

4. 删除文件

![删除文件](http://7pulhb.com2.z0.glb.clouddn.com/jsfileuploader-%E5%88%A0%E9%99%A4%E6%96%87%E4%BB%B6.png)

5. 追加文件

![追加文件](http://7pulhb.com2.z0.glb.clouddn.com/jsfileuploader-%E8%BF%BD%E5%8A%A0%E6%96%87%E4%BB%B6.png)

6. 合并文件

![合并文件](http://7pulhb.com2.z0.glb.clouddn.com/jsfileuploader-%E5%90%88%E5%B9%B6%E6%96%87%E4%BB%B6.png)

