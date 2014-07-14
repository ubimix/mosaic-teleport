var port = 3701;
var express = require("express");
var app = express();
app.use(express.static(__dirname + '/..'));
app.listen(port);
console.log('http://localhost:3701/examples');