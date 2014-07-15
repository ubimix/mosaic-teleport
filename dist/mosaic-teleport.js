!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.mosaicTeleport=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function(module, _dereq_) {
    "use strict";

    var Mosaic = module.exports = _dereq_('mosaic-commons');
    _dereq_('./Mosaic.ApiDescriptor');
    var _ = _dereq_('underscore');
    var Superagent = _dereq_('superagent');

    Mosaic.ApiDescriptor.SuperagentClientStub = // 
    Mosaic.ApiDescriptor.HttpClientStub.extend({
        initialize : function(options) {
            var init = this.class.parent.prototype.initialize;
            init.call(this, options);
            this.client = Superagent.agent();
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

})(module, _dereq_);

},{"./Mosaic.ApiDescriptor":2}],2:[function(_dereq_,module,exports){
(function(module, _dereq_) {
    "use strict";

    var Mosaic = module.exports = _dereq_('mosaic-commons');
    _dereq_('./Mosaic.PathMapper');
    var _ = _dereq_('underscore');

    /**
     * This descriptor defines API instance methods and their mapping to HTTP
     * URLs and parameters.
     */
    Mosaic.ApiDescriptor = Mosaic.Class.extend({

        /** Initializes this instance */
        initialize : function() {
            this._config = {};
            this._mapper = new Mosaic.PathMapper();
        },

        /**
         * Defines a new API method, the corresponding REST path and the
         * corresponding HTTP method (GET, POST, PUT, DELETE...)
         * 
         * @param path
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
        add : function(path, http, method) {
            if (_.isObject(path)) {
                var obj = path;
                path = obj.path;
                http = obj.http;
                method = obj.method;
            }
            var conf = this._config[path] = this._config[path] || {};
            conf[http] = method;
            this._mapper.add(path, conf);
            return this;
        },

        /**
         * Returns a description of the method to invoke corresponding to the
         * specified path.
         */
        get : function(path) {
            return this._mapper.find(path);
        },

        /** Exports the content of this descriptor as a JSON object. */
        exportJson : function() {
            var result = [];
            var that = this;
            _.each(that._config, function(conf, path) {
                _.each(conf, function(method, http) {
                    result.push({
                        path : path,
                        http : http,
                        method : method
                    });
                });
            });
            return result;
        },

        /** Imports the content of this descriptor from a JSON array. */
        importJson : function(json) {
            var that = this;
            var array = _.toArray(json);
            _.each(array, function(conf) {
                that.add(conf);
            });
        }

    });

    /** Static methods */
    _.extend(Mosaic.ApiDescriptor, {

        /**
         * Automatically creates an API descriptor by reading properties
         * associated with methods of the specified class. If a method has
         * string properties "http" and "path" then they are used to create a
         * new entry for an API descriptor ("path", "http" and "method").
         */
        getDescriptor : function(service) {
            var descriptor = new Mosaic.ApiDescriptor();
            var json = Mosaic.ApiDescriptor.getDescriptorJson(service);
            descriptor.importJson(json);
            return descriptor;
        },

        /**
         * Automatically creates a JSON object containing definition of the API.
         * If a method of the specified class has string properties "http" and
         * "path" then they are used to create a new entry for an API descriptor
         * ("path", "http" and "method").
         */
        getDescriptorJson : function(service) {
            var result = [];
            service = _.isFunction(service) ? service.prototype : service;
            _.each(_.functions(service), function(name) {
                var method = service[name];
                if (!method.http || !method.path)
                    return;
                var obj = {
                    method : name,
                    http : method.http,
                    path : method.path
                };
                result.push(obj);
            });
            return result;
        },

        /**
         * This method is used to bind "path" and "http" properties to the given
         * class method. These properties are used to automatically create a
         * Mosaic.ApiDescriptor instance from class (see the
         * Mosaic.ApiDescriptor.getDescriptor and
         * Mosaic.ApiDescriptor.getDescriptorJson).
         */
        bind : function(path, http, method) {
            method.http = http;
            method.path = path;
            return method;
        }
    });

    /**
     * A common superclass for client/server handlers
     * (Mosaic.ApiDescriptor.HttpClientStub and
     * Mosaic.ApiDescriptor.HttpServerStub) executing API method calls.
     */
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

        /**
         * This method is called just before calling an API method. By default
         * this method try to call the 'beginHttpCall' method defined (if any)
         * in the constructor parameters.
         */
        _beginHttpCall : function(params) {
            if (_.isFunction(this.options.beginHttpCall)) {
                this.options.beginHttpCall(params);
            }
        },

        /**
         * This method is invoked just after calling an API method. By default
         * this method try to call the 'endHttpCall' method defined (if any) in
         * the constructor parameters.
         */
        _endHttpCall : function(params) {
            if (_.isFunction(this.options.endHttpCall)) {
                this.options.endHttpCall(params);
            }
        },
    });

    /**
     * HTTP server stub redirecting server-side calls to the real API
     * implementation described by an Mosaic.ApiDescriptor instance.
     */
    Mosaic.ApiDescriptor.HttpServerStub = Handler.extend({

        /**
         * Initializes this object and checks that the specified options contain
         * an API descriptor.
         * 
         * @param options.descriptor
         *            an API descriptor defining all methods exposed via REST
         *            endpoints; this descriptor defines mapping of path
         *            parameters and used HTTP methods to call methods; if there
         *            is no descriptor then this method tries to automatically
         *            create a new one from the "options.instance" field using
         *            the "Mosaic.ApiDescriptor.getDescriptor".
         * @param options.instance
         *            an instance implementing the API; all remote API calls are
         *            delegated to this object; if this parameter is not defined
         *            then this instance is used instead; see also the
         *            "_getInstance" method of this class.
         */
        initialize : function(options) {
            this.setOptions(options);
            this.descriptor = this.options.descriptor;
            if (!this.descriptor) {
                var instance = this.options.instance || this;
                this.descriptor = Mosaic.ApiDescriptor.getDescriptor(instance);
            }
            this._doHandle = this._wrapHandleMethod(this._doHandle);
        },

        /**
         * Returns an internal descriptor corresponding to this server stub.
         */
        getDescriptor : function() {
            return this.descriptor;
        },

        /**
         * Handles the specified HTTP request by calling a method corresponding
         * to the request path.
         * 
         * @param req
         *            an HTTP request
         * @param res
         *            an HTTP response
         */
        handle : function(req, res) {
            var that = this;
            return Mosaic.P.then(function() {
                return that._doHandle(req, res);
            }).then(function(obj) {
                res.send(200, obj || '');
            }, function(err) {
                var errObj = Mosaic.Errors.toJSON(err);
                errObj.status = errObj.status || 500;
                res.send(errObj.status, errObj);
            });
        },

        /**
         * Handles the specified HTTP request. This method is used by the
         * "handle" method to perform real actions.
         */
        _doHandle : function(req, res) {
            var that = this;
            var path = that._getPath(req);
            var http = req.method.toLowerCase();
            var conf = that.descriptor.get(path);
            if (!conf) {
                throw Mosaic.Errors.newError('Path not found "' + path + '"')
                        .code(404);
            }
            var methodName = conf.obj[http];
            if (!methodName) {
                throw Mosaic.Errors//
                .newError('HTTP method "' + http.toUpperCase() + //
                '" is not supported. Path: "' + path + '".').code(404);
            }
            return that._callMethod(req, res, methodName, conf.params);
        },

        /**
         * Returns an instance where the specified method should be invoked.
         * 
         * @param req
         *            HTTP request object
         * @param res
         *            HTTP response object
         * @param method
         *            the method to invoke
         * @param urlParams
         *            parameters defined in the URL path
         */
        _getInstance : function(req, res, method, urlParams) {
            var options = this.options || {};
            var instance = options.instance || this;
            return instance;
        },

        /**
         * Calls the specified method on the API implementation instance.
         * 
         * @param req
         *            HTTP request object
         * @param res
         *            HTTP response object
         * @param method
         *            the method to invoke
         * @param urlParams
         *            parameters defined in the URL path
         */
        _callMethod : function(req, res, method, urlParams) {
            var that = this;
            var instance = that._getInstance(req, res, method, urlParams);
            var f = instance[method];
            if (!f) {
                throw Mosaic.Errors.newError(//
                'Method "' + method + '" is not implemented')//
                .code(500);
            }
            var params = that._getMethodParams(method, urlParams, req, res);
            return f.call(instance, params);
        },

        /**
         * This method aggregates all parameters defined in the HTTP request and
         * transforms them in the parameter object used to invoke an API method.
         * This method merges together parameters defined in the URL path,
         * explicit request parameters, request body and request cookies. This
         * method could be overloaded to re-define a set of parameters for
         * methods.
         */
        _getMethodParams : function(method, urlParams, req, res) {
            return _.extend({}, req.query, req.body, req.cookies, urlParams);
        },

        /**
         * Returns a path corresponding to the specified request. This path is
         * used to find an API method to invoke. Used internally by the
         * "_doHandle" method.
         */
        _getPath : function(req) {
            var path = Mosaic.ApiDescriptor.HttpServerStub.getPath(req);
            var options = this.options || {};
            var prefix = options.pathPrefix || '';
            return path.substring(prefix.length);
        }
    });

    /** Extract and returns path from the given request object. */
    Mosaic.ApiDescriptor.HttpServerStub.getPath = function(req) {
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
        return path;
    };

    /**
     * Http client stub generating API methods based on an Mosaic.ApiDescriptor
     * instance and forwarding all method calls to a remote server by HTTP.
     */
    Mosaic.ApiDescriptor.HttpClientStub = Handler.extend({

        /**
         * Initializes this object and checks that the specified options contain
         * an API descriptor and a base URL of the API endpoint to invoke.
         * 
         * @param options.descriptor
         *            a mandatory API descriptor defining all methods exposed
         *            via REST endpoints; this descriptor defines mapping of
         *            path parameters and used HTTP methods to call methods
         * @param options.baseUrl
         *            a base URL of the HTTP endpoint implementing the API
         *            defined by the descriptor.
         */
        initialize : function(options) {
            if (!options.descriptor) {
                throw Mosaic.Errors.newError(501,
                        'API descriptor is not defined');
            }
            if (!options.baseUrl) {
                throw Mosaic.Errors.newError(501, '"baseUrl" is empty; ' + // 
                'API endpoint URL is not defined');
            }
            var that = this;
            that.descriptor = options.descriptor;
            that.setOptions(options);
            that.handle = that._wrapHandleMethod(that.handle);
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

        /**
         * Create a request object containing URL to invoke, method to invoke,
         * query parameters, HTTP headers and the main body.
         */
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

        /**
         * Creates and returns a new response object corresponding to the
         * specified request.
         */
        _newHttpResponse : function(req) {
            return {
                id : req.id,
                status : 200,
                headers : {},
                body : null,
                error : null
            };
        },

        /**
         * Handles the specified request to the remote API method and returns a
         * promise with the response.
         */
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

        /**
         * Transforms the specified path to the full URL. This method uses the
         * "baseUrl" parameter defined in the constructor to build the full
         * endpoint URL.
         */
        _toUrl : function(path) {
            var options = this.options || {};
            var baseUrl = options.baseUrl || '';
            return baseUrl + path;
        },

        /**
         * This method should implement a real HTTP call and return results
         * using the specified callback method. First parameter of this callback
         * is an error and the second parameter is the result of the call. This
         * method should be overloaded in subclasses.
         */
        _http : function(req, res, callback) {
            var err = Mosaic.Errors.newError('Not implemented');
            callback(err);
        },
    });
})(module, _dereq_);

},{"./Mosaic.PathMapper":4}],3:[function(_dereq_,module,exports){
(function(module, _dereq_) {
    "use strict";

    var _ = _dereq_('underscore');
    var Mosaic = _dereq_('mosaic-commons');
    _dereq_('./Mosaic.PathMapper');
    _dereq_('./Mosaic.ApiDescriptor');

    var PathMapper = Mosaic.PathMapper;

    /**
     * API dispatcher provides mapping between path prefixes and instances
     * implementing server endpoints.
     */
    Mosaic.ApiDispatcher = Mosaic.Class.extend({

        /**
         * Initializes this object.
         * 
         * @param options.pathPrefix
         *            this path prefix is added to all endpoints
         */
        initialize : function(options) {
            this.setOptions(options);
            this.options.pathPrefix = this
                    ._normalizePath(this.options.pathPrefix);
            this._mapping = new Mosaic.PathMapper();
        },

        /**
         * Binds a new service to the path prefix.
         * 
         * @param options.path
         *            path prefix corresponding to the service methods
         * @param options.instance
         *            instance of the service instance handling requests
         */
        addEndpoint : function(options) {
            var that = this;
            if (!options.instance) {
                throw Mosaic.Errors
                        .newError('API implementation is not defined');
            }
            if (!options.path) {
                throw Mosaic.Errors.newError('Path is not defined');
            }
            var path = this._getPath(options.path);
            options.path = path;
            var handler = new Mosaic.ApiDescriptor.HttpServerStub(options);
            var mask = path + '*prefix';
            that._mapping.add(mask, handler);
        },

        /**
         * Registers this API dispatcher with an express web application.
         */
        register : function(app) {
            var that = this;
            var prefix = (that.options.pathPrefix || '') + '/*';
            app.all(prefix, function(req, res) {
                that.handle(req, res).done();
            });
        },

        /**
         * Handles the specified request by dispatching it to registered API
         * endpoints.
         */
        handle : function(req, res) {
            var that = this;
            return Mosaic.P.then(function() {
                var path = Mosaic.ApiDescriptor.HttpServerStub.getPath(req);
                var obj = that._find(path);
                if (!obj) {
                    throw Mosaic.Errors.newError(404, //
                    'API handler not found. Path: "' + path + '".');
                } else {
                    var handler = obj.obj;
                    if (that._isEndpointInfoPath(path)) {
                        var json = that._getDescriptorJson(handler);
                        res.send(200, json);
                    } else {
                        return handler.handle(req, res);
                    }
                }
            }).then(null, function(err) {
                var errObj = Mosaic.Errors.toJSON(err);
                errObj.status = errObj.status || 500;
                res.send(errObj.status, errObj);
            });
        },

        /**
         * Returns a JSON description corresponding to the specified path.
         */
        getDescriptorJson : function(path) {
            var that = this;
            var obj = that._find(path);
            if (!obj)
                return null;
            var handler = obj.obj;
            return that._getDescriptorJson(handler);
        },

        /**
         * Returns true if the specified path corresponds to an API description
         * endpoint. IE this endpoint should send a JSON description of all API
         * methods available with this path prefix.
         */
        _isEndpointInfoPath : function(path) {
            var suffix = '.info';
            return (path.lastIndexOf(suffix) === path.length - suffix.length);
        },

        /** Returns a JSON descriptor for the specified handler */
        _getDescriptorJson : function(handler) {
            var that = this;
            var descriptor = handler.getDescriptor();
            return {
                endpoint : handler.options.path,
                api : descriptor.exportJson()
            };
        },

        /**
         * Finds and returns an API handler configuration corresponding to the
         * specified path.
         * 
         * @return an object containing the following fields: 1) "prefix" path
         *         part of the endpoint 2) "obj" the handler object (an
         *         Mosaic.ApiDescriptor.HttpServerStub instance)
         */
        _find : function(path) {
            path = this._normalizePath(path);
            var obj = this._mapping.find(path);
            return obj;
        },

        /** Returns a normalized and prefixed path. */
        _getPath : function(path) {
            var that = this;
            var prefix = that.options.pathPrefix;
            path = prefix + that._normalizePath(path);
            return path;
        },

        /**
         * Normalizes paths - add the first slash and remove a trail separator.
         * If the specified path is empty (or null) then this method returns an
         * empty string.
         */
        _normalizePath : function(path) {
            if (!path || path === '') {
                path = '';
            } else {
                if (path[0] != '/') {
                    path = '/' + path;
                }
                if (path[path.length - 1] === '/') {
                    path = path.substring(0, path.length - 1);
                }
            }
            return path;
        }
    });

})(module, _dereq_);

},{"./Mosaic.ApiDescriptor":2,"./Mosaic.PathMapper":4}],4:[function(_dereq_,module,exports){
(function(module, _dereq_) {
    "use strict";

    var Mosaic = module.exports = _dereq_('mosaic-commons');
    var _ = _dereq_('underscore');

    /**
     * This class is used to map path masks to objects. It allows to find
     * nearest object matching to the given path. This class is useful to
     * implement call routers.
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
         * Finds and returns a nearest object corresponding to the given path.
         * This method returns an object with two fields: 1) The 'obj' field
         * contains the found object 2) The 'params' field contains all found
         * path parameters (defined in the initial path mask used to register
         * this object).
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
         * Removes and returns the mapped object corresponding to the specified
         * path mask.
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

})(module, _dereq_);

},{}],5:[function(_dereq_,module,exports){
module.exports = _dereq_('mosaic-commons');
_dereq_('./Mosaic.ApiDescriptor');
_dereq_('./Mosaic.PathMapper');
_dereq_('./Mosaic.ApiDescriptor.SuperagentClientStub');
_dereq_('./Mosaic.ApiDispatcher');

},{"./Mosaic.ApiDescriptor":2,"./Mosaic.ApiDescriptor.SuperagentClientStub":1,"./Mosaic.ApiDispatcher":3,"./Mosaic.PathMapper":4}]},{},[5])
(5)
});