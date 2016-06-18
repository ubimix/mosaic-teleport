var express = require('express');
var expect = require('expect.js');
var teleport = require('../')(Promise);

describe('Client/server calls', function() {
    var port = 65530;
    test(port, 'should be able expose a service and call it remotely',
            function(app) {
                function http(path, method, action) {
                    if (action === undefined) {
                        action = method;
                        method = 'get';
                    }
                    action.path = path;
                    action.method = method.toLowerCase();
                    return action;
                }
                var service = {
                    about : http('/about', function(options) {
                    }),
                    sayHello : http('/hello/*slug', function(options) {
                        return Promise.resolve().then(function() {
                            options = options || {};
                            var params = options.params || {};
                            var query = options.query || {};
                            var name = query.firstName + ' ' + query.lastName;
                            return {
                                data : {
                                    account : params.slug,
                                    message : 'Hello, ' + name + '!'
                                }
                            }
                        })
                    }),
                    errors : http('/', '*', function(options) {
                        return {
                            status : 404,
                            data : {
                                message : 'Error 404: Not found'
                            }
                        }
                    })
                };

                var adapter = new teleport.ServiceAdapter(service);
                app.use('/abc/*', teleport.remote.getServerHandler('/', adapter));

                var baseUrl = 'http://localhost:' + port + '/abc';
                var client = new teleport.ServiceClient(//
                teleport.remote.getClientHandler(baseUrl));
                return client.loadDescriptor().then(function(descriptor){
                    expect(descriptor).to.eql({
                        about : {
                            method : 'get',
                            path : '/about'
                        },
                        sayHello : {
                            method : 'get',
                            path : '/hello/*slug'
                        },
                        errors : {
                            method : '*',
                            path : '/'
                        }
                    });
                    return client.sayHello({
                        query : {
                            firstName : 'John',
                            lastName : 'Smith'
                        },
                        params : {
                            slug : 'john-smith'
                        }
                    }).then(function(result) {
                        expect(result.data).to.eql({
                            account : 'john-smith',
                            message : 'Hello, John Smith!'
                        });
                    });
                });
            });
});

function test(port, msg, action) {
    it(msg, function(done) {
        return withServer(port, action).then(done, done);
    });
}

function withServer(port, action) {
    return Promise.resolve().then(function() {
        var app = express();
        var server = app.listen(port);
        function close() {
            return new Promise(function(resolve, reject) {
                return server.close(function(err) {
                    if (err)
                        return reject(err);
                    else
                        return resolve();
                })
            });
        }
        return Promise.resolve().then(function() {
            return action(app);
        }).then(close, function(err) {
            return close().then(function() {
                throw err;
            });
        });
    });
}