import expect from 'expect.js';
import teleport from '../';

describe('ServiceTest', function() {
    it('should be able to generate service descriptor from annotated methods',
            function() {
                var service = {
                    about : function(options) {
                    },
                    sayHello : function(options) {
                    }
                }
                service.sayHello.method = 'GET';
                service.sayHello.path = '/hello/*path';
                service.about.method = 'GET';
                service.about.path = '/about';

                var descriptor = teleport.getDescriptor(service);
                expect(descriptor).to.eql({
                    about : {
                        method : 'get',
                        path : '/about'
                    },
                    sayHello : {
                        method : 'get',
                        path : '/hello/*path'
                    }
                });
            });

    it('should be able to call method using adapters', function(done) {
        var service = {
            about : function(options) {
                return {
                    data : {
                        message : 'About'
                    }
                }
            },
            sayHello : function(options) {
                return Promise.resolve().then(function() {
                    var params = options.params || {};
                    return {
                        headers : { 'Content-Type' : 'application/javascript' },
                        data : {
                            message : 'Hello, ' + params.path
                        }
                    }
                });
            }
        }
        service.sayHello.method = 'GET';
        service.sayHello.path = '/hello/:path';
        service.about.method = 'GET';
        service.about.path = '/about';

        var adapter = new teleport.ServiceAdapter(Promise, service);
        expect(adapter.descriptor).to.eql({
            about : {
                method : 'get',
                path : '/about'
            },
            sayHello : {
                method : 'get',
                path : '/hello/:path'
            }
        });
        return Promise.all([
            adapter.handle({
                method : 'get',
                path : '/hello/world'
            }).then(function(result) {
                expect(result).to.eql({
                    headers : { 'Content-Type' : 'application/javascript' },
                    data : {
                        message : 'Hello, world'
                    }
                });
            }),
            adapter.handle({
                method : 'get',
                path : '/about'
            }).then(function(result) {
                expect(result).to.eql({
                    data : {
                        message : 'About'
                    }
                });
            })
        ]).then(function(){
            done();
        }, done);
    });
    
    it('should be able to call method using client/adapters bridges', function(done) {
        var service = {
            about : function(options) {
                return {
                    data : {
                        message : 'About'
                    }
                }
            },
            sayHello : function(options) {
                return Promise.resolve().then(function() {
                    var params = options.params || {};
                    return {
                        headers : { 'Content-Type' : 'application/javascript' },
                        data : {
                            message : 'Hello, ' + params.msg
                        }
                    }
                });
            }
        }
        service.sayHello.method = 'GET';
        service.sayHello.path = '/hello/*msg';
        service.about.method = 'GET';
        service.about.path = '/about';
        
        var adapter = new teleport.ServiceAdapter(Promise, service);
        var client = new teleport.ServiceClient(Promise, adapter.descriptor);
        client._call = adapter.handle.bind(adapter);

        return Promise.all([client.sayHello({ params : { msg : 'Toto/Titi/Tata'} }).then(function(result){
                expect(result).to.eql({
                    headers : { 'Content-Type' : 'application/javascript' },
                    data : {
                        message : 'Hello, Toto/Titi/Tata'
                    }
                });
            }),
            client.about().then(function(result){
                expect(result).to.eql({
                    data : {
                        message : 'About'
                    }
                });
            })
            ]).then(function(){ done(); }, done);
    });    
});