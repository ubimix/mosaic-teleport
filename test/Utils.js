var Mosaic = require('..');
var _ = require('underscore');

module.exports = {
    startServer : startServer,
    newServer : newServer,
    newClient : newClient,
    getBaseUrl : getBaseUrl,
    newApiDescriptorBuilder : newApiDescriptorBuilder,
    withServer : withServer
};

function getPort(options) {
    options = options || {};
    return options.port || 1234;
}
function getBaseUrl(options) {
    options = options || {};
    return 'http://localhost:' + getPort(options) + options.path;
}

function newClient(options) {
    options = options || {};
    options.baseUrl = getBaseUrl(options);
    var client = new Mosaic.ApiDescriptor.HttpClientStub(options);
    return client;
}

function newServer(callback) {
    var deferred = Mosaic.P.defer();
    try {
        // Load the Express framework and related parsers
        var express = require('express');
        var bodyParser = require('body-parser');
        var cookieParser = require('cookie-parser');

        // Creates and initializes an Express application
        var app = express();
        app.use(bodyParser.urlencoded({
            extended : false
        }));
        app.use(bodyParser.json());
        app.use(cookieParser('optional secret string'));
        var options = callback(app) || {};
        var port = getPort(options);
        var server = app.listen(port, function() {
            deferred.resolve(server);
        });
    } catch (err) {
        deferred.reject(err);
    }
    return deferred.promise;
}
function withServer(init, test) {
    var server;
    return Mosaic.P.fin(newServer(init).then(function(s) {
        server = s;
        return test(server);
    }), function() {
        if (!server)
            return;
        server.close();
        server = undefined;
    });
}
function newApiDescriptorBuilder(options) {
    return function(app) {
        // Create and register an API stub handling requests
        var handler = new Mosaic.ApiDescriptor.HttpServerStub(options);
        var prefix = (options.path || '') + '/*';
        app.all(prefix, function(req, res) {
            handler.handle(req, res).done();
        });
        return options;
    };
}

function startServer(options) {
    return newServer(newApiDescriptorBuilder(options));
}
