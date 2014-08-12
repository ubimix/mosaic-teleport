if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(
// Dependencies
[ 'require', 'underscore', 'superagent', 'mosaic-commons', '..', 'expect.js',
        './Utils' ],
// Module
function(require) {

    var _ = require('underscore');
    var expect = require('expect.js');
    var Mosaic = require('mosaic-commons');
    var Class = Mosaic.Class;
    var P = Mosaic.P;

    var Teleport = require('..');
    var ApiDispatcher = Teleport.ApiDispatcher;
    var ApiDescriptor = Teleport.ApiDescriptor;
    var Utils = require('./Utils');

    var bindHttp = Teleport.ApiDescriptor.bind;

    describe('ApiDispatcher', function() {

        var FirstType = Class.extend({
            sayHello : bindHttp('/hello', 'get', function(options) {
                var name = options.name || 'Anonymous';
                return {
                    msg : 'Hello, ' + name + '!'
                };
            }),
            sayGoodbye : bindHttp('/bye', 'get', function(options) {
                var name = options.name || 'Anonymous';
                return {
                    msg : 'Bye-bye, ' + name + '!'
                };
            })
        });
        var SecondType = Class.extend({
            sendMsg : bindHttp('/message', 'post', function(options) {
                var name = options.name || 'Anonymous';
                return {
                    msg : name + ', your message was sent!'
                };
            })
        });

        it('should be able to provide API description for each path', function(
            done) {
            function testEndpointJson(dispatcher, path, control) {
                return dispatcher.loadEndpoint(path).then(function(handler) {
                    expect(!!handler).to.eql(true);
                    var json = handler.getEndpointJson();
                    expect(json).to.eql(control);
                });
            }
            var dispatcher = new ApiDispatcher({});
            dispatcher.addEndpoint({
                path : '/first',
                instance : new FirstType()
            });
            dispatcher.addEndpoint({
                path : '/toto/second',
                instance : new SecondType()
            });

            return P.then(function() {
                return testEndpointJson(dispatcher, '/first', {
                    endpoint : '/first',
                    api : [ {
                        path : '/bye',
                        http : 'get',
                        method : 'sayGoodbye',
                    }, {
                        path : '/hello',
                        http : 'get',
                        method : 'sayHello'
                    } ]
                });
            }).then(function() {
                return testEndpointJson(dispatcher, '/first/bye', {
                    endpoint : '/first',
                    api : [ {
                        path : '/bye',
                        http : 'get',
                        method : 'sayGoodbye',
                    }, {
                        path : '/hello',
                        http : 'get',
                        method : 'sayHello'
                    } ]
                });
            }).then(function() {
                return testEndpointJson(dispatcher, '/toto/second', {
                    endpoint : '/toto/second',
                    api : [ {
                        path : '/message',
                        http : 'post',
                        method : 'sendMsg'
                    } ]
                });
            }).then(function() {
                done();
            }, function(err) {
                done(err);
            }).done();
        });

        describe('should manage remote calls', function() {
            var options = {
                port : 1234
            };
            it('should be able handle remote API calls', function(done) {
                Utils.withServer(function(app) {
                    var dispatcher = new ApiDispatcher(options);
                    dispatcher.addEndpoint({
                        path : '/toto/first',
                        instance : new FirstType()
                    });
                    app.all('/toto*', function(req, res) {
                        dispatcher.handle(req, res).done();
                    });
                    return options;
                }, function(server) {
                    var baseUrl = Utils.getBaseUrl(options) + '/toto/first';
                    return ApiDescriptor.HttpClientStub.load(baseUrl)//
                    .then(function(client) {
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

        describe('should automatically load new services', function(done) {
            var options = {
                port : 1234
            };
            var loaded = false;
            it('should be able handle remote API calls', function(done) {
                var service = new FirstType();
                var servicePath = '/toto';
                var dispatcher = new ApiDispatcher(options);
                dispatcher._loadEndpoint = function(path) {
                    if (service && path.indexOf(servicePath + '/first') === 0) {
                        loaded = true;
                        return {
                            path : servicePath + '/first',
                            instance : service
                        };
                    }
                };
                var baseUrl = Utils.getBaseUrl(options) + //
                servicePath + '/first';
                Utils.withServer(function(app) {
                    app.all(servicePath + '/*', function(req, res) {
                        dispatcher.handle(req, res).done();
                    });
                    return options;
                }, function(server) {
                    expect(loaded).to.eql(false);
                    return ApiDescriptor.HttpClientStub.load(baseUrl)//
                    .then(function(client) {
                        expect(loaded).to.eql(true);
                        return client.sayHello({
                            name : 'John Smith'
                        }).then(function(result) {
                            expect(result).to.eql({
                                msg : 'Hello, John Smith!'
                            });
                        });
                    });
                }).then(function() {
                    loaded = false;
                    return dispatcher.removeEndpoint(servicePath + '/first');
                }).then(function() {
                    return ApiDescriptor.HttpClientStub.load(baseUrl)//
                    .then(function() {
                        fail();
                    }, function(err) {
                        expect(loaded).to.eql(false);
                    });
                }).then(done, done).done();
            });
        });
    });

});