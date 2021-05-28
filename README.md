# VSGitBranchCleaner
This extension provide a `Clean local branches` command.
First it is searching for local branches that are not present on remote (excluding active one).
Then you have the choice between:
* `Yes` -> Delete all branches that does not have any commits that are not pushed
* `Yes (force)` -> Delete event if hash un-pushed commits