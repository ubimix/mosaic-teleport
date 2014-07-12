var Mosaic = require('..');
var d = module.exports = new Mosaic.ApiDescriptor();

// Authentication and user info
d.add('/auth/login', 'post', 'login');
d.add('/auth/info', 'get', 'userInfo');
d.add('/auth/logout', 'post', 'logout');

// Project management
d.add('/project', 'post', 'createProject');
d.add('/project/:projectId', 'get', 'getProjectInfo');
d.add('/project/:projectId', 'post', 'saveProjectInfo');
d.add('/projects', 'get', 'listProjects');
