# pre-commit-tasks

`pre-commit-tasks` is a Visual Studio Code Extension that provides a [Task Provider](https://code.visualstudio.com/api/extension-guides/task-provider) for [pre-commit](https://pre-commit.com/) hooks without having to commit.  It parses the `.pre-commit-config.yaml` and registers a Test Task for each hook parsed.

## Features

Tasks can be run by clicking `Terminal > Run Task...` in the program menu.  All tasks will be found in the `pre-commit` task provider.  A user can either select a specific task or select `Run All` and all pre-commit hooks will be invoked.

Any time a user changes the `.pre-commit-config.yaml`, the task provider will dump its parsed cache and force a reparse the next time the user tries to select a task to run.

When the pre-commit task fails, it uses a [Problem Matcher](https://code.visualstudio.com/docs/editor/tasks#_defining-a-problem-matcher) defined in the [package.json](./package.json) to determine if it can parse the pre-commit error and add it to the `PROBLEMS` panel and highlight it in the IDE.  This makes it easier to spot where pre-commit linting errors are located.

## Requirements

`pre-commit-tasks` has a runtime dependency on the `yaml` NPM package for parsing of the `.pre-commit-config.yaml` file, but that will be handled for you on installation of the extension.

## Extension Settings

This extension contributes the following settings:

* `pre-commit-tasks.enable`: enable/disable this extension
* `pre-commit-tasks.debug`: set to `true` to have the Task Provider detection logic emit an Output pane explaining its decision-making


## Release Notes

### [0.2.1]
- Find repo root to make all linters available if user opens a subfolder, not only `Run All`.

### [0.2.0]

- Modify the pre-commit command to run on the currently focused file in the editor, regardless of what is staged in git. Lint the whole file, not only what changed since the last commit.
- Create a `Run All`` task even if there is no `.pre-commit-config.yaml` file in the workspace root, to make the linters available if the user opens a subfolder.
- Fix hooks being called by their name instead of ID, which sometimes didn't work.
- Fix `Run All` task being overwritten after one use, making it no longer work.

### [0.1.0]

- Initial release
