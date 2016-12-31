var express = require('express'),
    colors = require('colors'),
    Package = require('./package').Package,
    Downloader = require('./downloader').Downloader,
    fs = require('fs'),
    GitRepoHandler = require('./gitRepoHandler').GitRepoHandler,
    gitUtils = require('./gitUtils').gitUtils,
    downloader = new Downloader(),

    remote = require('./remotePackage');

// Registry constructor
var Registry = function (options) {
    options = options || {};
    this.private = options.private;
    this.db = options.db || null;
    this.server = express();
    this.server.use(express.bodyParser());
};

Registry.prototype = {

    // Initialize the registry
    initialize: function () {
        // GET /packages
        this.server.get('/packages', function (req, res) {
            this.db.find()
                .then(function (packages) {
                    res.send(packages);
                })
                .fail(function (e) {
                    res.send(500, { error: e.message });
                });
        }.bind(this));
//----------------------------------------------------------------------------------------------------------------------
        // POST /packages
        this.server.post('/packages', function (req, res) {
            var pkg = new Package({
                name: req.param('name'),
                url: req.param('url')
            });

            if (pkg.validate({private: this.private})) {
                return res.send(400);
            }

            this.db.add(pkg.toJSON()).then(function () {
                res.send(201);
            }, function () {
                res.send(406);
            });

        }.bind(this));

//----------------------------------------------------------------------------------------------------------------------
        // GET /redisreg/:name - redis create entry
        this.server.get('/redisreg/:name', function (req, res) {
            console.log('registering package ' + req.params.name.green.bold + " in the local db");
            var localHTTPRepoUrl = config.git.path + ":" + config.git.port + "/r/" + req.params.name + '.git';
            gitUtils.registerPackage(req.params.name, localHTTPRepoUrl, this.db, function () {
                res.send(200)
            })
        }.bind(this));
//----------------------------------------------------------------------------------------------------------------------

        // GET /createrepo/:name - hirsh crap service
        this.server.get('/createrepo/:name', function (req, res) {
            console.log('checking  package ' + req.params.name.green.bold + " in the local db");
            var localHTTPRepoUrl = config.git.path + ":" + config.git.port + "/r/" + req.params.name + '.git';
            this.db.find({name: req.params.name})
                .then(function (dbres) {
                    if (!dbres.pkgExist) {
                        console.log("package " + req.params.name + " was not found in".red.bold, "the local registry.");

                        var gitRepoHandler = new GitRepoHandler({
                            data: {
                                name: req.params.name,
                                url: localHTTPRepoUrl,
                                db: this.db,
                                useIncrementalPushTags: true
                            }});

                        gitRepoHandler.createLocalGitRepository()
                            .then(gitRepoHandler.registerPackage()
                                .then(function (result) {
                                    res.send(200, "true," + result.url);
                                }))
                            .fail(function (e) {
                                res.send(500, e.message);
                            });

                    } else {
                        res.send(200, "false," + dbres.pkgs[0].url);
                    }
                }.bind(this))
                .fail(function (e) {
                    res.send(500, { error: e.message });
                })
        }.bind(this));
//----------------------------------------------------------------------------------------------------------------------
        // GET /packages/:name
        this.server.get('/packages/:name', function (req, res) {
            console.log('searching for package ' + req.params.name.green.bold + " in the local registry...");
            this.db.find({name: req.params.name})
                .then(function (dbres) {
                    console.log("package " + req.params.name);
                    if (!dbres.pkgExist) {
                        console.log("package " + req.params.name + " was not found in".red.bold, "the local registry.");
                        remote.find(req.params.name, this.db, res);
                    } else {
                        console.log("sending package " + req.params.name);
                        this.db.hit(dbres.pkgs[0].name);
                        res.send(dbres.pkgs[0]);
                    }
                }.bind(this))
                .fail(function (e) {
                    res.send(500, { error: e.message });
                })
        }.bind(this));
//----------------------------------------------------------------------------------------------------------------------
        // GET /packages/search/:name
        this.server.get('/packages/search/:name', function (req, res) {
            this.db.find({
                $match: {
                    name: req.params.name
                }
            }).then(function (packages) {
                    res.send(packages);
                }, function () {
                    res.send(500);
                });
        }.bind(this));

//----------------------------------------------------------------------------------------------------------------------
        // GET /npm/get/fileName
        this.server.get('/npm/get/:fileName', function (req, res) {
            console.log('npm file request');
            downloader.getFile(req.param('fileName'), res);
        }.bind(this));

//----------------------------------------------------------------------------------------------------------------------
        // GET /npm/list
        this.server.get('/npm/list', function (req, res) {
            console.log('npm list request');
            downloader.getFileLIst(res);
        }.bind(this));

        return this
    },

    // Proxy server.listen
    listen: function () {
        this.server.listen.apply(this.server, arguments);
    }
};

exports.Registry = Registry;