module.exports = {
    entry : __dirname + '/index.js',
    output : {
        path : __dirname + '/dist',
        filename : 'index.js',
        library : 'teleport',
        libraryTarget : 'umd'
    },
    module : {},
    externals : [ 'superagent' ],
};
