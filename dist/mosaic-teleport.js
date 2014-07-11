require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (global){
(function(require) {
    "use strict";

    var Mosaic = module.exports = require('mosaic-commons');
    require('./Mosaic.PathMapper');
    var _ = (typeof window !== "undefined" ? window.Mosaic.libs.underscore : typeof global !== "undefined" ? global.Mosaic.libs.underscore : null);

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

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Mosaic.PathMapper":3}],3:[function(require,module,exports){
(function (global){
(function module(require) {
    "use strict";

    var Mosaic = module.exports = require('mosaic-commons');
    var _ = (typeof window !== "undefined" ? window.Mosaic.libs.underscore : typeof global !== "undefined" ? global.Mosaic.libs.underscore : null);

    function PathMapper() {
        var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
        function esc(str) {
            return str.replace(escapeRegExp, '\\$&');
        }
        function wrap(str) {
            return '(' + str + ')';
        }
        var handlers = [];
        this.add = function(mask, obj) {
            var chunks = [];
            var names = [];
            var a = false;
            _.each(mask.split('*'), function(segment) {
                var b = false;
                _.each(segment.split(':'), function(str) {
                    if (!a && !b) {
                        chunks.push(esc(str));
                    } else if (a || b) {
                        var idx = str.indexOf('/');
                        var r = b ? '[^\/]+' : '.*?';
                        if (idx >= 0) {
                            chunks.push(wrap(r));
                            names.push(str.substring(0, idx));
                            chunks.push(esc(str.substring(idx)));
                        } else {
                            chunks.push(wrap(r));
                            names.push(str);
                        }
                    }
                    b = true;
                });
                a = true;
            });
            var str = chunks.join('');
            var regexp = new RegExp('^' + str + '$');
            handlers.push({
                mask : mask,
                regexp : regexp,
                names : names,
                obj : obj
            });
        };
        this.find = function(path) {
            var result = null;
            _.any(handlers, function(handler) {
                if (handler.regexp.test(path)) {
                    var params = {};
                    var array = handler.regexp.exec(path).slice(1);
                    var idx = 0;
                    _.each(array, function(param) {
                        var name = handler.names[idx++];
                        var value = param ? decodeURIComponent(param) : null;
                        params[name] = value;
                    });
                    result = {
                        params : params,
                        obj : handler.obj
                    };
                    return true;
                }
            });
            return result;
        };
    }
    PathMapper.formatPath = function(mask, params) {
        params = params || {};
        var array = mask.split(/[:\*]/gim);
        var path = [];
        for (var i = 0; i < array.length; i++) {
            var segment = array[i];
            if (i === 0) {
                if (segment !== '') {
                    path.push(segment);
                }
            } else {
                var name = null;
                var idx = segment.indexOf('/');
                if (idx >= 0) {
                    name = segment.substring(0, idx);
                    segment = segment.substring(idx);
                } else {
                    name = segment;
                    segment = null;
                }
                var value = params[name];
                if (!value) {
                    var msg = 'Required parameter "' + name + '" not defined.';
                    var err = new Error(msg);
                    err._code = 400;
                    throw err;
                }
                delete params[name];
                path.push(value);
                if (segment && segment !== '') {
                    path.push(segment);
                }
            }
        }
        return path.join('');
    };
    Mosaic.PathMapper = PathMapper;
})(require);

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],"mosaic-teleport":[function(require,module,exports){
module.exports=require('H99CHA');
},{}],"H99CHA":[function(require,module,exports){
module.exports = require('mosaic-commons');
require('./Mosaic.ApiDescriptor');
require('./Mosaic.PathMapper');

},{"./Mosaic.ApiDescriptor":2,"./Mosaic.PathMapper":3}]},{},["H99CHA"]);