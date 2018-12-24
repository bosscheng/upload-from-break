/*
* author: wancheng
* date: 12/10/18
* desc:
*/


/**
 * 需要
 * 1.上传片段的链接  /range
 * 2.上传一个总大小的链接 /total
 * 3.删除操作  /delete
 * 4.获取上传进度（百分比） /now
 *
 */
!(function () {

    // 文件分割的大小
    var FILE_SPLIT_SIZE = 1024 * 1024 * 1;

    function Upload(options) {
        options = options || {};
        this.parseJSON(options);
    }


    Upload.prototype = {
        constructor: Upload,

        //
        parseJSON: function (options) {
            this.fileName = options.fileName;
            this.file = options.file;
            this.start = options.start;
            this.flagCancel = options.flagCancel;
            this.uploadPercent = options.uploadPercent || 0;
            this.fileId = options.fileId;  // 文件id，服务器端返回的文件id
        },

        // 执行上传操作
        save: function (onSuccess, onError, params) {
            params = params || {};
            var file = this.file;
            var fileSize = file.size;
            this.start = this.start || 0;
            var end = 0;
            var sendEnd = 0;
            var that = this;

            function _funFileSize(options) {

                // 分割的长度 大于 分割的长度
                if ((that.start + FILE_SPLIT_SIZE) >= fileSize) {
                    end = fileSize - 1;
                    sendEnd = fileSize;
                } else {
                    sendEnd = end = that.start + FILE_SPLIT_SIZE;
                }

                // 文件请求头
                var requestHeader = {
                    'Data-Range': that.start + '-' + end,
                    'Data-Length': fileSize
                };
                //
                if (options.fileId) {
                    requestHeader['Data-Id'] = options.fileId;
                    this.fileId = options.fileId;
                }


                var form = new FormData();

                form.append('upload', file.slice(that.start, sendEnd), file.name);

                // http 请求，用formdata
                ajax({
                    url: '/range',
                    method: 'post',
                    header: requestHeader,
                    data: form
                }).then(function (data) {
                    data = data || {};
                    if (data.code === 0) {
                        var fileId = data.fileId;
                        var value = data.value;

                        // 文件上传成功
                        if (that.start + FILE_SPLIT_SIZE >= fileSize) {
                            var successOptions = {
                                fileId: fileId,
                                value: value
                            };

                            // 需要上传总大小
                            ajax.post('/total', {
                                fileId: fileId,
                                total: fileSize,
                                resourceName: that.fileName
                            }).then(function (value2) {
                                //
                                if (value2.code === 0) {
                                    onSuccess(successOptions);
                                } else {
                                    onError();
                                    return;
                                }
                            }).catch(function (reason) {
                                onError();
                                return;
                            })
                        }
                        // 取消操作（优先级低于文件的上传完成）
                        else if (that.flagCancel === true) {

                            ajax.post('/delete', {
                                fileId: fileId
                            }).then(function (value2) {

                            });
                            return;
                        }
                        // 继续上传，分割的文件
                        else {
                            that.start += FILE_SPLIT_SIZE;
                            var _options = {
                                fileId: fileId
                            };
                            _funFileSize(_options);
                        }
                    } else {
                        onError();
                        return;
                    }

                })
            }

            _funFileSize(params);
        },
        // 放弃上传
        cancel: function () {
            this.flagCancel = true;
        },

        // 获取上传百分比
        getUploadProgress: function (upload) {
            return ajax.get('/now?fileId=' + upload.fileId);
        }
    };


    Upload.create = function (data) {
        return new Upload(data);
    };


    // RequireJS && SeaJS
    if (typeof define === 'function') {
        define(function () {
            return Upload;
        });
        // NodeJS
    } else if (typeof exports !== 'undefined') {
        module.exports = Upload;
    } else {
        // browser
        window.Upload = Upload;
    }

})();
