var teleport = require('../teleport');

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
