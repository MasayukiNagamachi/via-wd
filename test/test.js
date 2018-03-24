// This file is distributed under the MIT license.
// See LICENSE file in the project root for details.

'use strict';

const chai = require('chai');
const moment = require('moment');
const path = require('path');
const sinon = require('sinon');
const util = require('util');
const webdriver = require('selenium-webdriver');

const expect = chai.expect;
chai.use(require('sinon-chai'));

describe('logging', () => {
  const logging = require('..').logging;

  describe('setFilters', () => {
    let logger = null;

    beforeEach(() => {
      logger = sinon.createStubInstance(webdriver.logging.Logger);
      sinon.stub(webdriver.logging, 'getLogger').callsFake((name) => {
        return logger;
      });
    });

    afterEach(() => {
      webdriver.logging.getLogger.restore();
    });

    context('when level is a non-empty string', () => {
      it('should call Logger.setLevel with a specified level', () => {
        logging.setFilters([{ logger: 'test', level: 'DEBUG' }]);
        expect(logger.setLevel).to.have.been.calledOnce;
        expect(logger.setLevel)
          .to.have.been.calledWith(webdriver.logging.Level.DEBUG);
      });
    });

    context('when level is an empty string', () => {
      it('should call Logger.setLevel with null', () => {
        logging.setFilters([{ logger: 'test', level: '' }]);
        expect(logger.setLevel).to.have.been.calledOnce;
        expect(logger.setLevel).to.have.been.calledWith(null);
      });
    });
  });

  describe('enable/disable', () => {
    let clock = null;
    let sink = null;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
      sink = sinon.spy();
      logging.setSink(sink);
      logging.setFilters([{ logger: 'test', level: 'DEBUG' }]);
    });

    afterEach(() => {
      logging.setFilters([{ logger: 'test', level: '' }]);
      logging.setSink(null);
      sink = null;
      clock.restore();
      clock = null;
    });

    it('should call a log sink function for logging', () => {
      const logger = webdriver.logging.getLogger('test');
      logger.debug('debug1');
      logger.fine('fine1');
      logging.enable();
      logger.debug('debug2');
      logger.fine('fine2');
      logging.disable();
      expect(sink).to.have.been.calledOnce;
      expect(sink).to.have.been.calledWith(util.format(
        '[%s][%s] [test] debug2',
        moment(0).format(), webdriver.logging.Level.DEBUG));
    });
  });
});

describe('ScriptRunner', () => {
  const ScriptRunner = require('..').ScriptRunner;

  let timeoutsStub, optionsStub, driverStub, capsStub, builderStub;

  beforeEach(() => {
    optionsStub = {};
    optionsStub.setTimeouts = sinon.stub();

    driverStub = Promise.resolve();
    driverStub.get = sinon.stub();
    driverStub.getTitle = sinon.stub().returns(Promise.resolve('title'));
    driverStub.executeScript = sinon.stub();
    driverStub.executeAsyncScript = sinon.stub();
    driverStub.manage = sinon.stub().returns(optionsStub);
    driverStub.quit = sinon.stub();

    capsStub = new webdriver.Capabilities;

    builderStub = sinon.createStubInstance(webdriver.Builder);
    builderStub.forBrowser.returns(builderStub);
    builderStub.usingServer.returns(builderStub);
    builderStub.getCapabilities.returns(capsStub);
    builderStub.build.returns(driverStub);

    sinon.stub(webdriver, 'Builder').returns(builderStub);
  });

  afterEach(() => {
    webdriver.Builder.restore();
    builderStub = null;
    capsStub = null;
    driverStub = null;
    optionsStub = null;
    timeoutsStub = null;
  });

  describe('#run', () => {
    context('when multiple targets are specified', () => {
      const options = {
        async: false,
        browser: 'browser',
        browserOptioins: {},
        scriptArgs: [],
        scriptTimeout: 10,
        server: 'server'
      };

      const targets = ['uri:uri1', 'uri:uri2', 'uri:uri3', 'uri:uri4'];

      beforeEach(() => {
        driverStub.executeScript.returns(Promise.resolve(1));
      });

      it('should get results as many as targets', async () => {
        const results = await new ScriptRunner(options).run('script', targets);
        expect(results).to.have.lengthOf(targets.length);
      });
    });

    context('when driver.executeScript() returns a result', () => {
      const options = {
        async: false,
        browser: 'browser',
        browserOptioins: {},
        scriptArgs: [],
        scriptTimeout: 10,
        server: 'server'
      };

      const targets = ['uri:uri'];

      beforeEach(() => {
        driverStub.executeScript.returns(Promise.resolve(1));
      });

      it('should call driver.quit()', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.quit).to.have.been.calledOnce;
      });

      it('should set the title and the result', async () => {
        const results = await new ScriptRunner(options).run('script', targets);
        expect(results[0].title).to.exist;
        expect(results[0].result).to.exist;
        expect(results[0].error).to.not.exist;
      });
    });

    context('when driver.executeScript() throws an error', () => {
      const options = {
        async: false,
        browser: 'browser',
        browserOptioins: {},
        scriptArgs: [],
        scriptTimeout: 10,
        server: 'server'
      };

      const targets = ['uri:uri'];

      beforeEach(() => {
        driverStub.executeScript.throws(new Error);
      });

      it('should call driver.quit()', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.quit).to.have.been.calledOnce;
      });

      it('should set the error', async () => {
        const results = await new ScriptRunner(options).run('script', targets);
        expect(results[0].result).to.not.exist;
        expect(results[0].error).to.exist;
      });
    });

    context('when driver.get() throws an error', () => {
      const options = {
        async: false,
        browser: 'browser',
        browserOptioins: {},
        scriptArgs: [],
        scriptTimeout: 10,
        server: 'server'
      };

      const targets = ['uri:uri'];

      beforeEach(() => {
        driverStub.get.throws(new Error);
      });

      it('should call driver.quit()', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.quit).to.have.been.calledOnce;
      });

      it('should not call driver.executeScript()', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.executeScript).to.have.not.been.called;
      });

      it('should set the error', async () => {
        const results = await new ScriptRunner(options).run('script', targets);
        expect(results[0].result).to.not.exist;
        expect(results[0].error).to.exist;
      });
    });

    context('when a navigation script is used', () => {
      const options = {
        async: false,
        browser: 'browser',
        browserOptioins: {},
        scriptArgs: [],
        scriptTimeout: 10,
        server: 'server'
      };

      const targets = [path.join(__dirname, 'navigation.js')];

      it('should not call driver.get()', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.get).to.have.not.been.called;
      });

      it('should call driver.executeScript()', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.executeScript).to.have.been.calledOnce;
      });

      it('should call driver.quit()', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.quit).to.have.been.calledOnce;
      });
    });

    context('when a window index is specified', () => {
      const options = {
        async: false,
        browser: 'browser',
        browserOptioins: {},
        scriptArgs: [],
        scriptTimeout: 10,
        server: false
      };

      const targets = ['@current'];

      it('should not call driver.get()', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.get).to.have.not.been.called;
      });

      it('should call driver.executeScript()', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.executeScript).to.have.been.calledOnce;
      });

      it('should call driver.quit()', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.quit).to.have.been.calledOnce;
      });
    });

    context('when an unsupported window index is specified', () => {
      const options = {
        async: false,
        browser: 'browser',
        browserOptioins: {},
        scriptArgs: [],
        scriptTimeout: 10,
        server: false
      };

      const targets = ['@unsupported'];

      it('should not call driver.executeScript()', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.executeScript).to.have.not.been.calledOnce;
      });

      it('should call driver.quit()', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.quit).to.have.been.calledOnce;
      });

      it('should set the error', async () => {
        const results = await new ScriptRunner(options).run('script', targets);
        expect(results[0].result).to.not.exist;
        expect(results[0].error).to.exist;
      });
    });

    context('when the ChromeDriver is used with Chrome-specific options', () => {
      const options = {
        async: false,
        browser: 'chrome',
        browserOptioins: {key: 'value'},
        scriptArgs: [],
        scriptTimeout: 10,
        server: false
      };

      const targets = ['@current'];

      it('should set chromeOptions', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(capsStub.has('chromeOptions')).to.be.true;
        expect(capsStub.get('chromeOptions')).to.eql(options.browserOptions);
      });

      it('should call driver.quit()', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.quit).to.have.been.calledOnce;
      });
    });

    context('when the async option is specifed', () => {
      const options = {
        async: true,
        browser: 'browser',
        browserOptioins: {},
        scriptArgs: [],
        scriptTimeout: 10,
        server: 'server'
      };

      const targets = ['uri:uri'];

      beforeEach(() => {
        driverStub.executeAsyncScript.returns(Promise.resolve(1));
      });

      it('should call setTimeouts', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(optionsStub.setTimeouts).to.have.been.calledOnce;
        expect(optionsStub.setTimeouts).to.have.been.calledWith({
          script: options.scriptTimeout * 1000
        });
      });

      it('should call executeAsyncScript', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.executeAsyncScript).to.have.been.calledOnce;
      });
    });

    context('when scrint arguments are specifed', () => {
      const options = {
        async: false,
        browser: 'browser',
        browserOptioins: {},
        scriptArgs: [1, 2],
        scriptTimeout: 10,
        server: 'server'
      };

      const targets = ['uri:uri'];

      beforeEach(() => {
        driverStub.executeAsyncScript.returns(Promise.resolve(1));
      });

      it('should call setScriptTimeout with the script arguments', async () => {
        await new ScriptRunner(options).run('script', targets);
        expect(driverStub.executeScript).to.have.been.calledOnce;
        expect(driverStub.executeScript).to.have.been.calledWith(
          'const ARGS = arguments;\nscript', ...options.scriptArgs);
      });
    });
  });

  describe('#abort', () => {
    const options = {
      async: false,
      browser: 'browser',
      browserOptioins: {},
      scriptArgs: [],
      scriptTimeout: 10,
      server: 'server'
    };

    const targets = ['uri:uri1', 'uri:uri2'];

    context('when it is called before running script', () => {
      it('should abort the all promises', async () => {
        const runner = new ScriptRunner(options);
        const promise = runner.run('script', targets);
        runner.abort();
        const results = await promise;
        results.forEach((result) => {
          expect(result).to.not.have.property('result');
          expect(result).to.have.property('error');
        });
      });
    });

    context('when it is called after running script', () => {
      it('should abort the remaining promises', async () => {
        const runner = new ScriptRunner(options);
        driverStub.executeScript = () => runner.abort();
        const results = await runner.run('script', targets);
        expect(results[0]).to.have.property('result');
        expect(results[0]).to.not.have.property('error');
        expect(results[1]).to.not.have.property('result');
        expect(results[1]).to.have.property('error');
      });
    });
  });
});
