var Mosaic = require('..');
var _ = require('underscore');

module.exports = {
    startServer : startServer,
    newClient : newClient
};

function getPort(options) {
    return options.port || 1337;
}
function newClient(options) {
    options.baseUrl = 'http://localhost:' + getPort(options) + //
    options.pathPrefix;
    var client = new Mosaic.ApiDescriptor.SuperagentClientStub(options);
    return client;
}

function startServer(options) {
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

        // Create and register an API stub handling requests
        var handler = new Mosaic.ApiDescriptor.HttpServerStub(options);
        var prefix = (options.pathPrefix || '') + '/*';
        app.all(prefix, function(req, res) {
            handler.handle(req, res).done();
        });

        // Start the server
        var port = getPort(options);
        app.listen(port, Mosaic.P.nresolver(deferred));
    } catch (err) {
        deferred.reject(err);
    }
    return deferred.promise;
}
