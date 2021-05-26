function fetchAllPrune(data) {
  return new Promise(function(resolve, reject) {
    console.log('Run: git fetch --all --prune');
    
    resolve(data)
  });
}

function getLocalBranches(data) {
  return new Promise(function(resolve, reject) {
    console.log('Run: git branch');
    data.local = ['a', 'b', 'c'];

    resolve(data)
  });
}

function getRemoteBranches(data) {
  return new Promise(function(resolve, reject) {
    console.log('Run: git branch -r');
    data.remote = ['a', 'b'];

    resolve(data)
  });
}

function performTasks(repositoryPath) {
  [
    function() {
      return new Promise(function(resolve, reject) {
        console.log('Setup');
        resolve({repositoryPath: repositoryPath})
      });
    },
    fetchAllPrune, getLocalBranches, getRemoteBranches
  ].reduce( (previousTask, nextTask) => {
    return previousTask.then((data) => {
      return nextTask(data);
    });
  }, Promise.resolve());
}

performTasks();