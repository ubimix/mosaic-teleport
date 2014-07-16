var expect = require('expect.js');
var _ = require('underscore');
var Mosaic = require('mosaic-commons');
require('..');
var Utils = require('./Utils');
var Superagent = require('superagent');

var bindHttp = Mosaic.ApiDescriptor.bind;

describe('ApiDispatcher', function() {

    var FirstType = Mosaic.Class.extend({
        sayHello : bindHttp('/hello', 'get', function(options) {
            var name = options.name || 'Anonymous';
            return {
                msg : 'Hello, ' + name + '!'
            };
        })
    });
    var SecondType = Mosaic.Class.extend({
        sayBye : bindHttp('/bye', 'get', function(options) {
            var name = options.name || 'Anonymous';
            return {
                msg : 'Goodbye, ' + name + '!'
            };
        })
    });

    it('should be able to provide API description for each path', function() {
        var dispatcher = new Mosaic.ApiDispatcher({
            path : '/toto'
        });
        dispatcher.addEndpoint({
            path : '/first',
            instance : new FirstType()
        });
        dispatcher.addEndpoint({
            path : '/second',
            instance : new SecondType()
        });

        var descriptorJson = dispatcher.getDescriptorJson('/toto/first');
        expect(descriptorJson).to.eql({
            endpoint : '/toto/first',
            api : [ {
                path : '/hello',
                http : 'get',
                method : 'sayHello'
            } ]
        });

        descriptorJson = dispatcher.getDescriptorJson('/toto/first/hello');
        expect(descriptorJson).to.eql({
            endpoint : '/toto/first',
            api : [ {
                path : '/hello',
                http : 'get',
                method : 'sayHello'
            } ]
        });

        descriptorJson = dispatcher.getDescriptorJson('/toto/second');
        expect(descriptorJson).to.eql({
            endpoint : '/toto/second',
            api : [ {
                path : '/bye',
                http : 'get',
                method : 'sayBye'
            } ]
        });
    });

    function loadJson(url, headers, body) {
        var deferred = Mosaic.P.defer();
        try {
            body = body || {};
            headers = headers || {};
            _.defaults(headers, {
                'Accept' : 'application/json'
            });
            Superagent.get(url).set(headers).send(body)//
            .end(
                    function(res) {
                        try {
                            var err;
                            var category = parseInt(res.status) / 100;
                            category = parseInt(category) * 100;
                            if (category != 200) {
                                if (res.body && res.body.trace) {
                                    err = Mosaic.Errors.fromJSON(res.body)
                                            .code(res.status);
                                    err.stack = res.body.trace.join('\n');
                                } else {
                                    err = Mosaic.Errors.newError(
                                            '' + res.status).code(res.status);
                                }
                            }
                            if (err) {
                                throw err;
                            }
                            deferred.resolve(res.body);
                        } catch (e) {
                            deferred.reject(e);
                        }
                    });
        } catch (ex) {
            deferred.reject(ex);
        }
        return deferred.promise;
    }

    describe('should manage remote calls', function() {
        var options = {
            port : 1234,
            path : '/toto'
        };
        it('should be able handle remote API calls', function(done) {
            Utils.withServer(function(app) {
                var dispatcher = new Mosaic.ApiDispatcher(options);
                dispatcher.addEndpoint({
                    path : '/first',
                    instance : new FirstType()
                });
                var prefix = (options.path || '') + '/*';
                app.all(prefix, function(req, res) {
                    dispatcher.handle(req, res).done();
                });
                return options;
            }, function(server) {
                var url = Utils.getBaseUrl(options) + '/first.info';
                return loadJson(url).then(function(description) {
                    // FIXME: externalize this code
                    var baseUrl = Utils.getBaseUrl({
                        path : description.endpoint
                    });
                    var apiInfo = description.api;
                    var descriptor = new Mosaic.ApiDescriptor();
                    descriptor.importJson(apiInfo);
                    var client = // 
                    new Mosaic.ApiDescriptor.SuperagentClientStub({
                        baseUrl : baseUrl,
                        descriptor : descriptor
                    });
                    return client.sayHello({
                        name : 'John Smith'
                    }).then(function(result) {
                        expect(result).to.eql({
                            msg : 'Hello, John Smith!'
                        });
                    });
                });
            }).then(done, done).done();
        });

    });

});
