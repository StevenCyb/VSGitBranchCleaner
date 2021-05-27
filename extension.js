const vscode = require('vscode');
const fs = require('fs');
// const { exec } = require("child_process");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// Fetch all prune task
	const fetchAllPrune = (data) => {
		return new Promise(function(resolve, reject) {
			data.progress.report({ increment: 0, message: "Update meta information" });
			//  TODO 
			console.log('Run: git fetch --all --prune');
			data.progress.report({ increment: 20 });
			
			setTimeout(() => { resolve(data); }, 1000);
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
			// Loop and delte
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
					() => {
						return new Promise(function(resolve, reject) {
							progress.report({ increment: 0, message: "Check current repository" });
							if(!fs.existsSync('.git')) {
								reject('Directory is not a git repository');
								return;
							}

							progress.report({ increment: 10 });
		
							setTimeout(() => { resolve({progress: progress, token: token}); }, 1000);
						});
					},
					fetchAllPrune, getLocalBranches, getRemoteBranches, deleteDeadBranches,
					() => {
						progress.report({ increment: 5, message: "Ready" });
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
