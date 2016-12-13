//
// Copyright (c) 2016 Masayuki Nagamachi <masayuki.nagamachi@gmail.com>
//
// This file is distributed under the MIT license.
// See LICENSE file in the project root for details.

'use strict';

const _ = require('lodash');
const webdriver = require('selenium-webdriver');

class FlowPool {
  constructor(concurrency) {
    this.concurrency_ = concurrency;
    this.flows_ = _.times(concurrency, () => new webdriver.promise.ControlFlow);
    this.roundRobinIndex_ = 0;
  }

  getFlow() {
    const flow = this.flows_[this.roundRobinIndex_];
    this.roundRobinIndex_ = (this.roundRobinIndex_ + 1) % this.concurrency_;
    return flow;
  }
}

class ScriptRunner {
  constructor(options) {
    this.options_ = options;
    this.flowPool_ = new FlowPool(options.concurrency);
  }

  run(script) {
    const builder = new webdriver.Builder()
      .forBrowser(this.options_.browser)
      .usingServer(this.options_.server);
    const promises = _.map(this.options_.uris, (uri) => {
      let value = { uri: uri, browser: this.options_.browser };
      const driver = builder.setControlFlow(this.flowPool_.getFlow()).build();
      return driver.get(uri)
        .then(() => driver.executeScript(script))
        .then((result) => value.result = result)
        .catch((error) => value.error = error)
        .then(() => driver.quit())
        .then(() => value);
    });

    return webdriver.promise.all(promises);
  }
}

module.exports.FlowPool = FlowPool;
module.exports.ScriptRunner = ScriptRunner;
