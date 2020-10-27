'use strict';

var gulp = require('gulp');
var browserSync = require('browser-sync');
var nodemon = require('gulp-nodemon');
var ngrok = require('ngrok');

const nodemonTask = (done) => {
  var started = false;
  return nodemon({
    script: 'server.js'
  }).on('start', function() {
    if (!started) {
      done();
      started = true;
    }
  });
}
gulp.task('nodemon', gulp.series(nodemonTask));

const serve = (done) => {
  browserSync.init(null, {
    proxy: "localhost:5000",
    files: '',
    port: 7000,
  }, function(err, bs) {
    ngrok.connect(bs.options.get('port'), (err, url) => {
      if (err) {
        console.error('Error while connecting Ngrok', err);
        return new Error('Ngrok Failed');
      } else {
        console.log('Tunnel URL -> ', url);
        console.log('Tunnel Inspector ->  http://127.0.0.1:4040');
      }
    });
  });

  gulp.watch("views/*").on('change', browserSync.reload);
  gulp.watch("public/*").on('change', browserSync.reload);

  done();
}
gulp.task('serve', gulp.series('nodemon', serve));

gulp.task('default', gulp.series('serve'));

