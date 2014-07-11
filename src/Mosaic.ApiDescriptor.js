(function(require) {
    "use strict";

    var Mosaic = module.exports = require('mosaic-commons');
    require('./Mosaic.PathMapper');
    var _ = require('underscore');

    var P = Mosaic.P;
    var Class = Mosaic.Class;
    var PathMapper = Mosaic.PathMapper;
    var Errors = Mosaic.Errors;

    var ApiDescriptor = Mosaic.ApiDescriptor = Class.extend({
        initialize : function() {
            this._config = {};
            this.mapper = new PathMapper();
        },
        add : function(pathMask, http, method) {
            var conf = this._config[pathMask] = this._config[pathMask] || {};
            conf[http] = method;
            this.mapper.add(pathMask, conf);
            return this;
        },
        get : function(path) {
            return this.mapper.find(path);
        }
    });

    var HttpServerStub = ApiDescriptor.HttpServerStub = Class
            .extend({
                initialize : function(descriptor, options) {
                    this.options = options || {};
                    this.descriptor = descriptor;
                },
                handle : function(req, res) {
                    var that = this;
                    P.then(function() {
                        return that._doHandle(req, res);
                    }).then(function(obj) {
                        res.send(200, obj || '');
                    }, function(err) {
                        var errObj = Errors.toJSON(err);
                        var code = errObj.code || 500;
                        res.send(code, errObj);
                    }).done();
                },
                _getInstance : function(req, res, method, urlParams) {
                    var options = this.options || {};
                    var instance = options.instance || this;
                    return instance;
                },
                _callMethod : function(method, urlParams, req, res) {
                    var instance = this._getInstance(req, res, method,
                            urlParams);
                    var f = instance[method];
                    if (!f) {
                        throw Errors.newError(
                                'Method "' + method + '" is not implemented')
                                .code(500);
                    }
                    var params = _.extend({}, req.query, req.body, urlParams);
                    return f.call(instance, params);
                },
                _doHandle : function(req, res) {
                    var that = this;
                    var path = that._getPath(req);
                    var http = req.method.toLowerCase();
                    var conf = that.descriptor.get(path);
                    if (!conf) {
                        throw Errors.newError('Path not found "' + path + '"')
                                .code(404);
                    }
                    var methodName = conf.obj[http];
                    if (!methodName) {
                        throw Errors.newError(
                                'HTTP method "' + http.toUpperCase() + //
                                '" is not supported. Path: "' + path + '".')
                                .code(404);
                    }
                    return that._callMethod(methodName, conf.params, req, res);
                },
                _getPath : function(req) {
                    var path = req.path;
                    if (!path || path === '') {
                        var url = req.url || '';
                        // path = url.replace(/^.*(\/.*)[?#\/].*/i, '$1');
                        var idx = url.indexOf('?');
                        if (idx >= 0) {
                            url = url.substring(0, idx);
                        }
                        idx = url.indexOf('#');
                        if (idx >= 0) {
                            url = url.substring(0, idx);
                        }
                        idx = url.indexOf('/');
                        if (idx > 0) {
                            url = url.substring(idx);
                        }
                        path = url;
                    }
                    var options = this.options || {};
                    var prefix = options.pathPrefix || '';
                    return path.substring(prefix.length);
                }
            });

    var HttpClientStub = ApiDescriptor.HttpClientStub = Class.extend({
        initialize : function(descriptor, options) {
            this.descriptor = descriptor;
            this.options = options || {};
            var that = this;
            var config = this.descriptor._config;
            _.each(config, function(obj, path) {
                _.each(obj, function(methodName, http) {
                    that[methodName] = function(params) {
                        var req = that._newHttpRequest(path, http, params);
                        var res = that._newHttpResponse(req);
                        return that.handle(req, res);
                    };
                });
            });
        },
        _newHttpRequest : function(path, method, params) {
            params = params || {};
            var expandedPath = PathMapper.formatPath(path, params);
            var url = this._toUrl(expandedPath);
            return {
                id : _.uniqueId('req-'),
                url : url,
                method : method,
                query : {},
                headers : {},
                body : params || {}
            };
        },
        _newHttpResponse : function(req) {
            return {
                id : req.id,
                status : 200,
                headers : {},
                body : null,
                error : null
            };
        },
        _beginHttpCall : function(req, res) {
        },
        _endHttpCall : function(req, res) {
        },
        handle : function(req, res) {
            var that = this;
            var defer = P.defer();
            try {
                that._beginHttpCall(req, res);
                that._http(req, res, function(error) {
                    try {
                        if (!error) {
                            var category = parseInt(res.status) / 100;
                            category = parseInt(category) * 100;
                            if (category != 200) {
                                if (res.body && res.body.trace) {
                                    error = Errors.fromJSON(res.body).code(
                                            res.status);
                                } else {
                                    error = Errors.newError('' + res.status)
                                            .code(res.status);
                                }
                            }
                        }
                        if (error) {
                            throw error;
                        }
                        that._endHttpCall(req, res);
                        defer.resolve(res.body);
                    } catch (err) {
                        that._endHttpCall(req, res);
                        defer.reject(err);
                    }
                });
            } catch (error) {
                defer.reject(error);
            }
            return defer.promise;
        },
        _toUrl : function(path) {
            var options = this.options || {};
            var baseUrl = options.baseUrl || '';
            return baseUrl + path;
        },
        _http : function(req, res, callback) {
            callback(new Error('Not implemented'));
        },
    });

    Mosaic.ApiDescriptor = ApiDescriptor;

})(require);
