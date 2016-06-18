var PathMapper = require('mosaic-pathmapper').PathMapper;
var teleport = require('./teleport');
var getDescriptor = require('./getDescriptor');

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