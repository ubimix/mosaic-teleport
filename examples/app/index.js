(function($wnd, require, define) {
    'use strict';
    require.config({
        paths : {
            'underscore' : 'libs/underscore/underscore',
            'jquery' : 'libs/jquery/dist/jquery',
            'superagent' : 'libs/superagent/superagent',
            'mosaic-teleport' : '../../dist/mosaic-teleport',
            'mosaic-commons' : //
            '../../node_modules/mosaic-commons/dist/mosaic-commons'
        },
        shim : {
            'underscore' : {
                exports : '_'
            },
            'jquery' : {
                exports : '$'
            },
            'mosaic-commons' : {
                deps : [ 'underscore' ]
            },
            'mosaic-teleport' : {
                deps : [ 'underscore', 'superagent', 'mosaic-commons' ]
            }
        }
    });
    var Mosaic = $wnd.Mosaic = {
        id : '123'
    };
    require([ 'mosaic-commons', 'mosaic-teleport', 'jquery' ], function() {

        var msgPanel = $('<div></div>');
        $('body').append(msgPanel);
        require('mosaic-commons');
        console.log(Mosaic);
        Mosaic.P.then(function() {
            msgPanel.append('<p>Start an async process (1500 ms).</p>');
            msgPanel.append('<p>Waiting please...</p>');
            console.log('Waiting...')
            return Mosaic.P.delay(1500).then(function() {
                msgPanel.append('<p>Done!</p>');
            });
        }).done();
    })

})(window, require, define);
