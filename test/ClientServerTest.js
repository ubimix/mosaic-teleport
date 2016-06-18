import express from 'express';
import expect from 'expect.js';
import teleport from '../';

describe('Client/server calls', function() {
    var port = 876543;
    test(
        port, 
        'should be able expose a service and call it remotely',
        function(app) {
            function http(path, method, action){
                if (action === undefined) {
                    action = method;
                    method = 'get';
                }
                action.path = path;
                action.method = method.toLowerCase();
                return action;
            }
            var service = {
                about : http('/about', function(options) {
                }),
                sayHello : http('/hello/*msg', function(options) {
                }),
                errors : http('/', '*', function(options){
                    return { status : 404, data : { message : 'Error 404: Not found' } }
                })
            };

            var descriptor = teleport.getDescriptor(service);
            expect(descriptor).to.eql({
                about : {
                    method : 'get',
                    path : '/about'
                },
                sayHello : {
                    method : 'get',
                    path : '/hello/*msg'
                },
                errors: {
                    method: '*',
                    path: '/'
                }
            });
    });
});
    


function test(port, msg, action){
    it(msg, function(done){
        return withServer(port, action).then(done, done);
    });
}

function withServer(port, action){
    return Promise.resolve().then(function(){
        const app = express();
        const server = app.listen(port);
        function close(){
            return new Promise(function(resolve, reject){
                return server.close(function(err){
                    if (err) return reject(err);
                    else return resolve();
                })
            });
        }
        return Promise.resolve().then(function(){
            return action(app);
        }).then(close, function(err){
            return close().then(function(){
                throw err;
            });
        });
    });
}