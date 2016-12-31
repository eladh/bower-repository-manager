var Q = require('q');
var http = require('http');
var Package = require('./package').Package;


var GitRepoHandler = function (opt) {
    opt = opt || {};
    this.data = opt.data;
};

GitRepoHandler.prototype = {
    createLocalGitRepository: function () {
        console.log("creating".green.bold, "new local git repository for", this.data.name.magenta.bold);

        var defer = Q.defer();
        var postData = JSON.stringify({
            "name": this.data.name,
            "useIncrementalPushTags": this.data.useIncrementalPushTags
        });


        var post_options = {
            hostname: config.git.hostname,
            port: config.git.port,
            path: '/rpc?req=CREATE_REPOSITORY&name=' + this.data.name + '.git&Autorization=admin:admin',
            method: 'POST',
            auth: 'admin:admin',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        var postReq = http.request(post_options, function (response) {
            switch (response.statusCode) {
                case 200:
                    console.log("new".green.bold, "local git repository for", this.data.name.bold, "created", "successfully.".green.bold);
                    defer.resolve();
                    break;
                case 500:
                    console.log("a git repository named", this.data.name.bold, "already exist.".red.bold);
                    defer.reject(new Error("a git repository " + this.data.name + " already exist."));
                    break;
                default:
                    console.log("server responded: " + response.statusCode.bold);
                    defer.reject("server responded: " + response.statusCode);
            }
        }.bind(this));

        postReq.write(postData);
        postReq.end();
        return defer.promise;
    },

    registerPackage: function () {

        var defer = Q.defer();
        console.log("register".green.bold, "package", this.data.name.bold, "with url:", this.data.url.magenta.bold);

        var pkg = new Package({
            name: this.data.name,
            url: this.data.url
        });

        // register the package in the registry server and send it back to bower
        this.data.db.add(pkg.toJSON()).then(function () {
            console.log("successfully".green.bold, "added to", "local registry".magenta.bold);
            console.log("sending ".green.bold, "data back to bower: " + pkg.name);
            defer.resolve(pkg.toJSON());
        }, function (e) {
            console.log("error occurred".red.bold);
            defer.reject(new Error("error occurred on registerPackage to DB"));
        });
        return defer.promise;
    }
};


exports.GitRepoHandler = GitRepoHandler;
