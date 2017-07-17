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
  driver.findElement(webdriver.By.name('q')).sendKeys('webdriver');
  driver.findElement(webdriver.By.name('btnG')).click();
  driver.wait(webdriver.until.titleIs('webdriver - Google Search'), 1000);
};
