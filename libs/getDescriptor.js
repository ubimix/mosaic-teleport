module.exports = getDescriptor;

function getDescriptor(service) {
    var result = {};
    for ( var field in service) {
        var value = service[field];
        if (typeof value === 'function') {
            var methodInfo = getMethodInfo(value);
            if (methodInfo) {
                result[field] = methodInfo;
            }
        }
    }
    return result;
}

function getMethodInfo(method) {
    if (method.path) {
        return {
            method : (method.method || 'get').toLowerCase(),
            path : method.path
        }
    }
}