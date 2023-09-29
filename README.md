# pre-commit-tasks

`pre-commit-tasks` is a Visual Studio Code Extension that provides a [Task Provider](https://code.visualstudio.com/api/extension-guides/task-provider) for [pre-commit](https://pre-commit.com/) hooks without having to commit.  It parses the `.pre-commit-config.yaml` and registers a Test Task for each hook parsed.

## Features

Tasks can be run by clicking `Terminal > Run Task...` in the program menu.  All tasks will be found in the `pre-commit (...)` task providers.  A user can either select a specific task or select `Run All` and all pre-commit hooks will be invoked.

Two task providers are created for each linter: 
- `pre-commit (on git stage)`, linting all changes staged in git (analogous to how it's run during commit)
- `pre-commit (on current file)` linting the file opened in the active editor (regardless of changes staged in git)

Any time a user changes the `.pre-commit-config.yaml`, the task provider will dump its parsed cache and force a reparse the next time the user tries to select a task to run.

When the pre-commit task fails, it uses a [Problem Matcher](https://code.visualstudio.com/docs/editor/tasks#_defining-a-problem-matcher) defined in the `package.json` to determine if it can parse the pre-commit error and add it to the `PROBLEMS` panel and highlight it in the IDE.  This makes it easier to spot where pre-commit linting errors are located.

## Requirements

`pre-commit-tasks` has a runtime dependency on the `yaml` NPM package for parsing of the `.pre-commit-config.yaml` file, but that will be handled for you on installation of the extension.

## Extension Settings

This extension contributes the following settings:

* `pre-commit-tasks.enable`: enable/disable this extension
* `pre-commit-tasks.debug`: set to `true` to have the Task Provider detection logic emit an Output pane explaining its decision-making

---

## VS Code Extension Testing Documentation

This section outlines the testing procedures and strategies implemented for the given VS Code extension. The primary goal of these tests is to ensure the integrity of the extension's functionality, especially regarding interactions with the VS Code API and external dependencies.

### Test requirements
To write unit tests the following libraries are used:
* [`@vscode/test-electron`](https://code.visualstudio.com/api/working-with-extensions/testing-extension): Library with tool set that provides a testing environment resembling the VS Code's Electron environment. Creates an Extension Development Host with the full access to the VS Code API (no need to add `vscode` as a dev dependency). Wraps mocha unit test to make them run
* [`mocha`](https://mochajs.org): JS/TS test framework that is used to run actual unit tests (see `./suite/index.ts` file). It has everything needed to implement unit tests
* [`sinon`](https://sinonjs.org): Library to create spies, stubs, and mocks to don't call VS Code API or methods that don't need to be executed during unit test
* [`chai`](https://www.chaijs.com): Library that is used  to assert test result

#### Docker
It's possible to run unit tests inside docker container. There is list of dependencies used for docker to make tests work:
* [`node:slim docker image`](https://github.com/nodejs/docker-node): The docker images with pre-installed nodejs, npm and yarn packages. Contains minimal installed packages needed to run nodejs application
* [`xvfb`](https://manpages.ubuntu.com/manpages/xenial/man1/xvfb-run.1.html): Display server implementing the X11 display server protocol. Emulates an X server, allowing Electron (which powers VS Code's UI) to run headlessly. We need to use `xvfb` inside docker container because it doesn't have real monitor to open VS Code window. This tool will fake one for the unit tests.

### Purpose

Type of tests are implemented for this repository are unit ones (not integration once) so we won't run and check real commands from VS Code API. However to even mock/stub VS Code API we have to have import the API and initialize it for further tests. It is extremely hard to do even for initialization step (to many mocks/stubs are needed) so it was decided to use `@vscode/test-electron` library that <u>spins up the VS Code window, workspace and inits API</u>. 

And it's possibly to run "usual" `mocha` tests inside this environment ([check VS Code Testing page](https://code.visualstudio.com/api/working-with-extensions/testing-extension#the-test-script), section 'Test script' and 'Test runner script').

### Usage

To run unit tests simple use
```bash
# if you didn't run npm install previously
npm install
# Runs tests
npm run test
```

If you want to run unit tests inside docker locally
```bash
docker build . -t npm-tests:latest && docker run --rm npm-tests:latest
```

* `docket build . -t npm-tests:latest` will create a docker images with *npm-tests:latest*. You should run `docker build` from the repo root (otherwise point to the `Dockerfile` by using `docker build -f <path-to-file> ...`).
* `docker run --rm npm-tests:latest` will run the tests in the container created from image from the previous step. `--rm` flag will remove container after tests are finished.

### Implement a new test suite

To create a new test suite firstly you need to create a test file for it:
```bash
'src/suite/<func-name>.test.ts'
```

After that you need to implement some unit tests:
```ts
import * as sinon from 'sinon';
import * as utilsOriginal from 'newModule';
import { expect } from 'chai';


suite('test new function', () => {
    setup(() => {
        // will be ran before each unit test
    })

    teardown(() => {
        // will be ran after each unit test
    })

    test('test the function is ok', () => {
        // some stubs
        const newStub = sinon.stub(utilsOriginal, 'newFunction').returns('smth');
        // some action logic
        const result = utilsOriginal.someAction();
        // some assertion
        expect(result).to.be.true;
        expect(newStub.callCount).to.be.equal(1);
    })
})
```

See [Sinon](https://sinonjs.org), [Chai](https://www.chaijs.com) and [Mocha](https://mochajs.org) references to check methods can be used to write, run and assert unit tests.

After you added them you can simply run tests by `npm run test` or use VS Code Debugger (configuration is already done in `launch.json` file).


## Release Notes

### [0.2.0]

- Add a second type of pre-commit task to run on the currently focused file in the editor, regardless of what is staged in git.
- Make all linters available even if user opens a subfolder.
- Fix hooks being called by their name instead of ID, which sometimes didn't work.
- Fix `Run All` task being overwritten after one use, making it no longer work.

### [0.1.0]

- Initial release
