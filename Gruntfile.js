/**
* Gruntfile.js
* Tuner configuration for grunt. (The JavaScript Task Runner)
*/

module.exports = function(grunt) {
	"use strict";

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		jsonlint:{
			tools:{
				src:[
					'bower.json',
					'.bowerrc',
					'.csscomb.json',
					'.jsdoc.json'
				]
			},
			manifest:{
				src:[
					'manifest.json'
				]
			}
		},

		jshint:{
			gruntfile:{
				src:[
					// Self-test
					'Gruntfile.js'
				]
			},
			code:{
				src:[
					'scripts/sources/*.js',
					'!scripts/sources/_libs.js'
				]
			},
			tests:{
				src:[
					'tests/**/*.js'
				]
			}
		},
		
		concat: {
			options: {
				separator: ';'
			},
			dist: {
				src: [
					'scripts/sources/_libs.js',
					'scripts/sources/tuner.js',
					'scripts/sources/tuner.note.js',
					'scripts/sources/tuner.source.js',
					'scripts/sources/tuner.source.audio.js',
					//'scripts/sources/tuner.source.guitarix.js',
					'scripts/sources/tuner.generator.js',
					'scripts/sources/tuner.generator.audio.js',
					'scripts/sources/tuner.ui.js',
					'scripts/sources/tuner.ui.debug.js'
				],
				dest: 'scripts/tuner.js',
			}
		},

		uglify: {
			options: {
				banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
			},
			dist: {
				files: {
					'tuner.<%= pkg.version %>.min.js': ['<%= concat.dist.dest %>']
				}
			}
		},

		qunit: {
			all: ['tests/**/*.html']
		},

		watch: {

			files: ['Gruntfile.js', 'scripts/sources/*.js', 'tests/*.js'],
			tasks: ['jshint', 'qunit', 'jsdoc', 'docco', 'concat']
		},

		jsdoc: {

			dist : {
				src: ['scripts/sources/*.js', 'tests/*.js'], 
				options: {
					destination: 'doc/jsdoc',
					configure: '.jsdoc.json'
				},
			}
		},
		docco: {

			dist : {
				src: ['scripts/sources/*.js', 'tests/*.js'], 
				options: {
					output: 'doc/docco'
				}
			}
		}
		
	});

	// Sanitizer plugin(s)
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-jsonlint');

	// Source generation plugin(s)
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	// Code quality plugin(s)
	grunt.loadNpmTasks('grunt-contrib-qunit');
	
	// Documentation plugin(s)
	grunt.loadNpmTasks('grunt-jsdoc');
	grunt.loadNpmTasks('grunt-docco');

	// Automation plugins
	grunt.loadNpmTasks('grunt-contrib-watch');

	// Register Task(s)
	grunt.registerTask('default', [
		'jshint',
		'jsonlint',
		'concat',
		'uglify'
	]);
	grunt.registerTask('tests', [
		'jshint',
		'jsonlint',
		'qunit'
	]);
	grunt.registerTask('doc', [
		'jsdoc', 'docco'
	]);
	
};
