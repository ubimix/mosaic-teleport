var Mosaic = module.exports = require('mosaic-commons');

require('./Mosaic.HttpClient');
var _ = require('underscore');
var Superagent = require('superagent');

/**
 * An implementation of the Mosaic.HttpClient interface based on the Superagent
 * HTTP client library.
 */
Mosaic.HttpClient.Superagent = Mosaic.HttpClient.extend({

    initialize : function(options) {
        var init = Mosaic.HttpClient.prototype.initialize;
        init.call(this, options);
    },

    http : function(req, res, callback) {
        var method = (req.method || 'get').toLowerCase();
        if (method == 'delete') {
            method = 'del';
        }
        method = method.toLowerCase();
        var headers = _.extend({}, this.options.headers, req.headers);
        var query = _.extend({}, this.options.query, req.query);
        var body = _.extend({}, this.options.body, req.body);
        if (req.params) {
            if (method === 'put' || method === 'post') {
                _.extend(body, req.params);
            } else {
                _.extend(query, req.params);
            }
        }

        var agent = Superagent[method](req.url);
        if (this.options.formEncoded) {
            agent.type('form');
        }
        agent.set(headers).query(query).send(body).end(function(err, r) {
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
