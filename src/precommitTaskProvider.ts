import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'yaml';
import * as strings from './strings';
import { findGitRepoRoot } from './utils';

abstract class PrecommitTaskProvider implements vscode.TaskProvider {
	protected configPromise: Thenable<vscode.Task[]> | undefined = undefined;
	protected abstract type: string;

	constructor(workspaceRoot: string) {
		const pattern = path.join(workspaceRoot, ".pre-commit-config.yaml");
		const fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
		fileWatcher.onDidChange(() => this.configPromise = undefined);
		fileWatcher.onDidCreate(() => this.configPromise = undefined);
		fileWatcher.onDidDelete(() => this.configPromise = undefined);
	}

	public provideTasks(token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task[]> | undefined {
		if (!this.configPromise) {
			this.configPromise = this.getPrecommitTasks();
		}

		return this.configPromise;
	}

	public resolveTask(_task: vscode.Task, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task> | undefined {
		const task = _task.definition.task;
		if (task) {
			const definition: PrecommitTaskDefinition = <any>_task.definition;
			const problemMatchers = task.problemMatchers as any;
			
			if (task.definition.task !== "Run All") {  // exclude `Run All` because it got overwritten to use an incorrect command and stopped working after one use
				return new vscode.Task(
					definition,
					_task.scope ?? vscode.TaskScope.Workspace,
					definition.task,
					definition.type,
					new vscode.ShellExecution(`pre-commit run ${definition.task} --files ${vscode.window.activeTextEditor?.document.fileName}`),
					problemMatchers
				);
			}
		}
	}

	protected createTask(taskName: string, command: string, workspaceFolder: vscode.WorkspaceFolder): vscode.Task {
		const kind: PrecommitTaskDefinition = {
			type: this.type,
			task: taskName,
		};
		const task = new vscode.Task(
			kind,
			workspaceFolder,
			taskName,
			this.type,
			new vscode.ShellExecution(command),
			"$pcmatcher"
		);
		task.group = vscode.TaskGroup.Test;
		return task;
	}

	protected abstract createHookTask(taskName: string, workspaceFolder: vscode.WorkspaceFolder): vscode.Task;

	protected abstract createRunAllTask(workspaceFolder: vscode.WorkspaceFolder): vscode.Task;

	private async getPrecommitTasks(): Promise<vscode.Task[]> {
		const result: vscode.Task[] = [];
	
		const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders || workspaceFolders.length === 0) {
			return result;
		}
	
		const gitRoot: string | undefined = findGitRepoRoot();
		let gitRootConfigFile: string | undefined;
		if (gitRoot) {
			gitRootConfigFile = path.join(gitRoot, ".pre-commit-config.yaml");
			gitRootConfigFile = (await pathExists(gitRootConfigFile)) ? gitRootConfigFile : undefined;
		}
	
		// had to do this weird 1 element loop to avoid `No overload matches this call.` error
		for (const workspaceFolder of workspaceFolders.slice(0, 1)) {
			const allTask = this.createRunAllTask(workspaceFolder);
			result.push(allTask);
		}
	
		const workspaceRoot = vscode.workspace.workspaceFolders?.[0];
	
		let previousTaskNames: string[] = [];
		const channel = getOutputChannel();
		for (const workspaceFolder of workspaceFolders) {
			let folderString = workspaceFolder.uri.fsPath;
			if (!folderString) {
				continue;
			}
	
			let configFile = path.join(folderString, ".pre-commit-config.yaml");
			if (!await pathExists(configFile)) {
				if ((workspaceFolder === workspaceRoot) && gitRootConfigFile) {
					configFile = gitRootConfigFile;
				}
				else {
					continue;
				}
			}
	
			const commitConfig = yaml.parse(fs.readFileSync(configFile, "utf8"));
			channel.appendLine(`Config parsed. repo count: ${commitConfig.repos.length}`);
			commitConfig.repos.map((repo: any) => {
				channel.appendLine(`Repo ${repo.repo} found. hook count: ${repo.hooks.length}`);
				repo.hooks.map((hook: any) => {
					const taskName = hook.id;
					if (!previousTaskNames.includes(taskName)) {
						channel.appendLine(`Hook ${taskName} found. Adding...`);
						const task = this.createHookTask(taskName, workspaceFolder);
						result.push(task);
					}
					previousTaskNames.push(hook.id);
				});
			});
		}
	
		channel.show(true);
		return result;
	}
}

export class PrecommitGitStageTaskProvider extends PrecommitTaskProvider {
	type = strings.precommitGitStageTaskProviderType;

	protected createHookTask(taskName: string, workspaceFolder: vscode.WorkspaceFolder): vscode.Task {
		const command = `pre-commit run ${taskName}`;
		const task = this.createTask(taskName, command, workspaceFolder);
		return task;
	}

	protected createRunAllTask(workspaceFolder: vscode.WorkspaceFolder): vscode.Task {
		const taskName = "Run All";
		const command = "pre-commit run";
		const task = this.createTask(taskName, command, workspaceFolder);
		return task;
	}
}

export class PrecommitCurrentFileTaskProvider extends PrecommitTaskProvider {
	type = strings.precommitCurrentFileTaskProviderType;

	protected createHookTask(taskName: string, workspaceFolder: vscode.WorkspaceFolder): vscode.Task {		
		const command = `pre-commit run ${taskName} --files ${vscode.window.activeTextEditor?.document.fileName}`;
		const task = this.createTask(taskName, command, workspaceFolder);
		return task;
	}

	protected createRunAllTask(workspaceFolder: vscode.WorkspaceFolder): vscode.Task {
		const taskName = "Run All";
		const command = `pre-commit run --files ${vscode.window.activeTextEditor?.document.fileName}`;
		const task = this.createTask(taskName, command, workspaceFolder);
		return task;
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