/*
 * Copyright 2016 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

/* jshint node: true */

const path = require('path');
const through = require('through2');
const gutil = require('gulp-util');
const crypto = require('crypto');
const File = require('vinyl');

const OUTPUT_NAME = 'contents';

function hash(contents) {
  const md5 = crypto.createHash('md5');
  md5.update(contents, 'utf8');
  return md5.digest('hex');
}

module.exports = function fileManifest(version, prefix) {
  const out = {
    version,
    'shared': {},
    'scenes': {},
  };

  const pathPrefix = path.resolve(prefix);

  function processFile(file, enc, cb) {
    if (file.isNull() || file.isStream()) { return cb(); }

    const p = path.normalize(file.path);
    const rel = path.relative(pathPrefix, p);

    if (rel === `${OUTPUT_NAME}.js` || rel === `${OUTPUT_NAME}.json`) {
      // TODO(samthor): This is a bit ugly. It won't hit in real prod builds (since we build/clean)
      // but will occur over multiple test runs at the same version.
      return cb();  // nb. ignore ourselves
    }

    if (rel.match(/^audio/)) {
      // TODO(samthor): audio is hard, as it's in one folder and not tied to scenes
      return cb();
    }

    let target = out['shared'];
    const match = rel.match(/^scenes\/(.+?)\//);
    if (match) {
      const scene = match[1];
      if (scene !== 'shared') {  // don't match '/scene/shared'
        if (!(scene in out['scenes'])) {
          out['scenes'][scene] = {};
        }
        target = out['scenes'][scene];
      }
    }

    target[rel] = hash(file.contents);
    cb();
  }

  function buildManifest(cb) {
    const json = JSON.stringify(out);
    const outputJsonFile = new File({
      base: pathPrefix,
      contents: new Buffer(json),
      path: path.join(pathPrefix, `${OUTPUT_NAME}.json`),
    });
    this.push(outputJsonFile);

    const js = `// Generated at ${new Date().toISOString()}\nconst contents = ${json};`;
    const outputJsFile = new File({
      base: pathPrefix,
      contents: new Buffer(js),
      path: path.join(pathPrefix, `${OUTPUT_NAME}.js`),
    });
    this.push(outputJsFile);

    cb();
  }

  return through({objectMode: true}, processFile, buildManifest);
};
