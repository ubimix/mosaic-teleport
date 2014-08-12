if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(
// Dependencies
[ 'require', 'underscore', 'mosaic-commons' ],
// Module
function(require) {

    var Mosaic = require('mosaic-commons');
    var Class = Mosaic.Class;
    var Errors = Mosaic.Errors;
    var P = Mosaic.P;
    var _ = require('underscore');

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
});
