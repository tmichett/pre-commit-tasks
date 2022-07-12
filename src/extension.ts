// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { PrecommitTaskProvider } from './precommitTaskProvider';

let precommitTaskProvider: vscode.Disposable | undefined;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(_context: vscode.ExtensionContext) {
	const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
	if (!workspaceRoot) {
		vscode.window.showInformationMessage('OFUCK');
		console.log("OFUCK");
		return;
	}

	precommitTaskProvider = vscode.tasks.registerTaskProvider("pre-commit", new PrecommitTaskProvider(workspaceRoot));
}

// this method is called when your extension is deactivated
export function deactivate() { }
