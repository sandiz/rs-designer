module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        // define a string to put between each file in the concatenated output
        separator: ';'
      },
      dist: {
        // the files to concatenate
        src: ['src/buffer.js','src/core.js','src/filter.js','src/pipe.js','src/rate-transposer.js','src/soundtouch.js','src/stretch.js','src/pitchshifter.js'],
        // the location of the resulting JS file
        dest: 'tmp/soundtouch.concat.js'
      }
    },
    uglify: {
      options: {
        // the banner is inserted at the top of the output
        banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      },
      dist: {
        files: {
          'soundtouch.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },
    clean: ['tmp']
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('default', ['concat','uglify','clean'])

};