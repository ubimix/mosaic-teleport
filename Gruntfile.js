module.exports = function(grunt) {

    // Project configuration.
    var banner = '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n';
    grunt.initConfig({
        pkg : grunt.file.readJSON('package.json'),
        mochaTest : {
            test : {
                options : {
                    reporter : 'spec'
                },
                src : [ 'test/**/Test*.js' ]
            }
        },
        browserify : {
            bundleOptions : {
                standalone : '<%= pkg.name %>'
            },
            app : {
                files : {
                    './dist-browser/<%= pkg.name %>.js' : [ 'src/index.js' ]
                },
                options : {
                    external : [ 'underscore', 'mosaic-commons' ],
                    required : [ 'mosaic-commons' ],
                    alias : [ 'src/index.js:<%= pkg.name %>' ]
                }
            }
        },
        uglify : {
            options : {
                banner : banner
            },
            browser : {
                src : 'dist-browser/<%= pkg.name %>.js',
                dest : 'dist-browser/<%= pkg.name %>.min.js'
            }
        },
        jshint : {
            files : [ 'gruntfile.js', 'src/**/*.js', 'test/**/*.js' ],
            // configure JSHint (documented at
            // http://www.jshint.com/docs/)
            options : {
                // more options here if you want to override JSHint
                // defaults
                globals : {
                    console : true,
                    module : true,
                    require : true
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.loadNpmTasks('browserify-shim');

    // this would be run by typing "grunt test" on the command line
    grunt.registerTask('test', [ 'jshint', 'mochaTest' ]);

    // Default task(s).
    // the default task can be run just by typing "grunt" on the command line
    grunt.registerTask('default', [ 'jshint', 'mochaTest', 'browserify',
            'uglify' ]);
}