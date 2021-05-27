const fs = require('fs');
var path = require('path');
const vscode = require('vscode');
const { exec } = require("child_process");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// Fetch all prune task
	const fetchAllPrune = (data) => {
		return new Promise(function(resolve, reject) {
			data.progress.report({ increment: 0, message: "Update meta information" });

			try {
				// Helper to keep track of executed commands
				let resolveCounter = 0,
						resolveChecker = function() {
							resolveCounter += 1;
							if(resolveCounter == data.workspaces.length) {
								data.progress.report({ increment: 20 });
								resolve(data);
							}
						};

				// Run git fetch all prune for all filtered workspaces
				for(var i=0; i < data.workspaces.length; i++) {
					exec('git -C ' + data.workspaces[i] + ' fetch --all --prune', (err, _, stderr) => {
						if (err || stderr) {
							reject(err ? err.message : stderr);
							return;
						}

						resolveChecker();
					});
				}
			} catch(err) {
				reject(err.message);
			}
		});
	};

	// Get local branches task
	const getLocalBranches = (data) => {
		return new Promise(function(resolve, reject) {
			data.progress.report({ increment: 0, message: "Get local branches" });
			//  TODO 
			console.log('Run: git branch');
			data.local = ['a', 'b', 'c'];
			data.progress.report({ increment: 10 });
	
			setTimeout(() => { resolve(data); }, 1000);
		});
	}

	// Get remote branches task
	const getRemoteBranches = (data) => {
		return new Promise(function(resolve, reject) {
			data.progress.report({ increment: 0, message: "Get remote branches" });
			//  TODO 
			console.log('Run: git branch -r');
			data.remote = ['a', 'b'];
			data.progress.report({ increment: 25 });
	
			setTimeout(() => { resolve(data); }, 1000);
		});
	}

	// Delete dead branches task
	const deleteDeadBranches = (data) => {
		return new Promise(function(resolve, reject) {
			data.progress.report({ increment: 0, message: "Delete dead branches" });

			// TODO find dead branches except currently active and 
			// Loop and delete
			// Check if canceled 
			if(data.token.isCancellationRequested) {
				return;
			}

			data.progress.report({ increment: 40 });
	
			setTimeout(() => { resolve(data); }, 1000);
		});
	}

	context.subscriptions.push(vscode.commands.registerCommand('VSGitBranchCleaner.run', function () {
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "",
			cancellable: true
		}, (progress, token) => {
			// Set initial progress to 0
			progress.report({ increment: 0 });
			
			const p = new Promise(resolve => {
				// Check if canceled 
				if(token.isCancellationRequested) {
					return;
				}

				// Define task chain
				let tasks = [
					// Prepend function to prepare this job
					() => {
						return new Promise(function(resolve, reject) {
							progress.report({ increment: 0, message: "Check current repository" });
							
							try {
								// Get all active workspace folders
								var workspaces = vscode.workspace.workspaceFolders,
										gitWorkspaces = [];
								
								// Check if at least one workspace folder active
								if(workspaces.length == 0) {
									throw 'No workspace open';
								}

								// Filter the paths to workspace folders that have a .git
								for(var i=0; i < workspaces.length; i++) {
									if(fs.existsSync(path.join(workspaces[i].uri.fsPath, '.git'))) {
										gitWorkspaces.push(
											path.join(workspaces[i].uri.fsPath)
										);
									}
								}
								
								// Check if at least one workspace had a .git
								if(gitWorkspaces.length == 0) {
									throw 'No git repositories in active workspaces';
								}

								// Increment progress and hand over to next task
								progress.report({ increment: 10 });
								resolve({progress: progress, token: token, workspaces: gitWorkspaces});
							} catch(err) {
								reject(err.message);
							}
						});
					},
					// List of tasks that are performed without external influence
					fetchAllPrune, getLocalBranches, getRemoteBranches, deleteDeadBranches,
					() => {
						progress.report({ increment: 5, message: "Ready" });
						// Wait 2 sec before closing progress view
						setTimeout(() => { resolve(); }, 2000);
					}
				];

				// Run task chain
				tasks.reduce( (previousTask, nextTask) => {
					return previousTask.then((data) => {
						// Check if canceled 
						if(token.isCancellationRequested) {
							return;
						}

						// Hand over to next task 
						return nextTask(data);
					}).catch((message) => { 
						vscode.window.showErrorMessage(message);
						resolve();
					});
				}, Promise.resolve());
			});

			return p;
		});
	}));
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
