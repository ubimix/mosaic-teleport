
    var Mosaic = require('mosaic-commons');
    var P = Mosaic.P;
    var Errors = Mosaic.Errors;
    var Class = Mosaic.Class;
    var _ = require('underscore');
    var PathMapper = require('./PathMapper');
    var ApiDescriptor = require('./ApiDescriptor');

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

    module.exports = ApiDispatcher;
