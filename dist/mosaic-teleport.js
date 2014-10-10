/*!
 * mosaic-teleport v0.0.19 | License: MIT 
 * 
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("mosaic-commons"), require("underscore"), require("superagent"));
	else if(typeof define === 'function' && define.amd)
		define(["mosaic-commons", "underscore", "superagent"], factory);
	else if(typeof exports === 'object')
		exports["mosaic-teleport"] = factory(require("mosaic-commons"), require("underscore"), require("superagent"));
	else
		root["mosaic-teleport"] = factory(root["mosaic-commons"], root["underscore"], root["superagent"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_1__, __WEBPACK_EXTERNAL_MODULE_2__, __WEBPACK_EXTERNAL_MODULE_3__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;if (false) {
	    var define = require('amdefine')(module);
	}
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [ __webpack_require__, __webpack_require__(1), __webpack_require__(4), __webpack_require__(5),
	        __webpack_require__(6), __webpack_require__(7), __webpack_require__(4),
	        __webpack_require__(8) ], __WEBPACK_AMD_DEFINE_RESULT__ = (function(require) {
	    var _ = __webpack_require__(2);
	    var HttpClient = __webpack_require__(4);
	    var Superagent = __webpack_require__(3);
	    var Mosaic = __webpack_require__(1);
	    var Teleport = Mosaic.Teleport = {
	        ApiDescriptor : __webpack_require__(5),
	        ApiDispatcher : __webpack_require__(6),
	        PathMapper : __webpack_require__(7),
	        HttpClient : __webpack_require__(4),
	        HttpClientSuperagent : __webpack_require__(8)
	    };
	    Teleport.HttpClient.Superagent = Teleport.HttpClientSuperagent;
	    return Teleport;
	}.apply(null, __WEBPACK_AMD_DEFINE_ARRAY__)), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_1__;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_2__;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_3__;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;if (false) {
	    var define = require('amdefine')(module);
	}
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [ __webpack_require__, __webpack_require__(2), __webpack_require__(1) ], __WEBPACK_AMD_DEFINE_RESULT__ = (function(require) {

	    var Mosaic = __webpack_require__(1);
	    var Class = Mosaic.Class;
	    var Errors = Mosaic.Errors;
	    var P = Mosaic.P;
	    var _ = __webpack_require__(2);

	    /** A generic HTTP client wrapper. */
	    var HttpClient = Class.extend({

	        /**
	         * Initializes this class.
	         * 
	         * @param options.baseUrl
	         *            a base URL of the HTTP client
	         */
	        initialize : function(options) {
	            this.setOptions(options);
	            if (!this.options.baseUrl) {
	                throw Errors.newError('The "baseUrl" is not defined.')
	                        .code(501);
	            }
	        },

	        /**
	         * Creates a new request and response and executes this request. This
	         * method returns a promise with the result of the execution.
	         */
	        exec : function(options) {
	            var req = this.newRequest(options);
	            var res = this.newResponse(req);
	            return this.handle(req, res);
	        },

	        /**
	         * Handles the specified request to the remote API method and returns a
	         * promise with the response.
	         */
	        handle : function(req, res) {
	            var that = this;
	            var defer = P.defer();
	            try {
	                that.http(req, res, function(error) {
	                    try {
	                        if (!error) {
	                            var category = parseInt(res.status) / 100;
	                            category = parseInt(category) * 100;
	                            if (category != 200) {
	                                if (res.body && res.body.trace) {
	                                    error = Errors.fromJSON(res.body).code(
	                                            res.status);
	                                    var trace = _.isArray(res.body.trace) ? // 
	                                    res.body.trace.join('\n') : //
	                                    '' + res.body.trace;
	                                    error.stack = trace + '\n\n' + error.stack;
	                                } else {
	                                    error = Errors.newError(
	                                            'Error: ' + res.status).code(
	                                            res.status);
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
	         * Create a request object containing URL to invoke, method to invoke,
	         * query parameters, HTTP headers and the main body.
	         */
	        newRequest : function(options) {
	            options = options || {};
	            options.id = _.uniqueId('req-');
	            options.method = (options.method || 'get').toUpperCase();
	            options.params = options.params || {};
	            options.body = options.body || options.params || {};
	            options.url = this._toUrl(options.path);
	            console.log('>>>', options.url);
	            options.query = options.query || {};
	            options.headers = options.headers || {};
	            return options;
	        },

	        /**
	         * Creates and returns a new response object corresponding to the
	         * specified request.
	         */
	        newResponse : function(req) {
	            return {
	                id : req.id,
	                status : 200,
	                headers : {},
	                body : null,
	                error : null
	            };
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
	        http : function(req, res, callback) {
	            var err = Errors.newError('Not implemented');
	            callback(err);
	        },
	    });

	    HttpClient.newInstance = function(options) {
	        return new HttpClient.Superagent(options);
	    };

	    return HttpClient;
	}.apply(null, __WEBPACK_AMD_DEFINE_ARRAY__)), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;if (false) {
	    var define = require('amdefine')(module);
	}
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [ __webpack_require__, __webpack_require__(2), __webpack_require__(1), __webpack_require__(7), __webpack_require__(4) ], __WEBPACK_AMD_DEFINE_RESULT__ = (function(require) {

	    var Mosaic = __webpack_require__(1);
	    var Class = Mosaic.Class;
	    var Errors = Mosaic.Errors;
	    var P = Mosaic.P;

	    var _ = __webpack_require__(2);
	    var PathMapper = __webpack_require__(7);
	    var HttpClient = __webpack_require__(4);

	    /**
	     * This descriptor defines API instance methods and their mapping to HTTP
	     * URLs and parameters.
	     */
	    var ApiDescriptor = Class.extend({

	        /** Initializes this instance */
	        initialize : function() {
	            this._config = {};
	            this._mapper = new PathMapper();
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
	        add : function(path, http, method, options) {
	            var obj = {
	                path : normalizePath(path),
	                http : http,
	                method : method
	            };
	            if (options) {
	                obj.options = options;
	            }
	            var conf = this._config[obj.path] = this._config[obj.path] || {};
	            conf[http] = obj;
	            this._mapper.add(obj.path, conf);
	            return this;
	        },

	        /**
	         * Returns a description of the method to invoke corresponding to the
	         * specified path.
	         */
	        get : function(path) {
	            return this._mapper.find(path);
	        },

	        /** Returns a list of all paths. */
	        getAllPaths : function() {
	            return _.keys(this._config);
	        },

	        /**
	         * Returns descriptions for all HTTP methods defined for the specified
	         * path.
	         */
	        getPathMethods : function(path) {
	            return this._config[path];
	        },

	        /** Exports the content of this descriptor as a JSON object. */
	        exportJson : function() {
	            var api = [];
	            var result = {
	                api : api
	            };
	            var that = this;
	            _.each(that._config, function(obj) {
	                _.each(obj, function(conf) {
	                    api.push(conf);
	                });
	            });
	            api.sort(function(a, b) {
	                return a.path > b.path ? 1 : a.path < b.path ? -1 : 0;
	            });
	            return result;
	        },

	        /** Imports the content of this descriptor from a JSON array. */
	        importJson : function(json) {
	            var that = this;
	            var array;
	            if (_.isObject(json) && _.isArray(json.api)) {
	                array = json.api;
	            } else {
	                array = _.toArray(json);
	            }
	            _.each(array, function(conf) {
	                that.add(conf.path, conf.http, conf.method, conf.options);
	            });
	        }

	    });

	    /**
	     * Normalizes paths - add the first slash and remove a trail separator. If
	     * the specified path is empty (or null) then this method returns an empty
	     * string.
	     */
	    function normalizePath(path) {
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

	    /** Static methods */
	    _.extend(ApiDescriptor, {

	        /** Make this method publicly available. */
	        normalizePath : normalizePath,

	        /**
	         * Automatically creates an API descriptor by reading properties
	         * associated with methods of the specified class. If a method has
	         * string properties "http" and "path" then they are used to create a
	         * new entry for an API descriptor ("path", "http" and "method").
	         */
	        getDescriptor : function(service) {
	            var descriptor = new ApiDescriptor();
	            var json = ApiDescriptor.getDescriptorJson(service);
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
	                var hasOptions = false;
	                var options = {};
	                _.each(_.keys(method), function(key) {
	                    if (key != 'http' && key != 'path') {
	                        hasOptions = true;
	                        options[key] = method[key];
	                    }
	                });
	                if (hasOptions) {
	                    obj.options = options;
	                }
	                result.push(obj);
	            });
	            return result;
	        },

	        /**
	         * This method is used to bind "path" and "http" properties to the given
	         * class method. These properties are used to automatically create a
	         * ApiDescriptor instance from class (see the
	         * ApiDescriptor.getDescriptor and ApiDescriptor.getDescriptorJson).
	         */
	        bind : function(path, http, method, options) {
	            return _.extend(method, {
	                http : http,
	                path : path
	            }, options);
	        }
	    });

	    /**
	     * A common superclass for client/server handlers
	     * (ApiDescriptor.HttpClientStub and ApiDescriptor.HttpServerStub) executing
	     * API method calls.
	     */
	    var Handler = Class.extend({
	        /**
	         * Wraps the "handle" method of this class - adds notifications before
	         * and after that calls.
	         */
	        _wrapHandleMethod : function(handle) {
	            return function(req, res) {
	                var that = this;
	                return P.fin(P.then(function() {
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
	     * implementation described by an ApiDescriptor instance.
	     */
	    ApiDescriptor.HttpServerStub = Handler.extend({

	        /** This suffix is used to define URLs returning API descriptions. */
	        INFO_SUFFIX : '.info',

	        /** Registers this server stub in the specified Express application. */
	        registerIn : function(app) {
	            var that = this;
	            var prefix = normalizePath(this.options.path) + '*';
	            app.all(prefix, function(req, res) {
	                that.handle(req, res).done();
	            });
	        },

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
	         *            the "ApiDescriptor.getDescriptor".
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
	                this.descriptor = ApiDescriptor.getDescriptor(instance);
	            }
	            this.options.path = normalizePath(this.options.path);
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
	            return P.then(function() {
	                return that._doHandle(req, res);
	            }).then(function(obj) {
	                res.status(200).send(obj || '');
	            }, function(err) {
	                var errObj = Errors.toJSON(err);
	                errObj.status = errObj.status || 500;
	                res.status(errObj.status).send(errObj);
	            });
	        },

	        /**
	         * Handles the specified HTTP request. This method is used by the
	         * "handle" method to perform real actions.
	         */
	        _doHandle : function(req, res) {
	            var that = this;
	            var path = ApiDescriptor.HttpServerStub.getPath(req);
	            path = that._getLocalizedPath(path);
	            if (that._isEndpointInfoPath(path)) {
	                var json = that.getEndpointJson();
	                return json;
	            } else {
	                var http = req.method.toLowerCase();
	                var conf = that.descriptor.get(path);
	                if (!conf) {
	                    throw Errors.newError('Path not found "' + path + '"')
	                            .code(404);
	                }
	                var info = conf.obj[http];
	                if (!info) {
	                    throw Errors.newError('HTTP method "' + http.toUpperCase() + //
	                    '" is not supported. Path: "' + path + '".').code(404);
	                }
	                var methodName = info.method;
	                var results = that._callMethod(req, res, methodName,
	                        conf.params);
	                var options = conf.obj.options;
	                if (options && options.headers && res.setHeader) {
	                    _.each(options.headers, function(header, key) {
	                        res.setHeader(key, header);
	                    });
	                }
	                return results;
	            }
	        },

	        /** Returns a JSON descriptor for the specified handler */
	        getEndpointJson : function() {
	            var that = this;
	            var descriptor = that.getDescriptor();
	            var json = descriptor.exportJson();
	            json.endpoint = that.options.path;
	            return json;
	        },

	        /**
	         * Returns true if the specified path corresponds to an API description
	         * endpoint. IE this endpoint should send a JSON description of all API
	         * methods available with this path prefix.
	         */
	        _isEndpointInfoPath : function(path) {
	            if (path === '' || path == '/')
	                return true;
	            var idx = path.lastIndexOf(this.INFO_SUFFIX);
	            return (idx >= 0 && idx === path.length - this.INFO_SUFFIX.length);
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
	                throw Errors.newError(//
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
	         * Returns a localized version of the specified path. This path is used
	         * to find an API method to invoke. Used internally by the "_doHandle"
	         * method.
	         */
	        _getLocalizedPath : function(path) {
	            var prefix = this.options.path;
	            return path.substring(prefix.length);
	        }
	    });

	    /** Extract and returns path from the given request object. */
	    ApiDescriptor.HttpServerStub.getPath = function(req) {
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
	     * Http client stub generating API methods based on an ApiDescriptor
	     * instance and forwarding all method calls to a remote server by HTTP.
	     */
	    ApiDescriptor.HttpClientStub = Handler.extend({

	        /**
	         * Initializes this object and checks that the specified options contain
	         * an API descriptor and a base URL of the API endpoint to invoke.
	         * 
	         * @param options.descriptor
	         *            a mandatory API descriptor defining all methods exposed
	         *            via REST endpoints; this descriptor defines mapping of
	         *            path parameters and used HTTP methods to call methods
	         * @param options.client
	         *            (or options.baseUrl) the HTTP client or a baseUrl used to
	         *            create a new HTTP client.
	         */
	        initialize : function(options) {
	            if (!options.descriptor) {
	                throw Errors.newError('API descriptor is not defined')
	                        .code(501);
	            }
	            var that = this;
	            that.setOptions(options);
	            that.descriptor = that.options.descriptor;
	            that.client = that.options.client || that._newHttpClient();
	            that.handle = that._wrapHandleMethod(that.handle);
	            var paths = that.descriptor.getAllPaths();
	            _.each(paths, function(path) {
	                var methods = that.descriptor.getPathMethods(path);
	                _.each(methods, function(conf, http) {
	                    var methodName = conf.method;
	                    that[methodName] = function(params) {
	                        var p = that._getFullPath(path, params);
	                        var req = that.client.newRequest({
	                            path : p,
	                            method : http,
	                            params : params
	                        });
	                        var res = that.client.newResponse(req);
	                        return that.handle(req, res);
	                    };
	                });
	            });
	        },

	        /**
	         * Handles the specified request to the remote API method and returns a
	         * promise with the response.
	         */
	        handle : function(req, res) {
	            return this.client.handle(req, res);
	        },

	        /**
	         * Creates and returns a new HTTP client (an instance of the HttpClient
	         */
	        _newHttpClient : function() {
	            return new HttpClient.newInstance(this.options);
	        },

	        /** Returns a full path for the specified method path. */
	        _getFullPath : function(methodPath, params) {
	            return PathMapper.formatPath(methodPath, params);
	        }
	    });

	    /**
	     * Loads API description and returns a client stub corresponding to the
	     * specified endpoint URL.
	     */
	    ApiDescriptor.HttpClientStub.load = function(baseUrl, options) {
	        if (_.isObject(baseUrl)) {
	            options = baseUrl;
	            baseUrl = options.baseUrl;
	        }
	        options = options || {};
	        var httpClient = new HttpClient.newInstance({
	            baseUrl : baseUrl
	        });
	        var req = httpClient.newRequest({
	            path : ''
	        });
	        var res = httpClient.newResponse(req);
	        return httpClient.handle(req, res).then(function(description) {
	            var apiInfo = description.api;
	            var descriptor = new ApiDescriptor();
	            descriptor.importJson(apiInfo);
	            var client = httpClient;
	            if (description.baseUrl && baseUrl !== description.baseUrl) {
	                client = new HttpClient.newInstance({
	                    baseUrl : description.baseUrl
	                });
	            }
	            return new ApiDescriptor.HttpClientStub(_.extend(options, {
	                path : description.endpoint,
	                descriptor : descriptor,
	                client : client,
	            }));
	        });
	    };

	    return ApiDescriptor;
	}.apply(null, __WEBPACK_AMD_DEFINE_ARRAY__)), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;if (false) {
	    var define = require('amdefine')(module);
	}
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [ __webpack_require__, __webpack_require__(2), __webpack_require__(1), // 
	__webpack_require__(7), __webpack_require__(5) ], __WEBPACK_AMD_DEFINE_RESULT__ = (function(require) {

	    var Mosaic = __webpack_require__(1);
	    var P = Mosaic.P;
	    var Errors = Mosaic.Errors;
	    var Class = Mosaic.Class;
	    var _ = __webpack_require__(2);
	    var PathMapper = __webpack_require__(7);
	    var ApiDescriptor = __webpack_require__(5);

	    /**
	     * API dispatcher provides mapping between path prefixes and instances
	     * implementing server endpoints.
	     */
	    var ApiDispatcher = Class.extend({

	        /**
	         * Initializes this object.
	         * 
	         * @param options.path
	         *            this path prefix is added to all endpoints
	         */
	        initialize : function(options) {
	            this.setOptions(options);
	            this.options.path = this._normalizePath(this.options.path);
	            this._mapping = new PathMapper();
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
	            var mask = that._prepareEndpointMask(options);
	            var handler = that._newServerStub(options);
	            that._mapping.add(mask, handler);
	        },

	        /**
	         * Removes an endpoint corresponding to the specified path.
	         */
	        removeEndpoint : function(path) {
	            var that = this;
	            return P.then(function() {
	                var mask = that._prepareEndpointMask({
	                    path : path
	                });
	                var result = that._mapping.remove(mask);
	                if (!result) {
	                    throw Errors.newError('No endpoint is registered ' + //
	                    'for this path. Path: "' + path + '".').code(404);
	                }
	            });
	        },

	        /**
	         * Handles the specified request by dispatching it to registered API
	         * endpoints.
	         */
	        handle : function(req, res) {
	            var that = this;
	            return P.then(function() {
	                var path = ApiDescriptor.HttpServerStub.getPath(req);
	                return that.loadEndpoint(path).then(function(handler) {
	                    if (!handler) {
	                        throw Errors.newError(404, //
	                        'API handler not found. Path: "' + path + '".');
	                    } else {
	                        return handler.handle(req, res);
	                    }
	                });
	            }).then(null, function(err) {
	                var errObj = Errors.toJSON(err);
	                errObj.status = errObj.status || 500;
	                res.send(errObj.status, errObj);
	            });
	        },

	        /**
	         * Loads information about an endpoint corresponding to the specified
	         * path.
	         */
	        loadEndpoint : function(path) {
	            var that = this;
	            return P.then(function() {
	                path = that._normalizePath(path);
	                var item = that._mapping.find(path);
	                if (item)
	                    return item;
	                return P.then(function() {
	                    return that._loadEndpoint(path);
	                }).then(function(options) {
	                    if (options) {
	                        that.addEndpoint(options);
	                        item = that._mapping.find(path);
	                    }
	                    return item;
	                });
	            }).then(function(item) {
	                return item ? item.obj : null;
	            });
	        },

	        /**
	         * Creates and returns a new server stub providing remote access to the
	         * given service instance.
	         */
	        _newServerStub : function(options) {
	            var instance = options.stub || options.instance;
	            if (!instance) {
	                throw Errors.newError('API implementation is not defined');
	            }
	            var handler;
	            if (ApiDescriptor.HttpServerStub.hasInstance(instance)) {
	                handler = instance;
	            } else {
	                handler = new ApiDescriptor.HttpServerStub(options);
	            }
	            return handler;
	        },

	        /**
	         * This method could overloaded in subclasses to load a service
	         * corresponding to the specified path. This method should return an
	         * options object to register a new endpoint using the "addEndpoint"
	         * method - it has contain the following fields 1) "options.path" - path
	         * prefix corresponding to the service methods 2) "options.instance" -
	         * instance of the service instance handling requests.
	         */
	        _loadEndpoint : function(path) {
	            return null;
	        },

	        /**
	         * Builds and returns a mask for an endpoint defined by the path options
	         * parameter.
	         */
	        _prepareEndpointMask : function(options) {
	            var that = this;
	            if (!options.path) {
	                throw Errors.newError('Path is not defined');
	            }
	            var idx = options.path.lastIndexOf('.');
	            if (idx >= 0) {
	                options.path = options.path.substring(0, idx);
	            }
	            options.path = that._normalizePath(options.path);
	            options.mask = options.path + '*prefix';
	            return options.mask;
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

	    return ApiDispatcher;
	}.apply(null, __WEBPACK_AMD_DEFINE_ARRAY__)), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;if (false) {
	    var define = require('amdefine')(module);
	}
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [ __webpack_require__, __webpack_require__(2), __webpack_require__(1) ], __WEBPACK_AMD_DEFINE_RESULT__ = (function(require) {

	    var Mosaic = __webpack_require__(1);
	    var Class = Mosaic.Class;
	    var _ = __webpack_require__(2);

	    /**
	     * This class is used to map path masks to objects. It allows to find
	     * nearest object matching to the given path. This class is useful to
	     * implement call routers.
	     */
	    var PathMapper = Class.extend({

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
	                var regexp = handler.regexp.exec(path);
	                var array = regexp.slice(1);
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

	    return PathMapper;

	}.apply(null, __WEBPACK_AMD_DEFINE_ARRAY__)), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;if (false) {
	    var define = require('amdefine')(module);
	}
	!(__WEBPACK_AMD_DEFINE_ARRAY__ = [ __webpack_require__, __webpack_require__(2), __webpack_require__(3), __webpack_require__(4) ], __WEBPACK_AMD_DEFINE_RESULT__ = (function(require) {

	    var _ = __webpack_require__(2);
	    var HttpClient = __webpack_require__(4);
	    var Superagent = __webpack_require__(3);

	    /**
	     * An implementation of the HttpClient interface based on the Superagent
	     * HTTP client library.
	     */
	    var HttpClientSuperagent = HttpClient.Superagent = HttpClient.extend({

	        initialize : function(options) {
	            var init = HttpClient.prototype.initialize;
	            init.call(this, options);
	        },

	        http : function(req, res, callback) {
	            var method = (req.method || 'get').toLowerCase();
	            if (method == 'delete') {
	                method = 'del';
	            }
	            method = method.toLowerCase();
	            var headers = _.extend({}, this.options.headers, req.headers);
	            var query = _.extend({}, this.options.query, req.query);
	            var body = _.extend({}, this.options.body, req.body);
	            if (req.params) {
	                if (method === 'put' || method === 'post') {
	                    _.extend(body, req.params);
	                } else {
	                    _.extend(query, req.params);
	                }
	            }
	            var agent = Superagent[method](req.url);
	            if (this.options.formEncoded) {
	                agent.type('form');
	            }
	            agent.set(headers).query(query).send(body).end(function(err, r) {
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

	    return HttpClientSuperagent;
	}.apply(null, __WEBPACK_AMD_DEFINE_ARRAY__)), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));


/***/ }
/******/ ])
})
