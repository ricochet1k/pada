
var gulp = require('gulp'),
    notify = require('gulp-notify'),
    babel = require('gulp-babel'),
    flow = require('gulp-flowtype'),
    sourcemaps = require('gulp-sourcemaps'),
    sourcemapReporter = require('jshint-sourcemap-reporter'),
    less = require('gulp-less'),
    newer = require('gulp-newer'),
    watch = require('gulp-watch'),
    plumber = require('gulp-plumber'),
    bowerRequireJS = require('bower-requirejs'),
    path = require('path'),
    merge = require('merge'),
    spawn = require('child_process').spawn;
 
var source = "./src", flowDest = "tmp_build_flow", destination = "./dist";


var babel_options = {
	modules: "common",
	nonStandard: true,
	jsxPragma: "h",
	plugins: ["jsx-factory"],
};



gulp.task('flow:babel', function() {
    return gulp.src(source + '/**/*.js')
        .pipe(sourcemaps.init())
        .pipe(babel(merge.recursive({ blacklist: ['flow'] }, babel_options)))
        .on('error', notify.onError('Flow: <%= error.message %>'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(flowDest));
});

gulp.task('flow:babel:watch', function() {
    /*return*/ gulp.src(source + '/**/*.js')
        .pipe(watch(source + "/**/*.js"))
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(babel(merge.recursive({ blacklist: ['flow'] }, babel_options)))
        .on('error', notify.onError('Flow: <%= error.message %>'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(flowDest));
});

gulp.task('flow', ['flow:babel'], function() {
    return gulp.src(flowDest + '/**/*.js')
        .pipe(flow({
            all: false,
            weak: false,
            killFlow: false,
            beep: true,
            abort: false,
            reporter: {
                reporter: function(errors) {
                    return sourcemapReporter.reporter(errors, { sourceRoot: '/' + source + '/' });
                }
            }
        }));
});
 
gulp.task('flow:watch', ['flow:babel:watch'], function() {
    gulp.watch(source + '/**/*.js', ['flow']);
});


gulp.task('babel', function () {
    return gulp.src(source + "/**/*.js")
        .pipe(sourcemaps.init())
        .pipe(babel(babel_options)) // run babel and pass options
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(destination));
});

gulp.task('babel:watch', function() {
    // gulp.watch(source + '/**/*.js', ['babel']);
    gulp.src(source + "/**/*.js")
        .pipe(watch(source + "/**/*.js"))
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(babel(babel_options)) // run babel and pass options
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(destination));
});


// gulp.task('bower', function(cb) {
//     var options = {
//         baseUrl: 'static',
//         config: destination + '/require.config.js',
//         transitive: true
//     };

//     bowerRequireJS(options, function (rjsConfigFromBower) {
//         console.log("Updated "+options.config+" !");
//         cb();
//     });
// });

// gulp.task('bower:watch', function() {
// 	gulp.watch('bower.json', ['bower']);
// })


gulp.task('less', function() {
  return gulp.src(source + '/**/*.less')
    .pipe(less({
    	paths: [ path.join(__dirname, 'less', 'includes')]
    }))
    .pipe(gulp.dest(destination))
})

gulp.task('less:watch', function() {
    // gulp.watch('./src/**/*.less', ['less']);
  gulp.src(source + '/**/*.less')
    .pipe(watch(source + "/**/*.less"))
    .pipe(plumber())
    .pipe(less({
    	paths: [ path.join(__dirname, 'less', 'includes')]
    }))
    .pipe(gulp.dest(destination))
})

gulp.task('default', [/*'bower',*/ 'babel', 'flow', 'less'], function() {

});

gulp.task('watch', ['default', /*'bower:watch',*/ 'babel:watch', 'flow:watch', 'less:watch'], function() {

});

gulp.task('auto-watch', ['spawn'], function () {
	gulp.watch('gulpfile.js', ['spawn']);
});


var p;
gulp.task('spawn', function() {
	if (p) p.kill();

	p = spawn('gulp', ['watch'], {stdio: 'inherit'});
});
