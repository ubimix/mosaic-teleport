if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(
// Dependencies
[ 'require', 'underscore', 'mosaic-commons', './PathMapper', './HttpClient' ],
// Module
function(require) {

    var Mosaic = require('mosaic-commons');
    var Class = Mosaic.Class;
    var Errors = Mosaic.Errors;
    var P = Mosaic.P;

    var _ = require('underscore');
    var PathMapper = require('./PathMapper');
    var HttpClient = require('./HttpClient');

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
        add : function(path, http, method) {
            var conf;
            if (_.isObject(path)) {
                conf = path;
                path = conf.path;
                http = conf.http;
                method = conf.method;
            } else {
                conf = {
                    http : http
                };
            }
            var path = normalizePath(path);
            this._config[path] = _.extend({}, this._config[path], conf);
            conf.path = path;
            conf[http] = method;
            delete conf.method;
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
            var api = [];
            var result = {
                api : api
            };
            var that = this;
            _.each(that._config, function(conf, path) {
                api.push(conf);
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
                that.add(conf);
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
                var obj = {};
                _.each(_.keys(method), function(key) {
                    obj[key] = method[key];
                });
                obj.method = name;
                obj.http = method.http;
                obj.path = method.path;
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
                var methodName = conf.obj[http];
                if (!methodName) {
                    throw Errors//
                    .newError('HTTP method "' + http.toUpperCase() + //
                    '" is not supported. Path: "' + path + '".').code(404);
                }
                var results = that._callMethod(req, res, methodName,
                        conf.params);
                var headers = conf.obj.headers;
                if (headers && res.setHeader) {
                    _.each(headers, function(header, key) {
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
            var result = f.call(instance, params);
            return result;
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
            var config = that.descriptor._config;
            _.each(config, function(obj, path) {
                _.each(obj, function(methodName, http) {
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
            return new ApiDescriptor.HttpClientStub(_.extend(options, {
                path : description.endpoint,
                descriptor : descriptor,
                client : httpClient,
            }));
        });
    };

    return ApiDescriptor;
});
