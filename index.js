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
    this.logger_ = webdriver.logging.getLogger('wd-runjs.script-runner');
    this.logger_.debug(JSON.stringify(options));
  }

  async run(code, targets) {
    this.logger_.debug(`<<EOS\n${code}EOS`);
    const builder = new webdriver.Builder()
      .forBrowser(this.options_.browser);
    if (this.options_.server) {
      builder.usingServer(this.options_.server);
    }
    this.setBrowserOptions_(builder);
    return await Promise.all(targets.map(async (uri) => {
      let value = { uri: uri, browser: this.options_.browser };
      const driver = builder.build();
      try {
        await this.prepare_(driver);
        await this.navigate_(driver, uri);
        value.title = await this.getTitle_(driver, uri);
        value.result = await this.executeScript_(driver, uri, code);
        this.logger_.debug(`${uri}: done`);
      } catch (error) {
        this.logger_.debug(`${uri}: failed`);
        value.error = error.message;
      }
      try {
        this.logger_.debug(`${uri}: quit`);
        await driver.quit();
      } catch (e) {
        // ignore errors occurred in quit()
      }

      return value;
    }));
  }

  abort() {
    this.logger_.debug('abort');
    this.aborted_ = true;
  }

  checkAborted_() {
    if (this.aborted_) {
      throw new Error('Aborted');
    }
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

  async prepare_(driver) {
    if (this.options_.async) {
      await driver.manage().setTimeouts({
        script: this.options_.scriptTimeout * 1000
      });
    }
  }

  async navigate_(driver, uri) {
    this.checkAborted_();
    this.logger_.debug(`${uri}: start navigation...`);
    if (_.startsWith(uri, '@')) {
      const tab = _.trimStart(uri, '@');
      if (tab === 'current') {
        this.logger_.debug(`${uri}: use the current tab/window`);
        return;  // noop
      }
      throw new Error(`Unsupported window index: ${uri}`);
    }
    const parsedUri = url.parse(uri);
    if (_.isEmpty(parsedUri.protocol)) {
      const navigation = require(path.resolve(uri));
      await navigation.navigate(driver);
    } else {
      await driver.get(uri);
    }
  }

  async getTitle_(driver, uri) {
    this.checkAborted_();
    this.logger_.debug(`${uri}: get the title...`);
    return await driver.getTitle();
  }

  async executeScript_(driver, uri, code) {
    this.checkAborted_();
    const script = [
      'const ARGS = arguments;'
    ].concat(code).join('\n');
    if (this.options_.async) {
      this.logger_.debug(`${uri}: run the script asynchronously...`);
      return await driver.executeAsyncScript(
        script, ...this.options_.scriptArgs);
    } else {
      this.logger_.debug(`${uri}: run the script synchronously...`);
      return await driver.executeScript(
        script, ...this.options_.scriptArgs);
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
