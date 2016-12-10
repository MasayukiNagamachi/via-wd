//
// Copyright (c) 2016 Masayuki Nagamachi <masayuki.nagamachi@gmail.com>
//
// This file is distributed under the MIT license.
// See LICENSE file in the project root for details.

'use strict';

const _ = require('lodash');
const webdriver = require('selenium-webdriver');

class Executor {
  constructor(options) {
    this.options = options;
  }

  exec(script) {
    const builder = new webdriver.Builder()
      .forBrowser(this.options.browser)
      .usingServer(this.options.server);

    const promises = _.map(this.options.uris, (uri) => {
      let value = { uri: uri, browser: this.options.browser };
      const driver = builder.build();
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

module.exports = (options) => new Executor(options);
