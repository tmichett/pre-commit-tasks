import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'yaml';

export class PrecommitTaskProvider implements vscode.TaskProvider {
	private configPromise: Thenable<vscode.Task[]> | undefined = undefined;

	constructor(workspaceRoot: string) {
		const pattern = path.join(workspaceRoot, ".pre-commit-config.yaml");
		const fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
		fileWatcher.onDidChange(() => this.configPromise = undefined);
		fileWatcher.onDidCreate(() => this.configPromise = undefined);
		fileWatcher.onDidDelete(() => this.configPromise = undefined);
	}

	public provideTasks(token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task[]> | undefined {
		if (!this.configPromise) {
			this.configPromise = getPrecommitTasks();
		}

		return this.configPromise;
	}

	public resolveTask(_task: vscode.Task, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task> | undefined {
		const task = _task.definition.task;
		if (task) {
			const definition: PrecommitTaskDefinition = <any>_task.definition;
			return new vscode.Task(definition, _task.scope ?? vscode.TaskScope.Workspace, definition.task, "pre-commit", new vscode.ShellExecution(`pre-commit ${definition.task}`));
		}
	}
}

function pathExists(path: string): Promise<boolean> {
	return new Promise<boolean>((resolve, _reject) => fs.exists(path, (value) => resolve(value)));
}


let _channel: vscode.OutputChannel;
function getOutputChannel(): vscode.OutputChannel {
	if (!_channel) {
		_channel = vscode.window.createOutputChannel("Pre-commit Hook Detection");
	}

	return _channel;
}

interface PrecommitTaskDefinition extends vscode.TaskDefinition {
	task: string;
	file?: string;
}

async function getPrecommitTasks(): Promise<vscode.Task[]> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const result: vscode.Task[] = [];


	if (!workspaceFolders || workspaceFolders.length === 0) {
		return result;
	}

	const channel = getOutputChannel();
	for (const workspaceFolder of workspaceFolders) {
		const folderString = workspaceFolder.uri.fsPath;
		if (!folderString) {
			continue;
		}

		const configFile = path.join(folderString, ".pre-commit-config.yaml");
		if (!await pathExists(configFile)) {
			continue;
		}

		const commitConfig = yaml.parse(fs.readFileSync(configFile, "utf8"));
		channel.appendLine(`Config parsed. repo count: ${commitConfig.repos.length}`);
		commitConfig.repos.map((repo: any) => {
			channel.appendLine(`Repo ${repo.repo} found. hook count: ${repo.hooks.length}`);
			repo.hooks.map((hook: any) => {
				const taskName = hook.name || hook.id;
				channel.appendLine(`Hook ${taskName} found. Adding...`);
				const kind: PrecommitTaskDefinition = {
					type: "pre-commit",
					task: taskName,
				};
				const task = new vscode.Task(kind, workspaceFolder, taskName, "pre-commit", new vscode.ShellExecution(`pre-commit run ${taskName}`));
				task.group = vscode.TaskGroup.Test;
				result.push(task);
			});
		});

		if (result.length > 0) {
			const taskName = "Run All";
			const kind: PrecommitTaskDefinition = {
				type: "pre-commit",
				task: taskName,
			};
			const allTask = new vscode.Task(kind, workspaceFolder, taskName, "pre-commit", new vscode.ShellExecution("pre-commit run"));
			allTask.group = vscode.TaskGroup.Test;
			result.push(allTask);
		}
	}

	channel.show(true);
	return result;
}
