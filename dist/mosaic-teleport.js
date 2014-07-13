require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
(function (global){
(function(require) {
    "use strict";

    var Mosaic = module.exports = require('mosaic-commons');
    require('./Mosaic.ApiDescriptor');
    var _ = (typeof window !== "undefined" ? window.Mosaic.libs.underscore : typeof global !== "undefined" ? global.Mosaic.libs.underscore : null);
    var Superagent = (typeof window !== "undefined" ? window.Mosaic.libs.superagent : typeof global !== "undefined" ? global.Mosaic.libs.superagent : null);

    Mosaic.ApiDescriptor.SuperagentClientStub = // 
    Mosaic.ApiDescriptor.HttpClientStub.extend({
        initialize : function(options) {
            if (!options.descriptor)
                throw Mosaic.Errors.newError('API descriptor is not defined');
            this.client = Superagent.agent();
            var init = this.class.parent.prototype.initialize;
            init.call(this, options.descriptor, options);
        },
        _http : function(req, res, callback) {
            var method = req.method;
            if (method == 'delete') {
                method = 'del';
            }
            var agent = this.client[method](req.url);
            _.each(req.headers, function(value, key) {
                agent = agent.set(key, value);
            });
            agent = agent.send(req.body);
            agent.end(function(err, r) {
                try {
                    if (r) {
                        res.status = r.status;
                        _.extend(res.headers, r.headers || {});
                        res.body = r.body;
                    } else if (err && err.status) {
                        res.status = err.status;
                    } else {
                        res.status = 500;
                    }
                    callback(err);
                } catch (e) {
                    callback(e);
                }
            });
        }
    });

})(require);

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Mosaic.ApiDescriptor":3}],3:[function(require,module,exports){
(function (global){
(function(require) {
    "use strict";

    var Mosaic = module.exports = require('mosaic-commons');
    require('./Mosaic.PathMapper');
    var _ = (typeof window !== "undefined" ? window.Mosaic.libs.underscore : typeof global !== "undefined" ? global.Mosaic.libs.underscore : null);

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
                    if (!options.descriptor) {
                        throw Mosaic.Errors.newError(501,
                                'API descriptor is not defined');
                    }
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

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./Mosaic.PathMapper":4}],4:[function(require,module,exports){
(function (global){
var Mosaic = module.exports = require('mosaic-commons');
var _ = (typeof window !== "undefined" ? window.Mosaic.libs.underscore : typeof global !== "undefined" ? global.Mosaic.libs.underscore : null);

/**
 * This class is used to map path masks to objects. It allows to find nearest
 * object matching to the given path. This class is useful to implement call
 * routers.
 */
var PathMapper = Mosaic.PathMapper = Mosaic.Class.extend({

    /** Initialization of this object. */
    initialize : function() {
        var that = this;
        that.handlers = [];
    },

    /**
     * Adds a new object to this mapper.
     * 
     * @param mask
     *            path mask used to dispatch to this object
     * @param obj
     *            the object to add
     */
    add : function(mask, obj) {
        var that = this;
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
        that.handlers.push({
            mask : mask,
            regexp : regexp,
            names : names,
            obj : obj
        });
    },

    /**
     * Finds and returns a nearest object corresponding to the given path. This
     * method returns an object with two fields: 1) The 'obj' field contains the
     * found object 2) The 'params' field contains all found path parameters
     * (defined in the initial path mask used to register this object).
     */
    find : function(path) {
        var that = this;
        var result = null;
        _.any(that.handlers, function(handler) {
            if (!handler.regexp.test(path))
                return;
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
        });
        return result;
    },

    /**
     * Removes and returns the mapped object corresponding to the specified path
     * mask.
     */
    remove : function(mask) {
        var that = this;
        var result = null;
        var removed = null;
        that.handlers = _.filter(that.handlers, function(handler) {
            var keep = true;
            if (handler.mask === mask) {
                removed = handler.obj;
                keep = false;
            }
            return keep;
        });
        return removed;
    }

});

/**
 * A static method used to format a string based on the given path mask and
 * specified parameters.
 */
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

/** Regular expression used to find and replace special symbols. */
var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
/** Escapes the specified string */
function esc(str) {
    return str.replace(escapeRegExp, '\\$&');
}
/** Transforms the given string in a Regexp group. */
function wrap(str) {
    return '(' + str + ')';
}

}).call(this,typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],"mosaic-teleport":[function(require,module,exports){
module.exports=require('H99CHA');
},{}],"H99CHA":[function(require,module,exports){
module.exports = require('mosaic-commons');
require('./Mosaic.ApiDescriptor');
require('./Mosaic.PathMapper');
require('./Mosaic.ApiDescriptor.SuperagentClientStub');

},{"./Mosaic.ApiDescriptor":3,"./Mosaic.ApiDescriptor.SuperagentClientStub":2,"./Mosaic.PathMapper":4}]},{},["H99CHA"]);