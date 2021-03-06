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

var gulp = require('gulp');
var conflict = require('gulp-conflict');
var template = require('gulp-template');
var install = require('gulp-install');
var rename = require("gulp-rename");
var inquirer = require('inquirer');
var gitconfiglocal = require('gitconfiglocal');
var through2 = require('through2');
var util = require('gulp-util');

function prompt(questions) {
  // inquirer doesn't follow the node style callback so we can't use promisify
  return new Promise(function(resolve, reject) {
    inquirer.prompt(questions, function(answers) {
      resolve(answers);
    })
  });
}

function gitUrl(dir) {
  return new Promise(function (resolve, reject) {
    gitconfiglocal(dir, function(error, config) {
      if (error) {
        resolve(null);
        return;
      }
      if ('remote' in config && 'origin' in config.remote && 'url' in config.remote.origin) {
        resolve(config.remote.origin.url);
      }
      resolve(null);
    })
  });
}

function templateConfigPrompt(defaultConfig) {
  console.log("The current template configuration is:")
  console.log(templateConfigToString(defaultConfig));

  return prompt([ { type: "confirm", name: "fillInConfig", message: "Would you like to change any of the above configuration values?"}]).then(function(answers) {
    if (!answers.fillInConfig) {
      return defaultConfig;
    }
    return prompt([
      {
        type: "input",
        name: "name",
        message: "Project name",
        default: defaultConfig.name,
      },
      {
        type: "input",
        name: "repository",
        message: "Repository URL",
        default: defaultConfig.repository,
      },
      {
        type: "input",
        name: "description",
        message: "Description",
        default: defaultConfig.description,
      },
      {
        type: "input",
        name: "license",
        message: "License",
        default: defaultConfig.license,
      },
    ]);
  });
}

function templateConfigOption(defaultConfig, config) {
  for (var key in config) {
    if (typeof defaultConfig[key] === "undefined") {
      throw new Error("Unrecognized template option: " + key);
    }
    defaultConfig[key] = config[key];
  }
  return defaultConfig;
}

function templateConfigToString(config) {
  var out = [];
  for (var key in config) {
    out.push(key + ": " + config[key]);
  }
  return out.join("\n");
}

function getDefaultTemplateConfig(dir) {
  var config = {
    name: "oghliner-template-app",
    repository: "https://oghliner-template-app.git",
    description: "A template app bootstrapped with oghliner.",
    license: "Apache-2.0",
  };

  return gitUrl(dir).then(function(url) {
    if (url) {
      config.repository = url;
      // Try to fill in the project named based on the repo url.
      if (url.substr(-4, 4) === ".git") {
        config.name = url.substring(url.lastIndexOf('/') + 1, url.length - 4);
      }
    }
    return config;
  })
}

function sink() {
  return through2.obj(function (file, enc, callback) {
    callback();
  });
}

module.exports = function(config) {
  config = config || {};
  config.npmInstall = 'npmInstall' in config ? config.npmInstall : true;

  var rootDir = config.rootDir ? config.rootDir : '.';
  return getDefaultTemplateConfig(rootDir)
    .then(function(defaultConfig) {
      if (config.template) {
        return templateConfigOption(defaultConfig, config.template);
      }
      return templateConfigPrompt(defaultConfig);
    })
    .then(function(templateConfig) {
      return new Promise(function(resolve, reject) {
        var stream = gulp.src([__dirname + '/../templates/**'])
          .pipe(rename(function (path) {
            // NPM can't include a .gitignore file so we have to rename it.
            if (path.basename === "gitignore") {
              path.basename = ".gitignore";
            }
          }))
          .pipe(template(templateConfig))
          .pipe(conflict(rootDir))
          .pipe(gulp.dest(rootDir))
          .pipe(config.npmInstall ? install() : util.noop())
          .pipe(sink()); // Sink is required to trigger the finish event with install/noop.
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
    });
};
