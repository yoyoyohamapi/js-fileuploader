(function (window) {
    // 将window传入立即执行函数体中
    // 即局部化window引用，提升运行时对window对象的查找速度
    window.FileUploader = FileUploader;

    var document = window.document;

    var MAX_SHARED_SIZE = 4 * 1024 * 1024;
    /*最大分片大小，4MB*/
    var MIN_SHARED_SIZE = 2 * 1024 * 2014;
    /*最小分片大小, 2MB*/

    // 文件状态
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
     * @return {string}
     */
    function getHash(file) {
        return file.name;
    }

    /**
     * 判断一个对象是否是函数
     * @param obj
     * @return {boolean}
     */
    function isFunction(obj) {
        return obj && (typeof(obj)).toLowerCase() === 'function';
    }

    // PolyFill bind
    if (typeof(Function.prototype.bind) !== 'function') {
        Function.prototype.bind = function (scope) {
            var args = Array.prototype.slice.call(arguments, 1);
            var func = this;
            return function () {
                func.apply(scope, args.concat(Array.prototype.slice.call(arguments)));
            }
        }
    }

    /**
     * 配置对象合并
     * @param src {object}
     * @param dst {object}
     */
    function extend(src, dst) {
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
     * @return {boolean}
     */
    function isValidUploader(input) {
        return input.nodeName.toLowerCase() === 'input' && input.getAttribute('type').toLowerCase() === 'file';
    }

    /**
     * Constructor
     * @param config mixed 配置对象
     */
    function FileUploader(config) {
        this.config = extend(config, BASE_CONFIG);
        if (this.config.sharedSize > MAX_SHARED_SIZE)
            this.config.sharedSize = MAX_SHARED_SIZE;
        else if (this.config.sharedSize < MIN_SHARED_SIZE)
            this.config.sharedSize = MIN_SHARED_SIZE;
        var input = document.querySelector(this.config.selector);

        // 验证输入框合法性
        if (!isValidUploader(input)) {
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
        // 当前请求队列
        this._requests = [];
        // 当前正在上传文件
        this.current = null;
        // 总的文件大小
        this.totalSize = 0;
        // 完成文件大小
        this.completedSize = 0;
        // 是否正在暂停中
        this._pausing = false;
        // 文件域监听
        this.input.addEventListener('change', function (e) {
            var newFiles = e.target.files;
            // 追加文件到文件列表
            var info = this._appendFiles(newFiles);
            this.totalSize += info.totalSize;
            // 刷新文件列表
            if (isFunction(this.config.refresh)) {
                this.config.refresh(info);
            }
        }.bind(this));
    }

    /**
     * 开始上传
     */
    FileUploader.prototype.start = function () {
        this._pausing = false;
        this._send();
        // 开始以后的回调
        var onStart = this.config.onStart;
        if (isFunction(onStart)) {
            onStart();
        }
    };

    /**
     * 发送文件
     * @private
     */
    FileUploader.prototype._send = function () {
        // 设置的当前应当上传的文件
        var current = null;
        if (this.current) {
            current = this.current;
        } else {
            for (var i = 0, length = this.files.length; i < length; i++) {
                var file = this.files[i];
                if (file.status === STATUS_WAIT) {
                    current = file;
                    break;
                }
            }
        }
        if (current) {
            // 如果分片已经发送完毕
            if (current.succeed === current.sharedCount)
                this._sendMerge(current);
            else
                this._sendFile(current);
        }
    };

    /**
     * 创建发送文件请求
     * @param file {object}
     * @param sharedSize {int}
     * @param sharedCount {int}
     * @private
     */
    FileUploader.prototype._createRequest = function (file, sharedSize, sharedCount) {
        var self = this,
            progressEach = this.config.progressEach,
            progressAll = this.config.progressAll,
            error = this.config.error,
            sendTo = this.config.url;
        // 初始化XMLHttpRequest对象
        var xhr = new XMLHttpRequest();
        // 设置xhr的错误回调
        xhr.onreadystatechange = function () {
            // 请求刚刚初始化完成, 如若此时为暂停发送态, 我们需要阻止其发送
            if (this.readyState === 0) {
                if (self._pausing) {
                    this.abort();
                }
            }
            else if (this.readyState === 4 && (this.status >= 200 && this.status < 300 || this.status === 302)) {
                // 更新当前文件的完成情况
                ++file.succeed;
                // 更新总体进度完成情况, 如果当前正在传送最后一片,需要单独考虑
                if (file.succeed === sharedCount)
                    self.completedSize += file.file.size - (sharedCount - 1) * sharedSize;
                else
                    self.completedSize += sharedSize;
                // 是否需要回调进度显示,
                if (isFunction(progressEach) && file.succeed !== sharedCount) {
                    progressEach(file.succeed, sharedCount, file);
                }
                // 是否需要回调总体进度显示
                if (isFunction(progressAll)) {
                    progressAll(self.completedSize, self.totalSize);
                }

                // 如果上传完成, 标识状态为"已完成", 此时发送一条合并请求
                if (file.succeed === sharedCount) {
                    // 发送一个合并请求
                    self._sendMerge(file);
                }
            } else if (this.readyState === 4 && (this.status >= 300 && this.status !== 302 || this.status === 0 )) {
                // 标识当前文件为等待上传
                file.status = STATUS_WAIT;
                this.abort();
                if (isFunction(error)) {
                    // 错误函数提供两个参数, 错误片及文件
                    error(shared, file);
                }
            }
        }.bind(xhr);

        xhr.open(
            'POST',
            sendTo,
            true
        );

        return xhr;
    };

    /**
     * 发送文件
     * @param file {object} 待发送文件
     * @private
     */
    FileUploader.prototype._sendFile = function (file) {
        // 如果正在暂停中, 不予发送,这里加一个判断是想尽早结束发送意愿
        if (this._pausing)
            return;
        var sharedSize = this.config.sharedSize,
            sharedCount = file.sharedCount;
        var formData = new FormData();
        formData.append('hash', file.hash);
        formData.append('name', file.file.name); // 文件名
        formData.append('count', sharedCount); // 总片数
        formData.append('data', ''); // 发送的文件
        formData.append('index', ''); // 当前是第几片
        for (var i = file.succeed; i < sharedCount; i++) {
            // 设置分片的起始和结束
            var start = i * sharedSize;
            var end = Math.min(file.file.size, start + sharedSize);
            formData.set('data', file.file.slice(start, end));
            formData.set('index', i + 1);
            var request = this._createRequest(file, sharedSize, sharedCount);
            request.send(formData);
        }
    };

    /**
     * 发送一条合并请求
     * @param file {object}
     * @private
     */
    FileUploader.prototype._sendMerge = function (file) {
        if (this._pausing)
            return;
        var url = this.config.mergeUrl || this.config.url,
            hash = file.hash,
            count = file.sharedCount,
            progressEach = this.config.progressEach,
            progressAll = this.config.progressAll,
            success = this.config.success,
            error = this.config.error,
            self = this;
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (this.readyState === 4 && (this.status < 300 || this.status === 302)) {
                if (isFunction(progressEach)) {
                    progressEach(file.sharedCount, file.sharedCount, file);
                }
                if (isFunction(progressAll)) {
                    progressAll(self.completedSize, self.totalSize);
                }
                // 标识当前文件发送完毕
                file.status = STATUS_FINISHED;
                // 当前待上传文件移位
                self.current = self.files[file.index + 1];
                // 标识当前文件已完成
                if(isFunction(success))
                    success(file);
                // 发送下一个文件
                self._send();
            } else if (this.readyState === 4 && this.status > 300 && this.status !== 302) {
                // 标识当前文件为等待上传
                file.status = STATUS_WAIT;
                // 清除任务
                if (isFunction(error)) {
                    error(file);
                }
            }
        }.bind(xhr);
        var formData = new FormData();
        formData.append('hash', hash);
        formData.append('count', count);
        xhr.open(
            'POST',
            url,
            true
        );
        xhr.send(formData);
    };

    /**
     * 添加文件至待发送列表
     * 其中,添加的文件不能重复
     * @param files {Array} 待添加文件序列
     * @return mixed
     */
    FileUploader.prototype._appendFiles = function (files) {
        var totalSize = 0;
        var src = this.files;
        // 包裹后的新文件
        var wrapped = [];
        outer:
            for (var i = 0; i < files.length; i++) {
                var file = files[i];
                var hash = getHash(file);
                // 根据文件hash判定文件是否存在
                for (var j = 0; j < src.length; j++) {
                    var srcFile = src[j];
                    if (hash === srcFile.hash) {
                        continue outer;
                    }
                }
                file = {
                    file: file,
                    status: STATUS_WAIT, // 初始状态为 "等待上传"
                    hash: hash,
                    succeed: 0, // 该文件完成片数,
                    sharedCount: Math.ceil(file.size / this.config.sharedSize),// 该文件的总片数
                    index: src.length + i // 标识文件在序列中的位置, 便于删除
                };
                wrapped.push(file);
                // 刷新总文件大小
                totalSize += file.file.size;
            }
        this.files = src.concat(wrapped);
        return {
            totalSize: totalSize,
            newFiles: wrapped
        };
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
    FileUploader.prototype.pause = function () {
        this._pausing = true;
        var onPause = this.config.onPause;
        if (isFunction(onPause)) {
            // 暂停回调提供一个当前暂停的文件
            onPause(this.current);
        }
    };

    /**
     * 继续上传文件
     */
    FileUploader.prototype.resume = function () {
        this.start();
    };

    FileUploader.prototype.remove = function (file, callback) {
        // 删除某个文件
        this.files.slice(file.index, 1);
        // 删除完成的回调
        if (isFunction(callback)) {
            callback();
        }
    };

    return FileUploader;
})(window);
