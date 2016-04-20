(function (window) {
    // 将window传入立即执行函数体中
    // 即局部化window引用，提升运行时对window对象的查找速度
    window.FileUploader = FileUploader;

    var document = window.document;

    var MAX_SHARED_SIZE = 4194304;
    /*最大分片大小，4MB*/

    var STATUS_WAIT = 0,
        STATUS_PENDING = 1,
        STATUS_FINISHED = 2;

    var BASE_CONFIG = {
        selector: '',
        sharedSize: MAX_SHARED_SIZE /*分片大小，默认为4MB*/
    };

    /**
     * 获得文件的Hash值
     * @param file
     * @private
     */
    function _getHash(file) {
        return file.name;
    }

    /**
     * 创建一个实用函数,添加文件
     * 其中,添加的文件不能重复
     * @param src {Array} 源文件序列
     * @param files {Array} 待添加文件序列
     */
    function _appendFiles(src, files) {
        var totalSize = 0;

        outer:
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var hash = _getHash(file);
            // 根据文件hash判定文件是否存在
            for (var j = 0; j < src.length; j++) {
                var srcFile = src[j];
                if (hash === srcFile.hash) {
                    continue outer;
                }
            }
            src.push({
                file: file,
                status: STATUS_WAIT, // 初始状态为 "等待上传"
                hash: hash
            });
            // 刷新总文件大小
            totalSize += file.size;
        }
        return totalSize;
    }

    // PolyFill bind
    if (typeof(Function.prototype.bind) !== 'function') {
        Function.prototype.bind = function (scope) {
            var args = Array.prototype.slice.call(arguments, 1);
            var func = this;
            return function(){
                func.apply(scope, args.concat(Array.prototype.slice.call(arguments)));
            }
        }
    }


    /**
     * 配置对象合并
     * @param src {object}
     * @param dst {object}
     * @private
     */
    function _extend(src, dst) {
        for (var prop in dst) {
            if (dst.hasOwnProperty(prop) && !src[prop]) {
                src[prop] = dst[prop];
            }
        }
        return src;
    }

    /**
     * 验证文件框是否合法
     * @param input
     */
    function _isValidUploader(input) {
        return input.nodeName.toLowerCase() === 'input' && input.getAttribute('type').toLowerCase() === 'file';
    }

    /**
     * 显示上传进度
     *
     */
    function _showProgress(data) {

    }

    /**
     * 发送文件上传请求
     * @param fileInfo {object} 待上传文件的信息
     */
    function _sendFile(fileInfo) {
        var succeed = 0, // 成功片数
            sharedSize = fileInfo.sharedSize,
            sharedCount = Math.ceil(fileInfo.size / sharedSize);
        var formData = new FormData();
        formData.append('name', fileinfo.name); // 文件名
        formData.append('count', sharedCount); // 总片数
        formData.append('data', ''); // 发送的文件
        formData.append('index', ''); // 当前是第几片
        for (var i = 0; i < sharedCount; i++) {
            // 初始化XMLHttpRequest对象
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4 && (xhr.status < 300 || xhr.status === 302)) {
                    ++succeed;
                    // 是否需要回调进度显示
                    if (fileInfo.progressEach && typeof(fileInfo.progressEach) === 'function') {
                        fileInfo.progressEach(succeed, sharedCount);
                    }
                    // 如果上传完成, 标识状态
                    if(succeed === sharedCount) {
                        file.status = STATUS_FINISHED;
                    }
                } else if (xhr.status > 300 && xhr.status !== 302) {
                    if (typeof(fileInfo.error) === 'function') {
                        error(file);
                    }
                }
            }.bind(xhr);

            // 设置分片的起始和结束未知
            var start = i * sharedSize;
            var end = Math.min(size, start + sharedSize);
            formData.set('data', file.slice(start, end));
            formData.set('index', i + 1);
            xhr.open(
                'POST',
                fileInfo.sendTo,
                true
            );
            xhr.send(formData);
        }
    }

    /**
     * Constructor
     * @param config mixed 配置对象
     */
    function FileUploader(config) {
        this.config = _extend(config, BASE_CONFIG);
        var input = document.querySelector(this.config.selector);

        // 验证输入框合法性
        if (!_isValidUploader(input)) {
            throw new Error('invalid input object');
        }

        // 验证分片大小合法性
        if (!this.config.sharedSize > MAX_SHARED_SIZE) {
            this.config.sharedSize = MAX_SHARED_SIZE;
        }

        // 绑定文件输入框
        this.input = input;
        // 当前文件队列
        this.files = [];
        // 当前正在上传文件
        this.current = null;
        // 总的文件大小
        this.totalSize = 0;
        // 文件域监听
        this.input.addEventListener('change', function (e) {
            this.totalSize = _appendFiles(this.files, e.target.files);
            // 刷新文件列表
            if(this.config.refresh && typeof(this.config.refresh) === 'function') {
                this.config.refresh();
            }
        }.bind(this));
    }


    /**
     * 开始上传
     * @param success {function}
     * @param error {function}
     */
    FileUploader.prototype.upload = function (success, error) {
        for (var i = 0, length = this.files.length; i < length; i++) {
            var file = this.files[i];
            // 只有等待上传的文件才能进行上传
            if (file.status === STATUS_WAIT) {
                file.status = STATUS_PENDING;
                _sendFile({
                    name: file.name,
                    size: file.size,
                    sharedSize: this.config.sharedSize,
                    sendTo: this.config.url
                })
            }
        }
    };

    /**
     * 停止上传
     *
     */
    FileUploader.prototype.stop = function () {

    };

    /**
     * 暂停上传
     *
     */
    FileUploader.prototype.pause = function (file) {

    };

    /**
     * 继续上传文件
     *
     */
    FileUploader.prototype.resume = function (file) {
        //从当前文件开始上传
    };



    FileUploader.prototype.remove = function (file) {
        // 删除某个文件

    };

    return FileUploader;
})(window);
