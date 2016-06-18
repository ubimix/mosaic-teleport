var teleport = require('./teleport');
var PathFormatter = require('mosaic-pathmapper').PathFormatter;

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