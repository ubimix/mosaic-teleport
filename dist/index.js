(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("superagent"));
	else if(typeof define === 'function' && define.amd)
		define(["superagent"], factory);
	else if(typeof exports === 'object')
		exports["teleport"] = factory(require("superagent"));
	else
		root["teleport"] = factory(root["superagent"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_13__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(1);

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	var teleport = module.exports = __webpack_require__(2);
	teleport.getDescriptor = __webpack_require__(3);
	teleport.ServiceAdapter = __webpack_require__(4);
	teleport.ServiceClient = __webpack_require__(9);
	teleport.remote = __webpack_require__(10);


/***/ },
/* 2 */
/***/ function(module, exports) {

	module.exports = teleport;
	function teleport(Promise) {
	    teleport.Promise = Promise;
	    return teleport;
	}

	teleport.extend = function extend(to) {
	    for (var i = 1; i < arguments.length; i++) {
	        var from = arguments[i];
	        if (!from) {
	            continue;
	        }
	        for ( var key in from) {
	            if (from.hasOwnProperty(key)) {
	                to[key] = from[key];
	            }
	        }
	    }
	    return to;
	}

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = getDescriptor;

	function getDescriptor(service) {
	    var result = {};
	    for ( var field in service) {
	        var value = service[field];
	        if (typeof value === 'function') {
	            var methodInfo = getMethodInfo(value);
	            if (methodInfo) {
	                result[field] = methodInfo;
	            }
	        }
	    }
	    return result;
	}

	function getMethodInfo(method) {
	    if (method.path) {
	        return {
	            method : (method.method || 'get').toLowerCase(),
	            path : method.path
	        }
	    }
	}

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	var PathMapper = __webpack_require__(5).PathMapper;
	var teleport = __webpack_require__(2);
	var getDescriptor = __webpack_require__(3);

	function ServiceAdapter(service, descriptor) {
	    this.service = service;
	    var descriptor = descriptor || getDescriptor(this.service);
	    var that = this;
	    that.mappers = {};
	    that.descriptor = descriptor;
	    Object.keys(that.descriptor).forEach(function(method) {
	        var m = that.service[method];
	        if (typeof m !== 'function')
	            return;
	        var info = that.descriptor[method];
	        var httpMethod = (info.method || 'get').toLowerCase();
	        var mapper = that.mappers[httpMethod] = //
	        that.mappers[httpMethod] || new PathMapper();
	        mapper.add(info.path, function(options) {
	            return teleport.Promise.resolve().then(function() {
	                options = options || {};
	                return m.call(that.service, options);
	            });
	        });
	    });
	    return this;
	}

	/**
	 * @param options.params
	 * @param options.path
	 * @param options.query
	 * @param options.data
	 */
	ServiceAdapter.prototype.handle = function(options) {
	    var that = this;
	    return teleport.Promise.resolve().then(function() {
	        options = options || {};
	        var path = options.path || '';
	        var httpMethod = (options.method || 'get').toLowerCase();
	        var promise = that._sendServiceDescriptor(path, httpMethod);
	        if (!promise) {
	            var mapper = that.mappers[httpMethod];
	            promise = that._callHandler(mapper, path, options);
	            if (!promise) {
	                promise = that._notFound(options);
	            }
	        }
	        return promise;
	    });
	}

	ServiceAdapter.prototype._sendServiceDescriptor = function(path, httpMethod) {
	    if (httpMethod === 'get' && path === '/.service') {
	        var that = this;
	        return teleport.Promise.resolve({
	            status : 200,
	            data : that.descriptor
	        });
	    }
	}

	ServiceAdapter.prototype._notFound = function(options) {
	    var that = this;
	    return teleport.Promise.resolve().then(function() {
	        var promise = that._callHandler(that.mappers['*'], '/', options);
	        return promise || {
	            status : 404,
	            data : {
	                code : 404,
	                type : 'Error',
	                message : 'Not found'
	            }
	        };
	    })
	}

	ServiceAdapter.prototype._callHandler = function(mapper, path, options) {
	    if (!mapper)
	        return;
	    var slot = mapper.find(path);
	    if (!slot)
	        return;
	    options = teleport.extend({}, options, {
	        params : teleport.extend({}, options.params, slot.params)
	    });
	    return slot.obj(options);
	}

	module.exports = ServiceAdapter;

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(6);

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
	    PathMapper : __webpack_require__(7),
	    PathFormatter : __webpack_require__(8)
	}


/***/ },
/* 7 */
/***/ function(module, exports) {

	/**
	 * This class is used to map path masks to objects. It allows to find nearest
	 * object matching to the given path. This class is useful to implement call
	 * routers.
	 */
	function PathMapper() {
	}

	/**
	 * Adds a new object to this mapper.
	 * 
	 * @param mask
	 *            path mask used to dispatch to this object
	 * @param obj
	 *            the object to add
	 */
	PathMapper.prototype.add = function(mask, obj) {
	    var chunks = [];
	    var names = [];
	    var a = false;
	    var segments = mask.split('*');
	    segments.forEach(function(segment) {
	        var b = false;
	        var array = segment.split(':');
	        array.forEach(function(str) {
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
	    this._handlers = this._handlers || [];
	    this._handlers.push({
	        mask : mask,
	        regexp : regexp,
	        names : names,
	        obj : obj
	    });
	}

	/**
	 * Finds and returns a nearest object corresponding to the given path. This
	 * method returns an object with two fields: 1) The 'obj' field contains the
	 * found object 2) The 'params' field contains all found path parameters
	 * (defined in the initial path mask used to register this object).
	 */
	PathMapper.prototype.find = function(path) {
	    var result = null;
	    this._handlers = this._handlers || [];
	    for (var i = 0, len = this._handlers.length; !result && i < len; i++) {
	        var handler = this._handlers[i];
	        if (!handler.regexp.test(path))
	            continue;
	        var params = {};
	        var regexp = handler.regexp.exec(path);
	        var array = regexp.slice(1);
	        var idx = 0;
	        array.forEach(function(param) {
	            var name = handler.names[idx++];
	            var value = param ? decodeURIComponent(param) : null;
	            params[name] = value;
	        });
	        result = {
	            params : params,
	            obj : handler.obj
	        };
	    }
	    return result;
	}

	/**
	 * Removes and returns the mapped object corresponding to the specified path
	 * mask.
	 */
	PathMapper.prototype.remove = function(mask) {
	    var result = null;
	    var removed = null;
	    var handlers = this._handlers || [];
	    this._handlers = [];
	    handlers.forEach(function(handler) {
	        var keep = true;
	        if (handler.mask === mask) {
	            removed = handler.obj;
	        } else {
	            this._handlers.push(handler);
	        }
	    }, this);
	    return removed;
	}

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

	module.exports = PathMapper;


/***/ },
/* 8 */
/***/ function(module, exports) {

	/**
	 * A static method used to format a string based on the given path mask and
	 * specified parameters.
	 */
	function PathMapper() {
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
	            if (typeof value === 'function') {
	                value = value();
	            }
	            delete params[name];
	            path.push(value);
	            if (segment && segment !== '') {
	                path.push(segment);
	            }
	        }
	    }
	    return path.join('');
	}

	module.exports = PathMapper;


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	var teleport = __webpack_require__(2);
	var PathFormatter = __webpack_require__(5).PathFormatter;

	function ServiceClient(handler, descriptor) {
	    this.mappers = {};
	    if (typeof handler === 'function') {
	        this.handler = handler;
	    } else if (typeof handler === 'object' //
	            && typeof handler.handle === 'function') {
	        this.handler = function(options) {
	            return handler.handle(options);
	        }
	    } else {
	        this.handler = function() {
	        }
	    }
	    this.setDescriptor(descriptor || handler.descriptor);
	}

	ServiceClient.prototype.setDescriptor = function(descriptor) {
	    var that = this;
	    that.descriptor = descriptor;
	    if (!that.descriptor) {
	        return;
	    }
	    Object.keys(that.descriptor).forEach(function(method) {
	        var info = that.descriptor[method];
	        that[method] = function(options) {
	            return teleport.Promise.resolve().then(function() {
	                options = options || {};
	                var params = options.params || {};
	                var path = PathFormatter.formatPath(info.path, params);
	                var callOptions = teleport.extend({}, options, {
	                    path : path,
	                    method : info.method.toUpperCase()
	                });
	                return that._callHandler(callOptions);
	            });
	        }
	    });
	    return this;
	}

	ServiceClient.prototype.loadDescriptor = function() {
	    var that = this;
	    return teleport.Promise.resolve().then(function() {
	        return that._callHandler({
	            path : '/.service',
	            method : 'GET'
	        });
	    }).then(function(options) {
	        var descriptor = options.data;
	        that.setDescriptor(descriptor);
	        return descriptor;
	    });
	}

	ServiceClient.prototype._callHandler = function(options) {
	    var that = this;
	    return teleport.Promise.resolve().then(function() {
	        if (that.handler) {
	            return that.handler(options);
	        }
	    });
	}

	module.exports = ServiceClient;

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = {
	    getServerHandler : __webpack_require__(11),
	    getClientHandler : __webpack_require__(12),
	}

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	var teleport = __webpack_require__(2);

	/**
	 * This function returns a handler which can be used as a HTTP handler in
	 * express applications.
	 */
	function getServerHandler(basePath, adapter) {
	    return function(req, res, next) {
	        return teleport.Promise.resolve().then(function() {
	            var params = req.params = req.params || {};
	            var path = params['0'];
	            path = basePath + path;
	            var options = {
	                path : path,
	                method : params.method,
	                params : params,
	                query : req.query || {},
	                headers : req.headers,
	                data : req.data
	            };
	            return adapter.handle(options);
	        }).then(function(result) {
	            result = result || {};
	            var headers = result.headers || {};
	            res.set(headers);
	            res.send(result.data || {});
	        }, function(err) {
	            res.status(500).send({
	                error : err.stack,
	                params : req.params
	            });
	        });
	    }
	}

	module.exports = getServerHandler;


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

	var teleport = __webpack_require__(2);
	var request = __webpack_require__(13);

	/**
	 * This function returns a handler which can be used as a HTTP handler in
	 * express applications.
	 */
	function getClientHandler(baseUrl) {
	    return function(options) {
	        return new teleport.Promise(function(resolve, reject) {
	            try {
	                var httpMethod = (options.method || 'GET').toUpperCase();
	                var path = options.path;
	                var url = baseUrl + path;
	                var data = options.data || {};
	                var h = request(httpMethod, url)//
	                .set(options.headers || {})//
	                .query(options.query || {}) //
	                .send(data)//
	                .end(function(err, res) {
	                    try {
	                        if (err)
	                            throw err;
	                        if (!res || !res.ok)
	                            throw new Error('Result is not defined');
	                        
	                        var json = res.body;
	                        if (!json){
	                            json = JSON.parse(res.text);
	                        }                        
	                        var result = {
	                            headers : res.headers,
	                            data : json
	                        }
	                        return resolve(result);
	                    } catch (err) {
	                        return reject(err);
	                    }
	                });
	            } catch (err) {
	                return reject(err);
	            }
	        });
	    }
	}

	module.exports = getClientHandler;

/***/ },
/* 13 */
/***/ function(module, exports) {

	module.exports = __WEBPACK_EXTERNAL_MODULE_13__;

/***/ }
/******/ ])
});
;