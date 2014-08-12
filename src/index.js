if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(
// Dependencies
[ 'require', 'mosaic-commons', './HttpClient', './ApiDescriptor',
        './ApiDispatcher', './PathMapper', './HttpClient',
        './HttpClientSuperagent' ],
// Module
function(require) {
    var _ = require('underscore');
    var HttpClient = require('./HttpClient');
    var Superagent = require('superagent');
    var Mosaic = require('mosaic-commons');
    var Teleport = Mosaic.Teleport = {
        ApiDescriptor : require('./ApiDescriptor'),
        ApiDispatcher : require('./ApiDispatcher'),
        PathMapper : require('./PathMapper'),
        HttpClient : require('./HttpClient'),
        HttpClientSuperagent : require('./HttpClientSuperagent')
    };
    Teleport.HttpClient.Superagent = Teleport.HttpClientSuperagent;
    return Teleport;
});
