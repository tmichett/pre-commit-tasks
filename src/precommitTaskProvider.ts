import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as yaml from 'yaml';
import { findGitRepoRoot } from './utils';

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
			const problemMatchers = task.problemMatchers as any;
			
			if (task.definition.task !== "Run All") {  // exclude `Run All` because it got overwritten to use an incorrect command and stopped working after one use
				return new vscode.Task(
					definition,
					_task.scope ?? vscode.TaskScope.Workspace,
					definition.task,
					"pre-commit",
					new vscode.ShellExecution(`pre-commit run ${definition.task} --files ${vscode.window.activeTextEditor?.document.fileName}`),
					"$pcmatcher"
				);
			}
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
		const taskName = "Run All";
		const kind: PrecommitTaskDefinition = {
			type: "pre-commit",
			task: taskName,
		};
		const allTask = new vscode.Task(kind, workspaceFolder, taskName, "pre-commit", new vscode.ShellExecution(`pre-commit run --files ${vscode.window.activeTextEditor?.document.fileName}`));
		allTask.group = vscode.TaskGroup.Test;
		result.push(allTask);
	}

	const workspaceRoot = vscode.workspace.workspaceFolders?.[0];

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
				// If we have multiple hooks with the same ID (e.g. yamllint), we need to execute them all at once, because calling them by their names does not work, we can only run by ID.
				// However, those that are not relevant to the file we are linting, will be skipped anyway because of include/exclude patterns defined  in `.pre-commit-config.yaml`.
				const taskName = hook.id;
				let previousTaskNames: string[] = [];
				for (let task of result) {
					previousTaskNames.push(task.definition.task);
				}
				if (!previousTaskNames.includes(taskName)) {
					channel.appendLine(`Hook ${taskName} found. Adding...`);
					const kind: PrecommitTaskDefinition = {
						type: "pre-commit",
						task: taskName,
					};
					const task = new vscode.Task(
						kind,
						workspaceFolder,
						taskName,
						"pre-commit",
						new vscode.ShellExecution(`pre-commit run ${taskName} --files ${vscode.window.activeTextEditor?.document.fileName}`),
						"$pcmatcher"
					);
					task.group = vscode.TaskGroup.Test;
					result.push(task);
				}
			});
		});
	}

	channel.show(true);
	return result;
}