(function(module, require) {
    "use strict";

    var _ = require('underscore');
    var Mosaic = require('mosaic-commons');
    require('./Mosaic.PathMapper');
    require('./Mosaic.ApiDescriptor');

    var PathMapper = Mosaic.PathMapper;

    /**
     * API dispatcher provides mapping between path prefixes and instances
     * implementing server endpoints.
     */
    Mosaic.ApiDispatcher = Mosaic.Class.extend({

        /**
         * Initializes this object.
         * 
         * @param options.path
         *            this path prefix is added to all endpoints
         */
        initialize : function(options) {
            this.setOptions(options);
            this.options.path = this._normalizePath(this.options.path);
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
            var prefix = (that.options.path || '') + '/*';
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
            var prefix = that.options.path;
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

})(module, require);
