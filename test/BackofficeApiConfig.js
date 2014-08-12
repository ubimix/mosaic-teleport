if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}
define(
// Dependencies
[ 'require', '..' ],
// Module
function(require) {
    var Teleport = require('..');
    return function() {
        var d = new Teleport.ApiDescriptor();
        // Authentication and user info
        d.add('/auth/login', 'post', 'login');
        d.add('/auth/info', 'get', 'userInfo');
        d.add('/auth/logout', 'post', 'logout');

        // Project management
        d.add('/project', 'post', 'createProject');
        d.add('/project/:id', 'get', 'loadProject');
        d.add('/project/:id', 'post', 'saveProject');
        d.add('/projects', 'get', 'loadProjects');
        return d;
    };
});