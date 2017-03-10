# gulp-fontmin-wrapper
Samelessly integrate `Fontmin` with gulp.

# how to use

```
...
var foo = require('gulp-foo'),
    fontminWrapper = require('gulp-fontmin-wrapper'),
    bar = require('gulp-bar');

gulp.task('fontmin', function () {
  // define the files to be searched for the chinese glyphs.
  var srcFiles = [
      path.join(tplRoot, '**/*.html'),
      path.join(tplRoot, '**/*.hbs'),
      path.join(assetRoot, './js/**/*.js')
  ];

  // all the src files MUST be plain text with 'utf-8' encoding, so that
  // from them the Chinese glyphs can be correctly extracted.
  gulp.src(srcFiles)
    .pipe(fontminWrapper({
        // how to extract the chinese glyphs. by default it keeps `u4e00-u9fa5` and drop all others.
        // extractionAlgorithm: function (text) {return text.replace('foo', 'bar');},
        fontPath: path.join(assetRoot, 'libs/zh-CN-fonts/PingFang.ttf'),
        // depends on whether this font supports those glyphs or not.
        mustHaveGlyphs: '。？！，、；：“”‘’─…—·（）《》〈〉【】〔〕「」『』～￥'
    }))
    .pipe(gulp.dest(path.join(assetRoot, 'fonts/PingFang';
});
```

# FAQs

1. Some glyphs is missing, such as some punctuations.

  you can define the missing glyphs in `mustHaveGlyphs` option, if it doesn't work, that probably means the font itself doesn't have those glyphs included.

2. How can I verify if the new font is been using(rendering)?

  open Chrome development tools and switch to `Elements - Computed` panel, at the bottom there will be one column called "Rendered Fonts", my result is "OTS derived font—6 glyphs", which means Chrome rendered 6 glyphs using the font I just generated.

