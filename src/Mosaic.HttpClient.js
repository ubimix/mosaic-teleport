var Mosaic = module.exports = require('mosaic-commons');
var _ = require('underscore');

/** A generic HTTP client wrapper. */
Mosaic.HttpClient = Mosaic.Class.extend({

    /**
     * Initializes this class.
     * 
     * @param options.baseUrl
     *            a base URL of the HTTP client
     */
    initialize : function(options) {
        this.setOptions(options);
        if (!this.options.baseUrl) {
            throw Mosaic.Errors.newError('The "baseUrl" is not defined.').code(
                    501);
        }
    },

    /**
     * Handles the specified request to the remote API method and returns a
     * promise with the response.
     */
    handle : function(req, res) {
        var that = this;
        var defer = Mosaic.P.defer();
        try {
            that.http(req, res, function(error) {
                try {
                    if (!error) {
                        var category = parseInt(res.status) / 100;
                        category = parseInt(category) * 100;
                        if (category != 200) {
                            if (res.body && res.body.trace) {
                                error = Mosaic.Errors.fromJSON(res.body).code(
                                        res.status);
                                var trace = _.isArray(res.body.trace) ? // 
                                res.body.trace.join('\n') : //
                                '' + res.body.trace;
                                error.stack = trace + '\n\n' + error.stack;
                            } else {
                                error = Mosaic.Errors.newError(
                                        'Error: ' + res.status).code(res.status);
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
     * Create a request object containing URL to invoke, method to invoke, query
     * parameters, HTTP headers and the main body.
     */
    newRequest : function(path, method, params, body) {
        method = (method || 'get').toUpperCase();
        params = params || {};
        body = body || params || {};
        var url = this._toUrl(path);
        return {
            id : _.uniqueId('req-'),
            url : url,
            method : method,
            query : {},
            headers : {},
            body : body
        };
    },

    /**
     * Creates and returns a new response object corresponding to the specified
     * request.
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
     * "baseUrl" parameter defined in the constructor to build the full endpoint
     * URL.
     */
    _toUrl : function(path) {
        var options = this.options || {};
        var baseUrl = options.baseUrl || '';
        return baseUrl + path;
    },

    /**
     * This method should implement a real HTTP call and return results using
     * the specified callback method. First parameter of this callback is an
     * error and the second parameter is the result of the call. This method
     * should be overloaded in subclasses.
     */
    http : function(req, res, callback) {
        var err = Mosaic.Errors.newError('Not implemented');
        callback(err);
    },
});
