var teleport = require('../teleport');
var request = require('superagent');

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