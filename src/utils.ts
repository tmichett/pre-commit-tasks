import * as vscode from 'vscode';
import { execSync } from 'child_process';

export function findGitRepoRoot(): string| undefined {
	const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
	if (workspaceRoot) {
		try {
			const gitRoot: string = execSync('git rev-parse --show-toplevel', { cwd: workspaceRoot, encoding: 'utf-8' }).trim();
			return gitRoot;
		} catch (error) {
			console.error('Error finding Git repository root:', error);
		}
	}
}