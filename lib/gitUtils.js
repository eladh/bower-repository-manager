var http = require('http'),
    exec = require('child_process').exec,
    Package = require('./package').Package,
    util = require('util'),
    colors = require('colors');


// Clone the remote repository and push it to the local git server.
function cloneFromRemotelGitServer(data, db, callback) {
    console.log("starting clone--".green.bold, data.name.bold, "from", data.url.magenta.bold, "....");
    var spawn = require('child_process').spawn;
    var cmd = spawn('cmd', ['/c', 'clone-repo.bat', data.url, 'temp/' + data.name]);

    cmd.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });

    cmd.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    cmd.on('exit', function (code) {
        console.log('child process exited with code ' + code);
        createLocalGitRepository(data, 'temp/' + data.name, db, callback);
    });
}

// use gitblit rest api to remotly create repository for this package.
function createLocalGitRepository(data, tempDir, db, callback) {
    console.log("creating".green.bold, "new local git repository for", data.name.magenta.bold);

    var post_data = JSON.stringify({"name": data.name});

    var post_options = {
        hostname: config.git.hostname,
        port: config.git.port,
        path: '/rpc?req=CREATE_REPOSITORY&name=' + data.name + '.git&Autorization=admin:admin',
        method: 'POST',
        auth: 'admin:admin',
        headers: {
            'Content-Type': 'application/json'
        }
    };

    var post_req = http.request(post_options, function (response) {
        switch (response.statusCode) {
            case 200:
                console.log("new".green.bold, "local git repository for", data.name.bold, "created", "sucessfuly.".green.bold);
                pushToLocalGit(data, tempDir, db, callback);
                break;
            case 500:
                console.log("a git repository named", data.name.bold, "allready exist.".red.bold);
                break;
            default:
                console.log("server responsed: " + response.statusCode.bold);
        }
    });

    post_req.write(post_data);
    post_req.end();
}

// perform git commands and push to local git server
function pushToLocalGit(data, tempDir, db, callback) {
    console.log("Start".green.bold, "Pushing to local git..");

    var localHTTPRepoUrl = config.git.path + ":" + config.git.port + "/r/" + data.name + '.git';
    var localSSHRepoUrl = 'ssh://admin@localhost:29419/' + data.name + 'git';

    // begin git commandline execution
    exec(util.format('git remote remove origin'), {cwd: tempDir}, function (error, stdout, stderr) {
        console.log("performs", "git remote remove origin".bold, "command...");
        if (error) {
            console.log(error);
        }
        if (error === null) {
            console.log("git remote remove origin ".bold, "sucsses.".green.bold);
            console.log("performs", "git remote add  origin".bold, " origin: " + localHTTPRepoUrl);
            exec(util.format('git remote add  origin %s', localHTTPRepoUrl), {cwd: tempDir}, function (error, stdout, stderr) {
                if (error) {
                    console.log(error);
                }
                if (error === null) {
                    console.log("git remote add  origin".bold, "sucsses.".green.bold);
                    exec(util.format('git push origin master --tags'), {cwd: tempDir}, function (error, stdout, stderr) {
                        console.log("performs", "git push origin master".bold, "command...");
                        if (error) {
                            console.log(error);
                            return;
                        }
                        if (error === null) {
                            console.log("git push origin master".bold, "sucsses.".green.bold);
                            exec(util.format('RMDIR %s /S /Q ', data.name), {cwd: 'temp'}, function (error, stdout, stderr) {
                                console.log("removing temp files...".red.bold);
                                if (error) {
                                    console.log(error)
                                }
                                if (error === null) {
                                    console.log("removing temp files...", "sucsees.".green.bold);
                                    registerPackage(data.name, localHTTPRepoUrl, db, callback);
                                }
                            })
                        }
                    })
                }
            })
        }
    });
}

// Register the package on the local bower regiastry server.
function registerPackage(name, url, db, callback) {
    console.log("register".green.bold, "package", name.bold, "with url:", url.magenta.bold);

    var localdb = db;

    var pkg = new Package({
        name: name,
        url: url
    });

    if (pkg.validate({private: this.private})) {
        console.log("Private");
    }


    // register the package in the registry server and send it back to bower
    db.add(pkg.toJSON()).then(function () {
        console.log("sucssesfuly".green.bold, "added to", "local registry".magenta.bold);
        console.log("sending ".green.bold, "data back to bower: " + pkg.name);
        callback(pkg.toJSON());
    }, function () {
        console.log("error occured".red.bold);
    });
}

exports.gitUtils = {
    cloneRepo: cloneFromRemotelGitServer,
    registerPackage: registerPackage
};