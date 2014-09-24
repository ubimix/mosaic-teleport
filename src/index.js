
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
    module.exports = Teleport;
