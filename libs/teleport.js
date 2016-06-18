module.exports = teleport;
function teleport(Promise) {
    teleport.Promise = Promise;
    return teleport;
}

teleport.extend = function extend(to) {
    for (var i = 1; i < arguments.length; i++) {
        var from = arguments[i];
        if (!from) {
            continue;
        }
        for ( var key in from) {
            if (from.hasOwnProperty(key)) {
                to[key] = from[key];
            }
        }
    }
    return to;
}