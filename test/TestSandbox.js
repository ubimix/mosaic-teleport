var expect = require('expect.js');
var Mosaic = require('..');
var P = Mosaic.P;
var _ = require('underscore');
var Utils = require('./Utils');
var Api = require('./BackofficeApi');
var ApiConfig = require('./BackofficeApiConfig');

function testAuth(api) {
    return Mosaic.P
    // Try to get user info without login
    .then(function() {
        return api.userInfo().then(function() {
            expect.fail();
        }, function(err) {
            expect(err.status).to.eql(403);
        });
    })
    // Login with bad credentials
    .then(function() {
        return api.login({
            login : 'John',
            password : 'Smithxx'
        }).then(function() {
            expect.fail();
        }, function(err) {
            expect(err.status).to.eql(401);
            var msg = err.message;
            expect(msg).to.eql('Bad credentials');
        });
    })
    // Successful login
    .then(function() {
        return api.login({
            login : 'John',
            password : 'Smith'
        }).then(function(info) {
            expect(info).not.to.eql(null);
            expect(info).not.to.eql(undefined);
            expect(info.sessionId).to.eql(Api.SESSION_ID);
            expect(info.user).to.eql(Api.USER_INFO);
        });
    });
}

function testProjects(api) {
    return Mosaic.P.then(function() {
    });
}

function testApi(api) {
    return Mosaic.P.then(function() {
        return testAuth(api);
    }).then(function() {
        return testProjects(api);
    });
}

describe('Local API', function() {
    it('should be able to launch a local API instance', function(done) {
        var api = new Api();
        testApi(api).then(done, done).done();
    });
});

describe('Remote API', function() {
    var clientApi;
    var server;
    var client;
    beforeEach(function(done) {
        var serverInstance = new Api();
        var options = {
            descriptor : ApiConfig,
            pathPrefix : '/toto'
        };
        var serverOptions = _.extend({}, options, {
            instance : serverInstance,
            beginHttpCall : function(params) {
                // Get the session ID from the request header
                var sessionId = params.req.get('x-session-id');
                if (sessionId) {
                    // Put the content of the session ID in the query;
                    // So this value became available to API instance
                    // methods.
                    params.req.query.sessionId = sessionId;
                }
            },
            endHttpCall : function(params) {
                var sessionId = params.result ? params.result.sessionId : null;
                if (sessionId) {
                    // Set a sessionId header
                    params.res.set('x-session-id', sessionId);
                    // params.res.cookie(''x-session-id', sessionId);
                }
            },
        });
        var clientOptions = _.extend({}, options, {
            beginHttpCall : function(params) {
                // Get the session ID from the stub object and set this value in
                // the HTTP header to send it to the server.
                var sessionId = params.stub.sessionId;
                if (sessionId) {
                    params.req.headers['x-session-id'] = sessionId;
                }
            },
            endHttpCall : function(params) {
                // Load the session ID from headers and save it
                // as a field in the stub.
                var sessionId = params.res.headers['x-session-id'];
                if (sessionId) {
                    params.stub.sessionId = sessionId;
                }
            },
        });
        Utils.startServer(serverOptions).then(function(srv) {
            server = srv;
            clientApi = Utils.newClient(clientOptions);
            done();
        }, done).done();
    });
    afterEach(function() {
        if (server) {
            var s = server;
            server = null;
            s.close();
        }
    });
    it('should be able to launch a remote API instance', function(done) {
        testApi(clientApi).then(done, done).done();
    });
});
