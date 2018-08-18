const fs = require('fs');
const path = require('path');

const gulp = require('gulp');
const fileinclude = require('gulp-file-include');
const sass = require('gulp-sass');
const cleanCSS = require('gulp-clean-css');
const uglify = require('gulp-uglify-es').default;
const autoprefixer = require('autoprefixer');
const postcss = require('gulp-postcss');
const comments = require('postcss-discard-comments');
const clean = require('gulp-clean');
const browserSync = require('browser-sync').create();
const plumber = require('gulp-plumber');
const changed = require('gulp-changed');
const watch = require('gulp-watch');
const sourcemaps = require('gulp-sourcemaps');

const rollup = require('gulp-rollup');
const babel = require('rollup-plugin-babel')
const resolve = require('rollup-plugin-node-resolve');

const rev = require('gulp-revm');
const revCollector = require('gulp-revm-collector');

//编译路径
const devPath = './src';
const tempPath = './temp';
const distPath = './dist';

const compileHtml = () => {
    return gulp
        .src([`${devPath}/html/**/*.html`,`!${devPath}/html/include/*.html`])
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(plumber())
}

const compileStyle = () => {
    const plugins = [
        autoprefixer(['iOS >= 7', 'Android >= 4.1']),
        comments()
    ];

    return gulp
        .src([`${devPath}/sass/*.scss`])
        .pipe(plumber())
        .pipe(sourcemaps.init())
        .pipe(changed(`${tempPath}/css/`, {
            hasChanged: changed.compareContents,
            extension: '.css'
        }))
        .pipe(sass().on('error', sass.logError))
        .pipe(postcss(plugins))
        .pipe(sourcemaps.write('.'))
}


//读取入口文件
let readdirfile = []
const readFile = (path) =>{
    readdirfile = fs.readdirSync(path,{encoding:'utf-8'})
}

const readEntryFile = async () =>{
    const filePath = path.join(__dirname, `${devPath}/js`)

    readFile(filePath)

    return readdirfile
        .filter(el => /\.js/.test(el))
        .map(item => `${devPath}/js/${item}`)
}

const compileJs = () => {
    const fileList = readEntryFile();
    return gulp
        .src([`${devPath}/js/**/*.js`])
        .pipe(plumber())
        .pipe(changed(`${tempPath}/js/`, {hasChanged: changed.compareContents}))
        .pipe(sourcemaps.init())
        .pipe(rollup({
            input: fileList,
            output: {
                format: 'es'
            },
            plugins: [
                resolve(),
                babel({
                    exclude: 'node_modules/**',
                    babelrc: false,
                    presets: [['@babel/preset-env', {modules: false}]]
                })
            ]
        }))
        .pipe(uglify())
        .pipe(sourcemaps.write("."))
}

const compileImages = () => {
    return gulp
        .src([`${devPath}/images/**/*`, `!${devPath}/images/sprites/**/*`])
        .pipe(plumber())
}

const compileFonts = () => {
    return gulp
        .src([`${devPath}/font/**/*`])
        .pipe(plumber())
}

const compileLib = () => {
    return gulp
        .src([`${devPath}/lib/**/*`])
        .pipe(plumber())
}

//browser-sync
gulp.task('browser-sync', () => {
    browserSync.init({
        server: {
            baseDir: tempPath
        },
        port: 8091,
        notify: false, //刷新是否提示
        open: false //是否自动打开页面
    });

});

//html
gulp.task('compileHtml', () => {
    return watch(`${devPath}/html/**/*`, () => {
        compileHtml()
            .pipe(gulp.dest(`${tempPath}/html`))
            .pipe(browserSync.stream());
    })
});

//style
gulp.task('compileStyle', () => {
    return watch(`${devPath}/sass/**/*.scss`, () => {
        compileStyle()
            .pipe(gulp.dest(`${tempPath}/css/`))
            .pipe(browserSync.stream()); //browserSync:只监听sass编译之后的css
    })
});

//js
gulp.task('compileJs', () => {
    return watch(`${devPath}/js/**/*.js`, () => {
        compileJs()
            .pipe(gulp.dest(`${tempPath}/js/`))
            .pipe(browserSync.stream());
    })
});

//images
gulp.task('compileImages', () => {
    return watch(`${devPath}/images/**/*`, () => {
        compileImages()
            .pipe(gulp.dest(`${tempPath}/images/`))
            .pipe(browserSync.stream())
    })
});

//font
gulp.task('compileFonts', () => {
    return watch(`${devPath}/font/**/*`, () => {
        compileFonts()
            .pipe(gulp.dest(`${tempPath}/font/`))
            .pipe(browserSync.stream())
    })
});

//lib
gulp.task('compileLib', () => {
    return watch(`${devPath}/lib/**/*`, () => {
        compileLib()
            .pipe(gulp.dest(`${tempPath}/lib/`))
            .pipe(browserSync.stream());
    })
});

//clean
gulp.task('compileClean', () => {
    return gulp
        .src([`${tempPath}`])
        .pipe(plumber())
        .pipe(clean({force: true}))
});

//devPack
gulp.task('compile', ['compileHtml', 'compileStyle', 'compileJs', 'compileImages', 'compileFonts']);

//compileAssets
gulp.task('compileAssets', ['compileClean'], () => {
    compileHtml().pipe(gulp.dest(`${tempPath}/html`));
    compileStyle().pipe(gulp.dest(`${tempPath}/css`));
    compileJs().pipe(gulp.dest(`${tempPath}/js`));
    compileImages().pipe(gulp.dest(`${tempPath}/images`));
    compileFonts().pipe(gulp.dest(`${tempPath}/fonts`));
    compileLib().pipe(gulp.dest(`${tempPath}/lib`));
});

gulp.task('default', [
    'compileAssets', 'compile','browser-sync'
], () => {
    gulp
        .watch([`${tempPath}/**/*.+(html|css|js|png|jpg|ttf)`])
        .on('change', browserSync.reload);
});


/**
 * 打包文件
 */

gulp.task('buildVersion',()=>{
    return gulp
        .src([`${distPath}/rev/**/*.json`,`${distPath}/html/**/*.html`])
        .pipe(plumber())
        .pipe(revCollector({
            replaceReved: true
        }))
        .pipe(gulp.dest(`${distPath}/html`))
})

gulp.task('buildAssets',()=>{
    compileHtml()
        .pipe(gulp.dest(`${distPath}/html`))

    compileStyle()
        .pipe(sourcemaps.init())
        .pipe(cleanCSS())
        .pipe(sourcemaps.write())
        .pipe(rev())
        .pipe(gulp.dest(`${distPath}/css`))
        .pipe(rev.manifest())
        .pipe(gulp.dest(`${distPath}/rev/css`))

    compileJs()
        .pipe(rev())
        .pipe(gulp.dest(`${distPath}/js`))
        .pipe(rev.manifest())
        .pipe(gulp.dest(`${distPath}/rev/js`))

    compileImages().pipe(gulp.dest(`${distPath}/images`))
    compileFonts().pipe(gulp.dest(`${distPath}/fonts`))
    compileLib().pipe(gulp.dest(`${distPath}/lib`))
})


//清理文件
gulp.task('buildClean',()=>{
    return gulp
        .src([`${distPath}`])
        .pipe(plumber())
        .pipe(clean({force: true}))
})

//打包文件
gulp.task('build',['buildAssets'],()=>{})
