(function(module, require) {
    "use strict";

    var Mosaic = module.exports = require('mosaic-commons');
    require('./Mosaic.HttpClient');
    var _ = require('underscore');
    var Superagent = require('superagent');

    /**
     * An implementation of the Mosaic.HttpClient interface based on the
     * Superagent HTTP client library.
     */
    Mosaic.HttpClient.Superagent = Mosaic.HttpClient.extend({

        initialize : function(options) {
            var init = Mosaic.HttpClient.prototype.initialize;
            init.call(this, options);
            this.client = Superagent.agent();
        },

        http : function(req, res, callback) {
            var method = req.method || 'get';
            if (method == 'delete') {
                method = 'del';
            }
            method = method.toLowerCase();
            var agent = this.client[method](req.url);
            _.each(req.headers, function(value, key) {
                agent = agent.set(key, value);
            });
            agent = agent.send(req.body);
            agent.end(function(err, r) {
                try {
                    if (r) {
                        res.status = r.status;
                        _.extend(res.headers, r.headers || {});
                        res.body = r.body;
                    } else if (err && err.status) {
                        res.status = err.status;
                    } else {
                        res.status = 500;
                    }
                    callback(err);
                } catch (e) {
                    callback(e);
                }
            });
        }
    });

})(module, require);
