// Initialisation
const express = require("express");
const app = express();
const https = require("https");
const fs = require('fs');
const str = "<!DOCTYPE html> <html lang=\"en\"> <head> <meta charset=\"UTF-8\"> <meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\"> <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\"> <link type=\"text/css\" rel=\"stylesheet\" href=\"explore.css\"> <title>Result</title> </head> <body>";
app.use(express.urlencoded({extended:true}));
const options = {
  headers: {
    "User-Agent": "github-explorer/1.0.0",
    "Authorization": "token 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",
  },
};


// Read/Write from/into cache(for better performance)
function readCache(filename) {
  try {
    const data = fs.readFileSync(filename, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

function writeCache(filename, data) {
  fs.writeFileSync(filename, JSON.stringify(data));
}



// Website Functionalities
app.get("/",function(req,res){
    res.sendFile(__dirname+"/index.html");
});

app.get("/styles.css",function(req,res){
  res.sendFile(__dirname+"/styles.css");
});

app.get("/explore.css",function(req,res){
  res.sendFile(__dirname+"/explore.css");
});

app.post("/", async function(req, res) {
  let org1 = req.body.org;
  const org = org1.toLowerCase();
  const m = Number(req.body.m);
  const n = Number(req.body.n);
  const repos = await fetchAllRepos(org);
  const sortedRepos = repos.sort((a, b) => b.forks - a.forks).slice(0, n);
  let responseString = str+"<ul>"
  for (let i = 0; i < n; i++) {
    const repo = sortedRepos[i];
    const forks = await fetchForks(org, repo.name, m);
    const oldestForks = forks.slice(0, m);
    responseString += "<li>"+ repo.name + " <a href=\"" + repo.html_url + "\">link</a>" + "<br><ol>";
    for (let j = 0; j < oldestForks.length; j++) {
      const fork = oldestForks[j];
      const listItem = "<li><a href=\"" + fork.html_url + "\">" + fork.owner.login + "</a></li>";
      responseString += listItem;
    }
    responseString += "</ol></li>";
  }
  responseString += "</ul></body></html>";
  res.send(responseString);
});


app.listen(3000,function(){
  console.log("Server is running in localhost 3000");
})


//API calls for Repo Fetching and Caching
function fetchAllRepos(org, page = 1, allRepos = []) {
  const url = `https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}`;

  const cacheFilename = `cache-org/${org}-repo.json`;
  const cachedData = readCache(cacheFilename);
  if (cachedData) {
    return Promise.resolve(cachedData);
  }

  return new Promise(function(resolve, reject){
    https.get(url, options, function(response){
      let data = "";

      response.on("data", function(chunk){data += chunk;});

      response.on("end", () => {
        const repoData = JSON.parse(data);
        if (repoData.length === 0) {
          writeCache(cacheFilename, allRepos);
          resolve(allRepos);
        }
        allRepos = allRepos.concat(repoData);
        fetchAllRepos(org, page + 1, allRepos)
          .then(resolve)
          .catch(reject);
      });
    }).on("error", (err) => {reject(`Error: ${err.message}`);});
  });
}


//API call for Forks Fetching and Caching
function fetchForks(org, repo){
  const forkurl = `https://api.github.com/repos/${org}/${repo}/forks?per_page=100&sort=oldest`;
  const cacheFilename = `cache-fork/${org}-${repo}-fork.json`;
  const cachedData = readCache(cacheFilename);
  if (cachedData) {
    return Promise.resolve(cachedData);
  }
  return new Promise(function(resolve, reject){
    https.get(forkurl, options, function(response){
      let data = "";
      response.on("data", function(chunk){data += chunk;});
      response.on("end", () => {
        const forkData = JSON.parse(data);
        writeCache(cacheFilename, forkData);
        resolve(forkData);
      });
    }).on("error", (err) => {reject(`Error: ${err.message}`);});
  });
}
