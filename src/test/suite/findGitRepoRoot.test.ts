import { expect } from 'chai';
import * as child_process from 'child_process';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { findGitRepoRoot } from '../../utils';

const pathToRepoMock = '/path/to/repo';

suite('test findGitRepoRoot function', () => {
	let sandbox: sinon.SinonSandbox;

	setup(() => {
		sandbox = sinon.createSandbox();
	});

	teardown(() => {
		sandbox.restore();
	});

	test('should return undefined if workspace is undefined ', () => {
		// assemble
		const workspaceFoldersStub = sandbox.stub(vscode.workspace, 'workspaceFolders').value(undefined);

		// act 
		const result = findGitRepoRoot();

		// assert
		expect(result).to.be.undefined;
		expect(workspaceFoldersStub.calledOnce);
	});


	test('should return undefined if workspace returns empty list', () => {
		// assemble
		let hasLengthChecked = false;
		const fakeWorkspaceFolders = {
			get length() {
				hasLengthChecked = true;
				return 0;
			}
		};

		sandbox.stub(vscode.workspace, 'workspaceFolders').value(fakeWorkspaceFolders);

		// act 
		const result = findGitRepoRoot();

		// assert
		expect(result).to.be.undefined;
		expect(hasLengthChecked).to.be.true;
	});

	test('should return git root if workspaceFolder is found', () => {
		// assemble
		let hasFsPathCalled = false;
		const execSyncStub = sandbox.stub(child_process, 'execSync').returns(pathToRepoMock);

		sandbox.stub(vscode.workspace, 'workspaceFolders').value([
			{
				uri: {
					get fsPath() {
						hasFsPathCalled = true;
						return pathToRepoMock;
					}
				}
			}
		]);

		// act 
		const result = findGitRepoRoot();

		// assert
		expect(result).to.equal(pathToRepoMock);
		expect(hasFsPathCalled).to.be.true;
		expect(execSyncStub.callCount).to.be.equals(1);
	});

	test('should return undefined and log an error if not a valid git repo', () => {
		// assemble
		let hasFsPathCalled = false;
		const testError = new Error('Some raised error');
		const execSyncStub = sandbox.stub(child_process, 'execSync').throws(testError);
		const consoleErrorStub = sandbox.stub();

		sandbox.stub(console, 'error').get(() => consoleErrorStub);
		sandbox.stub(vscode.workspace, 'workspaceFolders').value([
			{
				uri: {
					get fsPath() {
						hasFsPathCalled = true;
						return pathToRepoMock;
					}
				}
			}
		]);

		// act 
		const result = findGitRepoRoot();

		// assert
		expect(result).to.be.undefined;
		expect(hasFsPathCalled).to.be.true;
		expect(execSyncStub.called).to.be.true;
		expect(consoleErrorStub.calledWithExactly('Error finding Git repository root:', testError)).to.be.true;
	});
});
