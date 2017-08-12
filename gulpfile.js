var gulp = require('gulp');
var ts = require('gulp-typescript');
var uglify = require('gulp-uglify-es').default;
var tsProject = ts.createProject("tsconfig.json");
var webpack = require('webpack-stream');
var nodeExternals = require('webpack-node-externals');

gulp.task('makeTS', function() {
    return tsProject.src()
        .pipe(tsProject())
        .js.pipe(gulp.dest('lib/'));
});

gulp.task('bundleWorker', ['makeTS'], function() {
    return gulp.src('lib/fileWorker.js')
    .pipe(webpack({
        target: 'node',
        externals: [nodeExternals()],
        module: {
            loaders: [
                {
                    test: /\.node$/,
                    use: 'node-loader'
                }
            ]
        },
        output: {
            filename: 'fileWorker.js'
        }
    }))
    .pipe(uglify())
    .pipe(gulp.dest('release/'));
});

gulp.task('compile', ['makeTS', 'bundleWorker'], function() {
    return gulp.src('lib/index.js')
        .pipe(webpack({
            target: 'node',
            externals: [nodeExternals()],
            module: {
                loaders: [
                    {
                        test: /\.node$/,
                        use: 'node-loader'
                    }
                ]
            },
            output: {
                filename: 'bundle.js'
            }
        }))
        .pipe(uglify())
        .pipe(gulp.dest('release/'));
});