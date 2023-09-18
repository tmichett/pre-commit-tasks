import { expect } from 'chai';
import * as path from 'path';
import * as sinon from 'sinon';
import * as vscode from 'vscode';

import { activate } from '../../extension';
import { precommitCurrentFileTaskProviderType, precommitGitStageTaskProviderType } from '../../strings';

import * as precommitTaskProvider from '../../precommitTaskProvider';
import * as utils from '../../utils';

const getterStub: {
	<T>(key: string): T | undefined;
	<T>(key: string, defaultValue: T): T;
} = <sinon.SinonStub><unknown>sinon.stub();

const extensionContextMock: vscode.ExtensionContext = {
	extensionPath: 'mockExtensionPath',
	storagePath: 'mockStoragePath',
	globalStoragePath: 'mockGlobalStoragePath',
	logPath: 'mockLogPath',
	subscriptions: [],
	workspaceState: {
		get: getterStub,
		update: sinon.stub().resolves(),
		keys: () => [],
	},
	globalState: {
		get: getterStub,
		keys: () => [],
		update: sinon.stub().resolves(),
		setKeysForSync: sinon.stub(),
	},
	asAbsolutePath: sinon.stub().callsFake((relativePath: string) => path.join(__dirname, '..', relativePath)),
	extensionUri: vscode.Uri.file(path.join(__dirname, '..')),
	environmentVariableCollection: {
		persistent: false,
		replace: sinon.stub(),
		append: sinon.stub(),
		prepend: sinon.stub(),
		get: sinon.stub(),
		forEach: sinon.stub(),
		delete: sinon.stub(),
		clear: sinon.stub(),
		getScoped: sinon.stub(),
		description: 'mock description',
		[Symbol.iterator]: function* () {
		}
	},
	extensionMode: vscode.ExtensionMode.Development,
	storageUri: vscode.Uri.file(path.join(__dirname, '..', 'storage')),
	globalStorageUri: vscode.Uri.file(path.join(__dirname, '..', 'globalStorage')),
	logUri: vscode.Uri.parse('file:///mockLogUri'),
	secrets: {
		get: sinon.stub(),
		store: sinon.stub(),
		delete: sinon.stub(),
		onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event
	},
	extension: {
		id: 'mock.extension',
		extensionKind: vscode.ExtensionKind.UI,
		isActive: true,
		packageJSON: {},
		exports: {},
		activate: sinon.stub(),
		extensionUri: vscode.Uri.parse('file:///mockExtensionUri'),
		extensionPath: 'mockExtensionPath',
	},
};

suite('test activate function', () => {
	let sandbox: sinon.SinonSandbox;
	let gitRepoRootStub: sinon.SinonStub;
	let vsCodeShowInformationMessageStub: sinon.SinonStub;
	let vsCodeRegisterTaskProviderStub: sinon.SinonStub;

	setup(() => {
		sandbox = sinon.createSandbox();

		vsCodeShowInformationMessageStub = sandbox.stub(vscode.window, 'showInformationMessage');
		vsCodeRegisterTaskProviderStub = sandbox.stub(vscode.tasks, 'registerTaskProvider');
	});

	teardown(() => {
		sandbox.restore();
	});


	test('should register tasks if in a git repo', () => {
		// assemble
		const gitPathMock = '/mocked/git/path';
		const returnStub = sandbox.stub();
		const precommitGitStageTaskProviderStub = sandbox.stub(precommitTaskProvider, 'PrecommitGitStageTaskProvider').returns(returnStub);
		const precommitCurrentFileTaskProviderStub = sandbox.stub(precommitTaskProvider, 'PrecommitCurrentFileTaskProvider').returns(returnStub);

		gitRepoRootStub = sandbox.stub(utils, 'findGitRepoRoot').returns(gitPathMock);

		// act
		activate(extensionContextMock);

		// assert
		expect(gitRepoRootStub.called).to.be.true;

		expect(vsCodeShowInformationMessageStub.called).to.be.false;

		expect(precommitGitStageTaskProviderStub.calledWithNew()).to.be.true;
		expect(precommitCurrentFileTaskProviderStub.calledWithNew()).to.be.true;

		expect(precommitGitStageTaskProviderStub.calledWith(gitPathMock)).to.be.true;
		expect(precommitCurrentFileTaskProviderStub.calledWith(gitPathMock)).to.be.true;

		expect(vsCodeRegisterTaskProviderStub.callCount).to.be.equal(2);
		expect(vsCodeRegisterTaskProviderStub.calledWith(precommitGitStageTaskProviderType, returnStub)).to.be.true;
		expect(vsCodeRegisterTaskProviderStub.calledWith(precommitCurrentFileTaskProviderType, returnStub)).to.be.true;
	});


	test('should not register tasks if not in a git repo', () => {
		// assemble
		const infoMsg = 'Not inside a Git repo - pre-commit tasks won\'t be created.';
		const consoleLogStub = sandbox.stub();

		gitRepoRootStub = sandbox.stub(utils, 'findGitRepoRoot').returns(undefined);
		sandbox.stub(console, 'log').get(() => consoleLogStub);

		// act
		activate(extensionContextMock);

		// assert
		expect(gitRepoRootStub.called).to.be.true;

		expect(consoleLogStub.calledWith(infoMsg)).to.be.true;
		expect(vsCodeShowInformationMessageStub.calledWith(infoMsg)).to.be.true;

		expect(vsCodeRegisterTaskProviderStub.called).to.be.false;
	});
});
