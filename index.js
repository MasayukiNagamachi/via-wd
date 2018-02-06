// This file is distributed under the MIT license.
// See LICENSE file in the project root for details.

'use strict';

const _ = require('lodash');
const moment = require('moment');
const path = require('path');
const url = require('url');
const webdriver = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// Logging

let gLogSink_ = () => {};

function logHandler_(entry) {
  const timestamp = moment(entry.timestamp).format();  // ISO-8601 local time
  const level = entry.level.name;
  const message = entry.message;
  gLogSink_(`[${timestamp}][${level}] ${message}`);
}

function setLogSink(sink) {
  if (_.isFunction(sink)) {
    gLogSink_ = sink;
  } else {
    gLogSink_ = () => {};
  }
}

function setLogFilters(filters) {
  _.each(filters, (filter) => {
    const level = _.isEmpty(filter.level) ? null :
      webdriver.logging.getLevel(filter.level);
    webdriver.logging.getLogger(filter.logger).setLevel(level);
  });
}

function enableLogging() {
  webdriver.logging.getLogger().addHandler(logHandler_);
}

function disableLogging() {
  webdriver.logging.getLogger().removeHandler(logHandler_);
}

// ScriptRunner

class ScriptRunner {
  constructor(options) {
    this.options_ = options;
    this.aborted_ = false;
    this.promises_ = [];
    this.logger_ = webdriver.logging.getLogger('wd-runjs.script-runner');
    this.logger_.debug(JSON.stringify(options));
  }

  run(code) {
    const STARTUP = [
      'const ARGS = arguments;'
    ];

    this.logger_.debug(`<<EOS\n${code}EOS`);
    const builder = new webdriver.Builder()
      .forBrowser(this.options_.browser);
    if (this.options_.server) {
      builder.usingServer(this.options_.server);
    }
    this.setBrowserOptions_(builder);
    const promises = _.map(this.options_.uris, (uri) => {
      let value = { uri: uri, browser: this.options_.browser };
      const driver = builder.build();
      return driver
        .then(() => {
          if (this.options_.async) {
            return driver.manage().setTimeouts({
              script: this.options_.scriptTimeout * 1000
            });
          }
          return Promise.resolve();
        })
        .then(this.abortable_(() => {
          this.logger_.debug(`${uri}: start nativation...`);
          return this.navigate_(driver, uri);
        }))
        .then(this.abortable_(() => {
          this.logger_.debug(`${uri}: get the title...`);
          return driver.getTitle();
        }))
        .then(this.abortable_((title) => {
          value.title = title;
          const script = _(STARTUP).concat(code).join('\n');
          if (this.options_.async) {
            this.logger_.debug(`${uri}: run the script asynchronously...`);
            return driver.executeAsyncScript(
              script, ...this.options_.scriptArgs);
          } else {
            this.logger_.debug(`${uri}: run the script synchronously...`);
            return driver.executeScript(script, ...this.options_.scriptArgs);
          }
        }))
        .then((result) => {
          this.logger_.debug(`${uri}: done`);
          value.result = result;
        })
        .catch((error) => {
          this.logger_.debug(`${uri}: failed`);
          value.error = error.message;
        })
        .then(() => {
          this.logger_.debug(`${uri}: quit`);
          return driver.quit();
        })
        .catch(() => {})  // ignore errors occurred in quit()
        .then(() => value);
    });

    this.promises_ = _.concat(this.promises_, promises);

    return Promise.all(promises)
      .then((results) => {  // always reach here even if errors occurred
        // promises in the parent lexical scope are resolved.
        // Remove them from `this.promises_`.
        this.promises_ = _.difference(this.promises_, promises);
        return results;
      });
  }

  abort() {
    this.logger_.debug('abort');
    // The below code doesn't work as expected, espetially when the number of
    // concurrency is larger than 1.
    //
    //   _.each(this.promises_, (promise) => promise.cancel('aborted'));
    //
    // Browser instances sometimes will not be closed even when quit() is called
    // on all drivers.
    //
    // For avoiding the above situation, ScriptRunner checks `aborted_` flag
    // before calling WebDriver's methods.
    this.aborted_ = true;
  }

  abortable_(func) {
    return _.rest((args) => {
      if (this.aborted_) {
        return Promise.reject(Error.wrap('aborted'));
      }
      return func.apply(this, args);
    });
  }

  setBrowserOptions_(builder) {
    // TODO: Support other browsers
    const caps = builder.getCapabilities();
    switch (this.options_.browser) {
    case 'chrome':
      caps.set('chromeOptions', this.options_.browserOptions);
      break;
    }
  }

  navigate_(driver, uri) {
    if (_.startsWith(uri, '@')) {
      const tab = _.trimStart(uri, '@');
      if (tab === 'current') {
        this.logger_.debug(`${uri}: use the current tab/window`);
        return driver;  // noop
      }
      throw new Error(`Unsupported window index: ${uri}`);
    }
    const parsedUri = url.parse(uri);
    if (_.isEmpty(parsedUri.protocol)) {
      const navigation = require(path.resolve(uri));
      return navigation.navigate(driver);
    } else {
      return driver.get(uri);
    }
  }
}

module.exports.logging = {
  setSink: setLogSink,
  setFilters: setLogFilters,
  enable: enableLogging,
  disable: disableLogging
};
module.exports.ScriptRunner = ScriptRunner;
