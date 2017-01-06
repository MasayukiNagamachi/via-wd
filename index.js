//
// Copyright (c) 2016 Masayuki Nagamachi <masayuki.nagamachi@gmail.com>
//
// This file is distributed under the MIT license.
// See LICENSE file in the project root for details.

'use strict';

const _ = require('lodash');
const moment = require('moment');
const path = require('path');
const url = require('url');
const webdriver = require('selenium-webdriver');

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

// FlowControl Pool

class FlowPool {
  constructor(concurrency) {
    this.concurrency_ = concurrency;
    this.flows_ = _.times(concurrency, () => new webdriver.promise.ControlFlow);
    this.roundRobinIndex_ = 0;
    this.logger_ = webdriver.logging.getLogger('wd-runjs.flow-pool');
    this.logger_.debug(`concurrency: ${concurrency}`);
  }

  getFlow() {
    this.logger_.debug(`round-robin index: ${this.roundRobinIndex_}`);
    const flow = this.flows_[this.roundRobinIndex_];
    this.roundRobinIndex_ = (this.roundRobinIndex_ + 1) % this.concurrency_;
    return flow;
  }
}

// ScriptRunner

class ScriptRunner {
  constructor(options) {
    this.options_ = options;
    this.aborted_ = false;
    this.promises_ = [];
    this.flowPool_ = new FlowPool(options.concurrency);
    this.logger_ = webdriver.logging.getLogger('wd-runjs.script-runner');
    this.logger_.debug(JSON.stringify(options));
  }

  run(script) {
    this.logger_.debug(`<<EOS\n${script}EOS`);
    const builder = new webdriver.Builder()
      .forBrowser(this.options_.browser)
      .usingServer(this.options_.server);
    const promises = _.map(this.options_.uris, (uri) => {
      let value = { uri: uri, browser: this.options_.browser };
      const driver = builder.setControlFlow(this.flowPool_.getFlow()).build();
      return driver
        .then(this.abortable_(() => {
          this.logger_.debug(`${uri}: start nativation...`);
          return this.navigate_(driver, uri);
        }))
        .then(this.abortable_(() => {
          this.logger_.debug(`${uri}: end navigation, then run the script...`);
          return driver.executeScript(script);
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

    return webdriver.promise.all(promises)
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
        return webdriver.promise.Promise.reject(
          webdriver.promise.CancellationError.wrap('aborted'));
      }
      return func.apply(this, args);
    });
  }

  navigate_(driver, uri) {
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
module.exports.FlowPool = FlowPool;
module.exports.ScriptRunner = ScriptRunner;
