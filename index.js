/* eslint-env node */
'use strict';

const fs = require('fs'),
  path = require('path'),
  through = require('through2'),
  gutil = require('gulp-util'),
  globby = require('globby'),
  pathSort = require('path-sort'),
  GettextHbsParser = require('gettext-handlebars');

/**
 * Escape unescaped double quotes
 *
 * @param {string} text
 * @return string
 */
function escapeQuotes (text) {
  text = text.replace(/\\([\s\S])|(")/g, '\\$1$2');
  return text;
}

/**
 * Get msgid lines in pot format
 *
 * @param {string}  msgid
 * @param {Boolean} [plural]
 *
 * @return {Array}
 */
function getPotMsgId (msgid, plural) {
  const output = [];
  const idKey = (plural ? 'msgid_plural' : 'msgid');

  if (msgid) {
    msgid = escapeQuotes(msgid);

    if (/\n/.test(msgid)) {
      output.push(`${idKey} ""`);
      const rows = msgid.split(/\n/);

      for (let rowId = 0; rowId < rows.length; rowId++) {
        const lineBreak = rowId === (rows.length - 1) ? '' : '\\n';

        output.push(`"${rows[ rowId ] + lineBreak}"`);
      }
    } else {
      output.push(`${idKey} "${msgid}"`);
    }
  }
  return output;
}

/**
 * Get plural msgids
 *
 * @param {Boolean} plural
 *
 * @return {Array}
 */
function getPotMsgPluralStr (plural) {
  if (!plural) {
    return [ 'msgstr ""\n' ];
  } else {
    return [ 'msgstr[0] ""', 'msgstr[1] ""\n' ];
  }
}

function createPot (options) {
  let defaultOptions = {
    // the base path of handlebars templates, which will be used to calculate the
    // file paths displayed in the output pot file.
    hbsBasePath: '',
    headers: {
      'X-Poedit-Basepath': '..',
      'X-Poedit-SourceCharset': 'UTF-8',
      'X-Poedit-SearchPath-0': '.',
      'X-Poedit-SearchPathExcluded-0': '*.js'
    },
    defaultHeaders: true,
    // which helper do we need to use in handlebar helpers, e.g.:
    // {{_ 'Send me an invitation email'}}
    // see 'gettext-handlebars' for more available options, but I think these 4
    // is sufficient for using.
    gettextFunctions: {
      // gettext
      _: {
        msgid: 0
      },

      // pgettext, first parameter is context string
      p_: {
        msgctxt: 0,
        msgid: 1
      },

      // ngettext, second parameter is plural string
      n_: {
        msgid: 0,
        msgid_plural: 1
      },

      // npgettext, first parameter is context string,
      // third parameter is plural string
      np_: {
        msgctxt: 0,
        msgid: 1,
        msgid_plural: 2
      } 
    }
  };

  options = Object.assign({}, defaultOptions, options);

  if (!options.package) {
    options.package = options.domain || 'unnamed project';
  }

  if (options.bugReport) {
    options.headers[ 'Report-Msgid-Bugs-To' ] = options.bugReport;
  }

  if (options.lastTranslator) {
    options.headers[ 'Last-Translator' ] = options.lastTranslator;
  }

  if (options.team) {
    options.headers[ 'Language-Team' ] = options.team;
  }

  // create a parser instance to extract gettext strings.
  let hbsParser = new GettextHbsParser(options.gettextFunctions);

  // pot part
  let curYear = new Date().getFullYear();

  let potContents = `# Copyright (C) ${curYear} ${options.package}
# This file is distributed under the same license as the ${options.package} package.
msgid ""
msgstr ""
"Project-Id-Version: ${options.package}\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"\n`;

  if (options.headers && !(Object.keys(options.headers).length === 0)) {
    Object.keys(options.headers).sort().forEach(function (key) {
      potContents += `"${key}: ${options.headers[ key ]}\\n"\n`;
    });
  }

  potContents += '"Plural-Forms: nplurals=2; plural=(n != 1);\\n"\n';
  potContents += '\n';

  return through.obj(function(file, enc, cb) {
    let _this = this;

    if (file.isNull()) {
      this.emit('error', new Error('empty file not supported!'));
      return cb();
    }

    if (file.isStream()) {
      this.emit('error', new Error('streaming not supported!'));
      return cb();
    }

    let hbsPath = file.path.replace(options.hbsBasePath, '');
    // remove leading slash
    if (hbsPath.substr(0,1) === '/') {
      hbsPath = hbsPath.substr(1);
    }

    // Find and sort file paths
    let translations = {};
    let parsedHbs = hbsParser.parse(file.contents.toString('utf8'));
  
    for (let translationKey in parsedHbs) {
      let translationCall = parsedHbs[translationKey];
      let info = [];

      for (let lineNumber of translationCall.line) {
        info.push(hbsPath + ':' + lineNumber);
      }

      let translationObject = {
        info: info.join(', '),
        msgid: translationCall.msgid
      };

      if (translationCall.msgid_plural) {
        translationObject.msgid_plural = translationCall.msgid_plural;
      }

      if (translationCall.msgctxt) {
        translationObject.msgctxt = translationCall.msgctxt;
      }

      // not implemented, won't be implemented.
      // if (translationCall.comment) {
      //   translationObject.comment = options.commentKeyword + translationCall.comment;
      // }

      translations[ translationKey ] = translationObject;
    }

    // Write translation rows.
    let translationEntries = [];
    for (let entry in translations) {
      // Comment feature not implemented, won't be implemented.
      // if (translations[ entry ].comment) {
      //   translationEntries.push(`#. ${translations[ entry ].comment}`);
      // }

      // Unify paths for Unix and Windows
      translationEntries.push(`#: ${translations[ entry ].info.replace(/\\/g, '/')}`);

      if (translations[ entry ].msgctxt) {
        translationEntries.push(`msgctxt "${escapeQuotes(translations[ entry ].msgctxt)}"`);
      }

      translationEntries = translationEntries.concat(getPotMsgId(translations[ entry ].msgid));
      translationEntries = translationEntries.concat(getPotMsgId(translations[ entry ].msgid_plural, true));
      translationEntries = translationEntries.concat(getPotMsgPluralStr(!!(translations[ entry ].msgid_plural)));
    }
    potContents += translationEntries.join('\n');

    // divide translations from two files using an empty line.
    if (translationEntries.length > 0) {
      potContents += '\n';
    }

    cb();
  }, function(flushCb){
    var file = new gutil.File({
      base: path.join(__dirname, './non-exist-dir/'),
      cwd: __dirname,
      path: path.join(__dirname, './non-exist-dir/'),
      contents: new Buffer(potContents)
    });

    this.push(file);

    flushCb()
  });
}

module.exports = createPot;
