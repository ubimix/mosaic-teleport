var port = 3701;

var Mosaic = require('mosaic-commons');
require('..'); // require('mosaic-teleport');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

/* ------------------------------------------------------- */
// Creates and initializes an Express application
var app = express();
app.use(bodyParser.urlencoded({
    extended : false
}));
app.use(bodyParser.json());
app.use(cookieParser('optional secret string'));
app.use(express.static(__dirname + '/..'));

/* ------------------------------------------------------- */
// API
var BackofficeApi = require('./api/BackofficeApi');
// Register an API endpoint
var api = new BackofficeApi();
var stub = new Mosaic.ApiDescriptor.HttpServerStub({
    path : '/examples/api',
    instance : api,
    beginHttpCall : function(params) {
        var sessionId = params.req.get('x-session-id') || // HTTP headers
        (params.res.cookies || {})['x-session-id']; // Cookies
        if (sessionId) {
            // Put the content of the session ID in the query;
            // So this value became available to API instance methods.
            params.req.query.sessionId = sessionId;
        }
    },
    endHttpCall : function(params) {
        var sessionId = params.result ? params.result.sessionId : null;
        if (sessionId) {
            params.res.set('x-session-id', sessionId); // HTTP headers
            params.res.cookie('x-session-id', sessionId); // Cookies
            delete params.result.sessionId;
        }
    },
})
stub.registerIn(app);

/* ------------------------------------------------------- */
// Start the server
app.listen(port);
console.log('http://localhost:3701/examples');
