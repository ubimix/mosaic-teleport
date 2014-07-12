(function(require) {
    "use strict";

    var Mosaic = module.exports = require('mosaic-commons');
    require('./Mosaic.PathMapper');
    var _ = require('underscore');

    /**
     * This descriptor defines API instance methods and their mapping to HTTP
     * URLs and parameters.
     */
    Mosaic.ApiDescriptor = Mosaic.Class.extend({
        /** Initializes this instance */
        initialize : function() {
            this._config = {};
            this.mapper = new Mosaic.PathMapper();
        },
        /**
         * Defines a new API method, the corresponding REST path and the
         * corresponding HTTP method (GET, POST, PUT, DELETE...)
         * 
         * @param pathMask
         *            path of the endpoint corresponding to this API method;
         *            this path can contain parameters (like
         *            '/users/:userId/name') which are automatically transformed
         *            to/from method arguments.
         * @param http
         *            name of the HTTP method used to invoke this API function
         *            (GET, POST, PUT, DELETE...)
         * @param method
         *            the name of the API function to invoke
         * 
         */
        add : function(pathMask, http, method) {
            var conf = this._config[pathMask] = this._config[pathMask] || {};
            conf[http] = method;
            this.mapper.add(pathMask, conf);
            return this;
        },

        /**
         * Returns a description of the method to invoke corresponding to the
         * specified path.
         */
        get : function(path) {
            return this.mapper.find(path);
        }
    });

    var Handler = Mosaic.Class.extend({
        /**
         * Wraps the "handle" method of this class - adds notifications before
         * and after that calls.
         */
        _wrapHandleMethod : function(handle) {
            return function(req, res) {
                var that = this;
                return Mosaic.P.fin(Mosaic.P.then(function() {
                    return that._beginHttpCall({
                        req : req, // HTTP request
                        res : res, // HTTP response
                        stub : that, // Server or client stub
                    });
                }).then(function() {
                    return handle.call(that, req, res);
                }), function(err, result) {
                    return that._endHttpCall({
                        req : req, // HTTP request
                        res : res, // HTTP response
                        stub : that, // Server or client stub
                        err : err, // HTTP error
                        result : result, // Execution result
                    });
                });
            };
        },
        _beginHttpCall : function(params) {
            if (_.isFunction(this.options.beginHttpCall)) {
                this.options.beginHttpCall(params);
            }
        },
        _endHttpCall : function(params) {
            if (_.isFunction(this.options.endHttpCall)) {
                this.options.endHttpCall(params);
            }
        },
    });

    /**
     * Http server stub redirecting server-side calls to the real API
     * implementation described by an Mosaic.ApiDescriptor instance.
     */
    Mosaic.ApiDescriptor.HttpServerStub = Handler
            .extend({
                initialize : function(options) {
                    this.setOptions(options);
                    if (!options.descriptor)
                        throw Mosaic.Errors.newError(501,
                                'API descriptor is not defined');
                    this.descriptor = options.descriptor;
                    this._doHandle = this._wrapHandleMethod(this._doHandle);
                },
                handle : function(req, res) {
                    var that = this;
                    return Mosaic.P.then(function() {
                        return that._doHandle(req, res);
                    }).then(function(obj) {
                        res.send(200, obj || '');
                    }, function(err) {
                        var errObj = Mosaic.Errors.toJSON(err);
                        var code = errObj.status || 500;
                        res.send(code, errObj);
                    });
                },
                _getInstance : function(req, res, method, urlParams) {
                    var options = this.options || {};
                    var instance = options.instance || this;
                    return instance;
                },
                _callMethod : function(method, urlParams, req, res) {
                    var that = this;
                    var instance = that._getInstance(req, res, method,
                            urlParams);
                    var f = instance[method];
                    if (!f) {
                        throw Mosaic.Errors.newError(
                                'Method "' + method + '" is not implemented')
                                .code(500);
                    }
                    var params = that._getMethodParams(method, urlParams, req,
                            res);
                    return f.call(instance, params);
                },
                _getMethodParams : function(method, urlParams, req, res) {
                    return _.extend({}, req.query, req.body, req.cookies,
                            urlParams);
                },
                _doHandle : function(req, res) {
                    var that = this;
                    var path = that._getPath(req);
                    var http = req.method.toLowerCase();
                    var conf = that.descriptor.get(path);
                    if (!conf) {
                        throw Mosaic.Errors.newError(
                                'Path not found "' + path + '"').code(404);
                    }
                    var methodName = conf.obj[http];
                    if (!methodName) {
                        throw Mosaic.Errors.newError(
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

    /**
     * Http client stub generating API methods based on an Mosaic.ApiDescriptor
     * instance and forwarding all method calls to a remote server by HTTP.
     */
    Mosaic.ApiDescriptor.HttpClientStub = Handler.extend({
        initialize : function(descriptor, options) {
            this.descriptor = descriptor;
            this.setOptions(options);
            var that = this;
            this.handle = this._wrapHandleMethod(this.handle);
            var config = that.descriptor._config;
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
            var expandedPath = Mosaic.PathMapper.formatPath(path, params);
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
        handle : function(req, res) {
            var that = this;
            var defer = Mosaic.P.defer();
            try {
                that._http(req, res, function(error) {
                    try {
                        if (!error) {
                            var category = parseInt(res.status) / 100;
                            category = parseInt(category) * 100;
                            if (category != 200) {
                                if (res.body && res.body.trace) {
                                    error = Mosaic.Errors.fromJSON(res.body)
                                            .code(res.status);
                                } else {
                                    error = Mosaic.Errors.newError(
                                            '' + res.status).code(res.status);
                                }
                            }
                        }
                        if (error) {
                            throw error;
                        }
                        defer.resolve(res.body);
                    } catch (err) {
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
            var err = Mosaic.Errors.newError('Not implemented');
            callback(err);
        },
    });

})(require);
