var expect = require('expect.js');
var _ = require('underscore');
var Mosaic = require('mosaic-commons');
require('..');
var Utils = require('./Utils');

var bindHttp = Mosaic.ApiDescriptor.bind;

describe('ApiDispatcher', function() {

    it('should be able to provide API description for each path', function() {
        var FirstType = Mosaic.Class.extend({
            sayHello : bindHttp('/hello', 'get', function(options) {
                var name = options.name || 'Anonymous';
                return 'Hello, ' + name + '!';
            })
        });
        var SecondType = Mosaic.Class.extend({
            sayBye : bindHttp('/bye', 'get', function(options) {
                var name = options.name || 'Anonymous';
                return 'Goodbye, ' + name + '!';
            })
        });

        var dispatcher = new Mosaic.ApiDispatcher({
            pathPrefix : '/toto'
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

    describe('should manage remote calls', function() {
        var server;
        beforeEach(function(done) {
            Utils.startServer({}).then(function(s) {
                server = s;
            }).then(done, done).done();
        });
        afterEach(function() {
            if (server) {
                server.close();
                server = null;
            }
        });

        it('should be able handle remote API calls', function(done) {
            Mosaic.P.then(function() {

            }).then(done, done).done();
        });

    });

});
