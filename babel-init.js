var path = require('path');
var basePath = path.resolve(__dirname, '.');
require("babel-core/register")({
    ignore : function(fileName) {
        fileName = path.relative(basePath, fileName);
        var ignore = fileName.indexOf('node_modules') === 0;
        if (ignore) {
            ignore = fileName.indexOf('mosaic') < 0;
        }
        // console.log('Load: ', fileName, 'babel: ', ignore);
        return ignore;
    }

});
