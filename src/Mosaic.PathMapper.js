(function module(require) {
    "use strict";

    var Mosaic = module.exports = require('mosaic-commons');
    var _ = require('underscore');

    function PathMapper() {
        var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
        function esc(str) {
            return str.replace(escapeRegExp, '\\$&');
        }
        function wrap(str) {
            return '(' + str + ')';
        }
        var handlers = [];
        this.add = function(mask, obj) {
            var chunks = [];
            var names = [];
            var a = false;
            _.each(mask.split('*'), function(segment) {
                var b = false;
                _.each(segment.split(':'), function(str) {
                    if (!a && !b) {
                        chunks.push(esc(str));
                    } else if (a || b) {
                        var idx = str.indexOf('/');
                        var r = b ? '[^\/]+' : '.*?';
                        if (idx >= 0) {
                            chunks.push(wrap(r));
                            names.push(str.substring(0, idx));
                            chunks.push(esc(str.substring(idx)));
                        } else {
                            chunks.push(wrap(r));
                            names.push(str);
                        }
                    }
                    b = true;
                });
                a = true;
            });
            var str = chunks.join('');
            var regexp = new RegExp('^' + str + '$');
            handlers.push({
                mask : mask,
                regexp : regexp,
                names : names,
                obj : obj
            });
        };
        this.find = function(path) {
            var result = null;
            _.any(handlers, function(handler) {
                if (handler.regexp.test(path)) {
                    var params = {};
                    var array = handler.regexp.exec(path).slice(1);
                    var idx = 0;
                    _.each(array, function(param) {
                        var name = handler.names[idx++];
                        var value = param ? decodeURIComponent(param) : null;
                        params[name] = value;
                    });
                    result = {
                        params : params,
                        obj : handler.obj
                    };
                    return true;
                }
            });
            return result;
        };
    }
    PathMapper.formatPath = function(mask, params) {
        params = params || {};
        var array = mask.split(/[:\*]/gim);
        var path = [];
        for (var i = 0; i < array.length; i++) {
            var segment = array[i];
            if (i === 0) {
                if (segment !== '') {
                    path.push(segment);
                }
            } else {
                var name = null;
                var idx = segment.indexOf('/');
                if (idx >= 0) {
                    name = segment.substring(0, idx);
                    segment = segment.substring(idx);
                } else {
                    name = segment;
                    segment = null;
                }
                var value = params[name];
                if (!value) {
                    var msg = 'Required parameter "' + name + '" not defined.';
                    var err = new Error(msg);
                    err._code = 400;
                    throw err;
                }
                delete params[name];
                path.push(value);
                if (segment && segment !== '') {
                    path.push(segment);
                }
            }
        }
        return path.join('');
    };
    Mosaic.PathMapper = PathMapper;
})(require);
