(function(require) {
    "use strict";

    var Mosaic = module.exports = require('mosaic-commons');
    require('./Mosaic.ApiDescriptor');
    var _ = require('underscore');
    var Superagent = require('superagent');

    Mosaic.ApiDescriptor.SuperagentClientStub = // 
    Mosaic.ApiDescriptor.HttpClientStub.extend({
        initialize : function(options) {
            if (!options.descriptor)
                throw Mosaic.Errors.newError('API descriptor is not defined');
            this.client = Superagent.agent();
            var init = this.class.parent.prototype.initialize;
            init.call(this, options.descriptor, options);
        },
        _http : function(req, res, callback) {
            var method = req.method;
            if (method == 'delete') {
                method = 'del';
            }
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

})(require);
