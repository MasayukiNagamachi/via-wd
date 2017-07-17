// This file is distributed under the MIT license.
// See LICENSE file in the project root for details.

'use strict';

const webdriver = require('selenium-webdriver');
const logger = webdriver.logging.getLogger('wd-runjs.navigation');

// Example of a navigation script.
// This script searches 'webdriver' with Google.
module.exports.navigate = (driver) => {
  logger.debug('searching "webdriver" with Google...');
  driver.get('http://www.google.com/ncr');
  driver.wait(webdriver.until.elementLocated(webdriver.By.name('q')), 1000)
    .sendKeys('webdriver');
  driver.wait(webdriver.until.elementLocated(webdriver.By.name('btnG')), 1000)
    .click();
  driver.wait(webdriver.until.titleIs('webdriver - Google Search'), 1000);
};
