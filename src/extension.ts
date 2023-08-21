// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as strings from './strings';
import { PrecommitGitStageTaskProvider, PrecommitCurrentFileTaskProvider } from './precommitTaskProvider';
import { findGitRepoRoot } from './utils';

let precommitTaskProvider: vscode.Disposable | undefined;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(_context: vscode.ExtensionContext) {
	const gitRoot: string | undefined = findGitRepoRoot();
	if (!gitRoot) {
		const message: string = "Not inside a Git repo - pre-commit tasks won't be created.";
		vscode.window.showInformationMessage(message);
		console.log(message);
		return;
	}

	precommitTaskProvider = vscode.tasks.registerTaskProvider(strings.precommitGitStageTaskProviderType, new PrecommitGitStageTaskProvider(gitRoot));
	precommitTaskProvider = vscode.tasks.registerTaskProvider(strings.precommitCurrentFileTaskProviderType, new PrecommitCurrentFileTaskProvider(gitRoot));
}

// this method is called when your extension is deactivated
export function deactivate() { }
