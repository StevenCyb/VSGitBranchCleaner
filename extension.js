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
				let resolveCounter = 0;

				// Run git fetch all prune for all filtered workspaces
				for(var i=0; i < data.workspaces.length; i++) {
					// Check if run canceled
					if(data.token.isCancellationRequested) {
						return;
					}

					exec('git -C ' + data.workspaces[i].path + ' fetch --all --prune', (err, _, stderr) => {
						if (err || stderr) {
							reject(err ? err.message : stderr);
							return;
						}

						resolveCounter += 1;
						if(resolveCounter == data.workspaces.length) {
							data.progress.report({ increment: 20 });
							resolve(data);
						}
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
			
			try {
				// Helper to keep track of executed commands
				let resolveCounter = 0;

				// Get local branches
				for(var i=0; i < data.workspaces.length; i++) {
					// Check if run canceled
					if(data.token.isCancellationRequested) {
						return;
					}

					const ownIndex = i; 
					exec('git -C ' + data.workspaces[ownIndex].path + ' branch', (err, stdout, stderr) => {
						if (err || stderr) {
							reject(err ? err.message : stderr);
							return;
						}
						
						data.workspaces[ownIndex].localBranches = stdout
							.replace(/(\t| )/g, '')
							.toLocaleLowerCase()
							.split('\n');
						
						resolveCounter += 1;
						if(resolveCounter == data.workspaces.length) {
							data.progress.report({ increment: 10 });
							resolve(data);
						}
					});
				}
			} catch(err) {
				reject(err.message);
			}
		});
	}

	// Get remote branches task
	const getRemoteBranches = (data) => {
		return new Promise(function(resolve, reject) {
			data.progress.report({ increment: 0, message: "Get remote branches" });
			
			try {
				// Helper to keep track of executed commands
				let resolveCounter = 0;

				// Get remote branches
				for(var i=0; i < data.workspaces.length; i++) {
					// Check if run canceled
					if(data.token.isCancellationRequested) {
						return;
					}
					
					const ownIndex = i; 
					exec('git -C ' + data.workspaces[ownIndex].path + ' branch -r', (err, stdout, stderr) => {
						if (err || stderr) {
							reject(err ? err.message : stderr);
							return;
						}
						
						data.workspaces[ownIndex].remoteBranches = stdout
							.replace(/(\t| |\*|origin\/)/g, '')
							.toLocaleLowerCase()
							.split('\n');

						resolveCounter += 1;
						if(resolveCounter == data.workspaces.length) {
							data.progress.report({ increment: 20 });
							resolve(data);
						}
					});
				}
			} catch(err) {
				reject(err.message);
			}
		});
	}

	// Prepare dead branches delete task
	const prepareDeleteDeadBranches = (data) => {
		return new Promise(function(resolve, reject) {
			data.progress.report({ increment: 0, message: "Delete dead branches" });

			try {
				var deleteBranchesCount = 0;

				// Find dead branches except currently active 
				for(var i=0; i < data.workspaces.length; i++) {
					// Check if run canceled
					if(data.token.isCancellationRequested) {
						return;
					}

					data.workspaces[i].deadBranches = [];
					for(var j=0; j < data.workspaces[i].localBranches.length; j++) {
						// Check if run canceled
						if(data.token.isCancellationRequested) {
							return;
						}

						// Check if is empty string
						if(data.workspaces[i].localBranches[j] == '' 
							|| data.workspaces[i].localBranches[j].startsWith('*')) {
							continue;
						}

						var existsOnRemote = false; 

						for(var k=0; k < data.workspaces[i].remoteBranches.length; k++) {
							// Check if run canceled
							if(data.token.isCancellationRequested) {
								return;
							}

							if(data.workspaces[i].localBranches[j] 
									== data.workspaces[i].remoteBranches[k]) {
								existsOnRemote = true;
								break;
							}
						}
						
						if(!existsOnRemote) {
							deleteBranchesCount += 1;

							data.workspaces[i].deadBranches.push(
								data.workspaces[i].localBranches[j]
							);
						}
					}
				}
			} catch(err) {
				reject(err.message);
			}
			data.progress.report({ increment: 10 });
			
			// Check if something to delete
			if(deleteBranchesCount == 0) {
				vscode.window.showInformationMessage('No dead branches found.')

				data.parentResolve();
				return;
			}

			// Ask if really want to delete and how
			vscode.window
        .showInformationMessage(
					`Delete ${deleteBranchesCount} branch in ${data.workspaces.length} workspaces?`, 
					"Yes", "Yes (force)", "No")
        .then(selection => {
					//  Check if user has canceled dialog
					if(!selection || selection == 'No') {
						data.parentResolve();
						return;
					}

					data.forceDelete = selection == 'Yes (force)';
					resolve(data);
				}); 
		});
	}

	// Delete dead branches task
	const deleteDeadBranches = (data) => {
		return new Promise(function(resolve, reject) {
			// TODO find dead branches except currently active 
			
			//  TODO ask once if want to delete n dead branches (list names?)

			// TODO Loop and delete
			// 			git -C ${self.repositoryPath} branch -d name
			
			// TODO Show ready and increase to max 
			
	
			setTimeout(() => { data.progress.report({ increment: 30 }); resolve(data); }, 1000);
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
									// Check if run canceled
									if(token.isCancellationRequested) {
										return;
									}

									if(fs.existsSync(path.join(workspaces[i].uri.fsPath, '.git'))) {
										gitWorkspaces.push({
											path: path.join(workspaces[i].uri.fsPath)
										});
									}
								}
								
								// Check if at least one workspace had a .git
								if(gitWorkspaces.length == 0) {
									throw 'No git repositories in active workspaces';
								}

								// Increment progress and hand over to next task
								progress.report({ increment: 5 });
								resolve({progress: progress, token: token, workspaces: gitWorkspaces});
							} catch(err) {
								reject(err.message);
							}
						});
					},
					// List of tasks that are performed without external influence
					fetchAllPrune, getLocalBranches, getRemoteBranches, 
					prepareDeleteDeadBranches, deleteDeadBranches,
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
