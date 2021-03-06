/**
 * Copyright 2015 Mozilla
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var connect = require('gulp-connect');
var gulp = require('gulp');
var mocha = require('gulp-mocha');
var istanbul = require('gulp-istanbul');
var argv = require('yargs').argv;
var oghliner = require('./index.js');

gulp.task('default', ['build', 'offline']);

gulp.task('build', function(callback) {
  return gulp.src('app/**').pipe(gulp.dest('dist'));
});

gulp.task('configure', oghliner.configure);

gulp.task('deploy', function(callback) {
  oghliner.deploy({
    rootDir: 'dist',
  }, callback);
});

gulp.task('offline', ['build'], function(callback) {
  oghliner.offline({
    rootDir: 'dist/',
    fileGlobs: [
      'images/**',
      'index.html',
      'scripts/**',
      'styles/**',
    ],
  }, callback);
});

gulp.task('serve', function () {
  connect.server({
    root: 'dist',
  });
});

gulp.task('pre-test', function () {
  return gulp.src(['lib/**/*.js'])
    .pipe(istanbul({ includeUntested: true }))
    .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function () {
  return gulp.src(argv.file ? argv.file : 'test/test*.js', {read: false})
    // gulp-mocha needs filepaths so you can't have any plugins before it
    .pipe(mocha())
    .pipe(istanbul.writeReports());
})
