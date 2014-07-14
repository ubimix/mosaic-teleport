(function(module, require) {
    "use strict";

    var Mosaic = module.exports = require('mosaic-commons');
    var _ = require('underscore');

    /**
     * This class is used to map path masks to objects. It allows to find
     * nearest object matching to the given path. This class is useful to
     * implement call routers.
     */
    var PathMapper = Mosaic.PathMapper = Mosaic.Class.extend({

        /** Initialization of this object. */
        initialize : function() {
            var that = this;
            that.handlers = [];
        },

        /**
         * Adds a new object to this mapper.
         * 
         * @param mask
         *            path mask used to dispatch to this object
         * @param obj
         *            the object to add
         */
        add : function(mask, obj) {
            var that = this;
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
            that.handlers.push({
                mask : mask,
                regexp : regexp,
                names : names,
                obj : obj
            });
        },

        /**
         * Finds and returns a nearest object corresponding to the given path.
         * This method returns an object with two fields: 1) The 'obj' field
         * contains the found object 2) The 'params' field contains all found
         * path parameters (defined in the initial path mask used to register
         * this object).
         */
        find : function(path) {
            var that = this;
            var result = null;
            _.any(that.handlers, function(handler) {
                if (!handler.regexp.test(path))
                    return;
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
            });
            return result;
        },

        /**
         * Removes and returns the mapped object corresponding to the specified
         * path mask.
         */
        remove : function(mask) {
            var that = this;
            var result = null;
            var removed = null;
            that.handlers = _.filter(that.handlers, function(handler) {
                var keep = true;
                if (handler.mask === mask) {
                    removed = handler.obj;
                    keep = false;
                }
                return keep;
            });
            return removed;
        }

    });

    /**
     * A static method used to format a string based on the given path mask and
     * specified parameters.
     */
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

    /** Regular expression used to find and replace special symbols. */
    var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
    /** Escapes the specified string */
    function esc(str) {
        return str.replace(escapeRegExp, '\\$&');
    }
    /** Transforms the given string in a Regexp group. */
    function wrap(str) {
        return '(' + str + ')';
    }

})(module, require);
