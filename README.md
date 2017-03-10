# gulp-handlebars-pot
Extract i18n text from handlebars templates using gettext functions(_, n_, p_, np_)

# how to use

```
...
// task tested under gulp 4.0
var foo = require('gulp-foo'),
    fontminWrapper = require('gulp-handlebars-pot'),
    bar = require('gulp-bar');

function createHbsPotTask () {
    var hbsBase = path.join(tplRoot, 'hbs'),
        hbsSrc = path.join(hbsBase, '**/*.hbs');

    return gulp.src(hbsSrc)
        .pipe(plumber())
        .pipe(gettextHbs({
            // /path/to/your/hbs/templates
            hbsBasePath: path.join(tplRoot, 'hbs'),
            domain: 'My Fancy i18n-supported Project'
        }))
        .pipe(gulp.dest(
            path.join(projRoot, 'i18n/translation-handlebars.pot')
        ));
}

gulp.task('create-hbs-pot', createHbsPotTask);

```

# FAQs

1. How do I use this 'pot' file?

  You can use some i18n editor like 'Poedit' to generate po/mo file from the pot
  file and translate the po files.

  After po files been translated, consider using `po2json` or something else to
  compile it into javascript recognizable format, then use `Jed` to load the translation data into your i18n-ed APP.

2. But it's still not working...

  You need to have the four extractor function defined as helpers in Handlebars runtime, something like:

  ```
  jed_instance = new Jed({
    localedata: from `po2json` in previous step
  });

  Handlebars.registerHelper('_', function(){
    jed_instance.fetch('a fancy i18n string')
  })
  ```

  after that, 
