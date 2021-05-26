const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	context.subscriptions.push(vscode.commands.registerCommand('vsgbc.run', function () {
		vscode.window.showInformationMessage('Hello World from vsgbc!');
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "I am long running!",
			cancellable: true
		}, (progress, token) => {
			token.onCancellationRequested(() => {
				console.log("User canceled the long running operation");
			});

			progress.report({ increment: 0 });

			setTimeout(() => {
				progress.report({ increment: 10, message: "I am long running! - still going..." });
			}, 1000);

			setTimeout(() => {
				progress.report({ increment: 40, message: "I am long running! - still going even more..." });
			}, 2000);

			setTimeout(() => {
				progress.report({ increment: 50, message: "I am long running! - almost there..." });
			}, 3000);

			const p = new Promise(resolve => {
				setTimeout(() => {
					resolve();
				}, 5000);
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
