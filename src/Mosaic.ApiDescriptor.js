(function(module, require) {
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
    Mosaic.ApiDescriptor.HttpServerStub = Handler
            .extend({

                /**
                 * Initializes this object and checks that the specified options
                 * contain an API descriptor.
                 * 
                 * @param options.descriptor
                 *            an API descriptor defining all methods exposed via
                 *            REST endpoints; this descriptor defines mapping of
                 *            path parameters and used HTTP methods to call
                 *            methods; if there is no descriptor then this
                 *            method tries to automatically create a new one
                 *            from the "options.instance" field using the
                 *            "Mosaic.ApiDescriptor.getDescriptor".
                 * @param options.instance
                 *            an instance implementing the API; all remote API
                 *            calls are delegated to this object; if this
                 *            parameter is not defined then this instance is
                 *            used instead; see also the "_getInstance" method
                 *            of this class.
                 */
                initialize : function(options) {
                    this.setOptions(options);
                    this.descriptor = this.options.descriptor;
                    if (!this.descriptor) {
                        var instance = this.options.instance || this;
                        this.descriptor = Mosaic.ApiDescriptor
                                .getDescriptor(instance);
                    }
                    this._doHandle = this._wrapHandleMethod(this._doHandle);
                },

                /**
                 * Handles the specified HTTP request by calling a method
                 * corresponding to the request path.
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
                        var code = errObj.status || 500;
                        res.send(code, errObj);
                    });
                },

                /**
                 * Handles the specified HTTP request. This method is used by
                 * the "handle" method to perform real actions.
                 */
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
                    return that._callMethod(req, res, methodName, conf.params);
                },

                /**
                 * Returns an instance where the specified method should be
                 * invoked.
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
                 * Calls the specified method on the API implementation
                 * instance.
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
                /**
                 * This method aggregates all parameters defined in the HTTP
                 * request and transforms them in the parameter object used to
                 * invoke an API method. This method merges together parameters
                 * defined in the URL path, explicit request parameters, request
                 * body and request cookies. This method could be overloaded to
                 * re-define a set of parameters for methods.
                 */
                _getMethodParams : function(method, urlParams, req, res) {
                    return _.extend({}, req.query, req.body, req.cookies,
                            urlParams);
                },

                /**
                 * Returns a path corresponding to the specified request. This
                 * path is used to find an API method to invoke. Used internally
                 * by the "_doHandle" method.
                 */
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
})(module, require);
