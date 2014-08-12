if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(
// Dependencies
[ 'require', 'underscore', 'superagent', 'mosaic-commons', '..', 'expect.js',
        './Utils', './BackofficeApi', './BackofficeApiConfig' ],
// Module
function(require) {

    var _ = require('underscore');
    var expect = require('expect.js');
    var Teleport = require('..');
    var ApiDescriptor = Teleport.ApiDescriptor;

    var Mosaic = require('mosaic-commons');
    var P = Mosaic.P;
    var Class = Mosaic.Class;

    var Utils = require('./Utils');
    var Api = require('./BackofficeApi');
    var ApiConfig = require('./BackofficeApiConfig');

    describe('Local API', function() {
        it('should be able to launch a local API instance', function(done) {
            // This options object keeps sessionId and put it in all requests.
            var options = {
                sessionId : null,
                prepareParams : function(params) {
                    return _.extend({}, {
                        sessionId : this.sessionId
                    }, params);
                },
                setSessionInfo : function(info) {
                    this.sessionId = info.sessionId;
                }
            };
            var api = new Api();
            testApi(api, options).then(done, done).done();
        });
    });

    describe('Remote API', function() {
        // This test don't keep session ID explicitly. The session ID
        // transferred back and forth in the 'x-session-id' HTTP header.
        var options = {
            descriptor : new ApiConfig(),
            path : '/toto'
        };
        var serverOptions = _.extend({}, options, {
            instance : new Api(),
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
        it('should be able to launch a remote API instance', function(done) {
            Utils.withServer(Utils.newApiDescriptorBuilder(serverOptions),
                    function test(server) {
                        var client = Utils.newClient(clientOptions);
                        var options = {
                            prepareParams : function(params) {
                                return _.extend({}, params);
                            },
                            setSessionInfo : function(info) {
                            }
                        };
                        return testApi(client, options);
                    })//
            .then(done, done).done();

        });
    });

    describe('ApiDescriptor - automatic API instantiation', function() {
        var TestType = Class.extend({
            sayHello : ApiDescriptor.bind('/hello', 'get', function(options) {
                var name = options.name || 'Anonymous';
                return {
                    msg : 'Hello, ' + name + '!'
                };
            })
        });

        it('should be able to automatically create an API descriptor ' + // 
        'based on annotated class methods', function(done) {
            var instance = new TestType();
            var descriptor = ApiDescriptor.getDescriptor(instance);
            var options = {
                descriptor : descriptor,
                instance : instance,
                path : '/toto'
            };
            Utils.withServer(Utils.newApiDescriptorBuilder(options),
                    function test(server) {
                        var client = Utils.newClient(options);
                        return client.sayHello({
                            name : 'John Smith'
                        }).then(function(result) {
                            expect(result.msg).to.eql('Hello, John Smith!');
                        });
                    }).then(done, done).done();
        });

    });

    function testAuth(api, options) {
        return P
        // Try to get user info without login
        .then(function() {
            return api.userInfo(options.prepareParams()).then(function() {
                expect.fail();
            }, function(err) {
                console.log(err);
                expect(err.status).to.eql(403);
            });
        })
        // Login with bad credentials
        .then(function() {
            return api.login(options.prepareParams({
                login : 'John',
                password : 'Smithxx'
            })).then(function() {
                expect.fail();
            }, function(err) {
                expect(err.status).to.eql(401);
                var msg = err.message;
                expect(msg).to.eql('Bad credentials');

            });
        })
        // Successful login
        .then(function() {
            return api.login(options.prepareParams({
                login : 'John',
                password : 'Smith'
            })).then(function(info) {
                expect(info).not.to.eql(null);
                expect(info).not.to.eql(undefined);
                expect(info.sessionId).to.eql(Api.SESSION_ID);
                expect(info.user).to.eql(Api.USER_INFO);
                options.setSessionInfo(info);
            });
        })
        // Load user info
        .then(function() {
            return api.userInfo(options.prepareParams()).then(function(info) {
                expect(info).to.eql(Api.USER_INFO);
            });
        });
    }

    function testProjects(api, options) {
        var projectInfo = {
            name : 'My First Project',
            description : 'This is a short projet description'
        };
        var list = [];
        var count = 100;
        return P
        // Create a new project
        .then(function() {
            return api.createProject(options.prepareParams(projectInfo));
        })
        // Check newly created project
        .then(function(result) {
            expect(result.id).not.to.eql(null);
            expect(result.id).not.to.eql(undefined);
            expect(result.name).to.eql(projectInfo.name);
            expect(result.description).to.eql(projectInfo.description);
            list.push(result);
        })
        // Create and save new projects
        .then(function() {
            var projects = [];
            for (var i = 0; i < count; i++) {
                projects.push({
                    name : 'Title ' + i,
                    description : 'Description ' + i
                });
            }
            return P.all(_.map(projects, function(project) {
                return api.createProject(options.prepareParams(project));
            }));
        })
        // Check new stored project
        .then(function(projects) {
            expect(projects).not.to.eql(null);
            expect(projects.length).to.eql(count);
            list = list.concat(projects);
        })
        // Load and check all projects
        .then(function() {
            return api.loadProjects(options.prepareParams())//
            .then(function(projects) {
                expect(projects).to.eql(list);
            });
        })
        // Change and save already existing project
        .then(function() {
            var firstProject = JSON.parse(JSON.stringify(list[0]));
            firstProject.name = 'New name of the project';
            return api.saveProject(options.prepareParams(firstProject))//
            .then(function(project) {
                expect(project).to.eql(firstProject);
                list[0] = firstProject;
                return api.loadProjects(options.prepareParams())//
                .then(function(projects) {
                    expect(projects).to.eql(list);
                });
            });
        });
    }

    function testApi(api, options) {
        return P.then(function() {
            return testAuth(api, options);
        }).then(function() {
            return testProjects(api, options);
        });
    }

});