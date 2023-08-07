# Change Log

## [0.2.0]

- Modify the pre-commit command to run on the currently focused file in the editor, regardless of what is staged in git. Lint the whole file, not only what changed since the last commit.
- Create a 'Run All' task even if there is no `.pre-commit-config.yaml` file in the workspace root, to make the linters available if the user opens a subfolder.
- Fix hooks being called by their name instead of ID, which sometimes didn't work.
- Fix `Run All` task being overwritten after one use, making it no longer work.

## [0.1.0]

- Initial release