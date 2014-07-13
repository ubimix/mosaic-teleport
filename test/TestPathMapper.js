var expect = require('expect.js');
var _ = require('underscore');

var Mosaic = require('..');
var P = Mosaic.P;
var PathMapper = Mosaic.PathMapper;

describe('mosaic-teleport/PathMapper - Formatting', function() {
    it('should build correct paths', function() {
        var mask = '/abc/project/:projectId/' + //
        'resource/*resourcePath/version/:versionId';
        var params = {
            projectId : 'Project1',
            resourcePath : 'path/to/my/resource.pdf',
            versionId : 'my-new-version'
        };
        var path = PathMapper.formatPath(mask, params);
        var control = '/abc/project/Project1/' + //
        'resource/path/to/my/resource.pdf/version/my-new-version';
        expect(path).to.eql(control);
    });
});

describe('mosaic-teleport/PathMapper - Extraction', function() {
    function test(mask, obj, t, result) {
        var mapper = new PathMapper();
        mapper.add(mask, obj);
        var r = mapper.find(t);
        expect(r).to.eql(result);
    }
    it('match masks', function() {
        test('/:a', 'A', '/x', {
            params : {
                a : 'x'
            },
            obj : 'A'
        });
        test('/:a/:b', 'A', '/x/y', {
            params : {
                a : 'x',
                b : 'y'
            },
            obj : 'A'
        });
        // test('/(:a)', 'A', '/x', {
        // params : {
        // a : 'x'
        // },
        // obj : 'A'
        // });
        // test('/:a(/:b)', 'A', '/x/y', {
        // params : {
        // a : 'x',
        // b : 'y'
        // },
        // obj : 'A'
        // });
        // test('/:a(/:b)', 'A', '/x', {
        // params : {
        // a : 'x',
        // b : null
        // },
        // obj : 'A'
        // });
        test('/id-:n', 'A', '/id-y', {
            params : {
                n : 'y'
            },
            obj : 'A'
        });
        test('/x/*b/y', 'A', '/x/this/is/a/path/y', {
            params : {
                b : 'this/is/a/path'
            },
            obj : 'A'
        });
        test('/x/*b/y/:c', 'A', '/x/this/is/a/path/y/123', {
            params : {
                b : 'this/is/a/path',
                c : '123'
            },
            obj : 'A'
        });
        test('/x/*b/y/:c/z/*d', 'A', '/x/this/is/a/path/y/123/z/a/new/path', {
            params : {
                b : 'this/is/a/path',
                c : '123',
                d : 'a/new/path'
            },
            obj : 'A'
        });
    });

    it('should be able to parse multiple paths', function() {
        var mapper = new PathMapper();
        mapper.add('/project/:project/user/:user', 'Project + User');
        mapper.add('/project/:project', 'Project Only');
        mapper.add('/foo-:id', 'FFooBar');
        mapper.add('/:toto/:tata', 'Toto Tata');
        mapper.add('/hello/*world', 'Hello World');

        var obj = mapper.find('/project/hello world/user/toto');
        expect(obj).to.eql({
            params : {
                project : 'hello world',
                user : 'toto'
            },
            obj : 'Project + User'
        });

        obj = mapper.find('/project/hello world');
        expect(obj).to.eql({
            params : {
                project : 'hello world'
            },
            obj : 'Project Only'
        });

        obj = mapper.find('/ABC/CDE');
        expect(obj).to.eql({
            params : {
                toto : 'ABC',
                tata : 'CDE'
            },
            obj : 'Toto Tata'
        });

        obj = mapper.find('/foo-123');
        expect(obj).to.eql({
            params : {
                id : '123'
            },
            obj : 'FFooBar'
        });

        obj = mapper.find('/hello/to/every/body');
        expect(obj).to.eql({
            params : {
                world : 'to/every/body'
            },
            obj : 'Hello World'
        });
    });

    it('should be able to add and remove paths', function() {
        var mapper = new PathMapper();
        mapper.add('/project/:project/user/:user', 'Project + User');
        mapper.add('/project/:project', 'Project Only');
        mapper.add('/foo-:id', 'FFooBar');
        mapper.add('/:toto/:tata', 'Toto Tata');
        mapper.add('/hello/*world', 'Hello World');

        var obj = mapper.find('/hello/myWorld');
        expect(obj).to.eql({
            params : {
                toto : 'hello',
                tata : 'myWorld'
            },
            obj : 'Toto Tata'
        });

        var removed = mapper.remove('/:toto/:tata');
        expect(removed).to.eql('Toto Tata');

        obj = mapper.find('/hello/myWorld');
        expect(obj).to.eql({
            params : {
                world : 'myWorld'
            },
            obj : 'Hello World'
        });

    });

});
