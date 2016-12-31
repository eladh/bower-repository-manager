var http = require('http'),
    git = require('./gitUtils').gitUtils;


// serach the bower remote registry server 
exports.find = function (packageName, db, res) {
    console.log("searchig".green.bold, "in the", "remote bower regsitry".magenta.bold, "for package: " + packageName.bold);

    // send request with proxy setting
    http.get({
        host: config.proxy.host,
        port: config.proxy.port,
        path: config.bower.path + packageName
    }, function (response) {
        response.on('data', function (data) {
            try {
                git.cloneRepo(JSON.parse(data.toString()), db, returnResult);
            } catch (e) {
                res.send(404, packageName + " not exist in bower remote repo");
            }
        });
    });

    // callback function to send back the result
    var returnResult = function (bowerJson) {
        res.send(bowerJson);
    }
};