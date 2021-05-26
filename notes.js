const { exec } = require("child_process");

class GitBranchCleaner {
  constructor(repositoryPath) {
    // Set arguments
    this.repositoryPath = repositoryPath;

    // Set default values
    this.scrapeLocalBranchesDone = false;
    this.scrapeRemoteBranchesDone = false;
    
    this.localBranches = [];
    this.remoteBranches = [];
    this.deadBranches = [];
  }

  fetch() {
    var self = this;

    return new Promise(function(resolve, reject) {
      exec(`git -C ${self.repositoryPath} remote update origin --prune`, (err, stdout, stderr) => {
        if (err || stderr) {
          reject(new Error(err ? err.message : stderr));
          return;
        }

        resolve('done');
      });
    });
  }

  scrape() {
    var self = this;

    return new Promise(function(resolve, reject) {
      // Start local branch scraping
      // exec('git branch -C ' + self.repositoryPath, (err, stdout, stderr) => {
      exec(`git -C ${self.repositoryPath} branch`, (err, stdout, stderr) => {
        if (err || stderr) {
          reject(new Error(err ? err.message : stderr));
          return;
        }
  
        self.scrapeLocalBranchesDone = true;
        self.localBranches = stdout
          .replace(/(\t| )/g, '')
          .toLocaleLowerCase()
          .split('\n');
        
        // Check if both tasks ready
        if(self.scrapeLocalBranchesDone && self.scrapeRemoteBranchesDone) {
          self.findDeadBranches();
          resolve(self.deadBranches);
        }
      });
  
      // Start remote branch scraping
      exec(`git -C ${self.repositoryPath} branch -r`, (err, stdout, stderr) => {
        if (err || stderr) {
          reject(new Error(err ? err.message : stderr));
          return;
        }
  
        self.scrapeRemoteBranchesDone = true;
        self.remoteBranches = stdout
          .replace(/(\t| |\*|origin\/)/g, '')
          .toLocaleLowerCase()
          .split('\n');
        
        // Check if both tasks ready
        if(self.scrapeLocalBranchesDone && self.scrapeRemoteBranchesDone) {
          self.findDeadBranches();
          resolve(self.deadBranches);
        }
      });
    });
  }

  findDeadBranches() {
    for(var i=0; i < this.localBranches.length; i++) {
      // Check if is empty string
      if(this.localBranches[i] == '' 
        || this.localBranches[i].startsWith('*')) {
        continue;
      }

      var existsOnRemote = false; 

      for(var j=0; j < this.remoteBranches.length; j++) {
        if(this.localBranches[i] == this.remoteBranches[j]) {
          existsOnRemote = true;
          break;
        }
      }

      if(!existsOnRemote) {
        this.deadBranches.push(this.localBranches[i]);
      }
    }
  }

  clean() {
    var self = this;

    return new Promise(function(resolve, reject) {
      // Status collection helper
      let readyCounter = 0,
          statusCollection = () => {
            readyCounter += 1;

            if(readyCounter == self.deadBranches.length) {
              self.deadBranches = [];
              resolve(`${readyCounter} branches removed`);
            }
          };

      // Remove all dead branches (except checked out branch)
      for(var i=0; i < self.deadBranches.length; i++) {
        // TODO: Add warning and new request to delete 
        // protected branch otherwise use -D
        // exec(`git -C ${self.repositoryPath} branch -d ` + self.deadBranches[i], (err, _, stderr) => {
        exec(`git -C ${self.repositoryPath} branch -D ` + self.deadBranches[i], (err, _, stderr) => {
          if (err || stderr) {
            reject(new Error(err ? err.message : stderr));
            return;
          }

          statusCollection();
        });
      }
    });
  }
}

let gbc = new GitBranchCleaner('./');

gbc.fetch().then(
  function() { 
    gbc.scrape().then(
      function(result) { 
        console.log('Remote the following Y/n?');
        console.log(result);
        
        gbc.clean().then(
          function() { 
            console.log('Done!');
          },
          function(error) {
            console.error(error);
          }
        );
      },
      function(error) {
        console.error(error);
      }
    );
  },
  function(error) {
    console.error(error);
  }
);

// BUG if remote branch deleted update list failed