var fs   = require('fs'),
    walk = require('walk'),
    _    = require('underscore'),
    path = require('path');

/**
 * Downloader constructor
 * @constructor
 */
var Downloader = function () {

};

/**
 * find all the MD5 files and build an Map object
 * that contain the file name as key and the MD5 file
 * content as value.
 * @param res
 */
var buildList = function (res) {

    var files = [];
    var map = {};
    var walker = walk.walk(config.modules.path);

    console.log(config.modules.path);

    walker.on('file', function (root, stat, next) {
        files.push(root + '/' + stat.name);
        next();
    });

    walker.on('error', function (err, entry, stat) {
        console.log('Got error ' + err + 'on entry ' + entry);
    });

    walker.on('end', function () {
        /**
         * build new array that contains just the MD5 files
         * @type {*}
         */
        var md5list = _.filter(files, function (file) {
            return file.indexOf('.md5') != -1;
        });

        var m;
        for (m in md5list) {
            if (md5list.hasOwnProperty(m)) {
                var keySplit = md5list[m].split('/');
                var key = keySplit[keySplit.length - 1].split('.')[0];
                var value = fs.readFileSync(md5list[m]).toString();
                map[key] = value;
            }
        }
        res.send(map);
    })
};

/**
 * locate and send a zip file by a given name
 * @param fileName
 * @param res
 */
var locateFile = function (fileName, res) {

    var file = __dirname + '\\modules\\npm\\' + fileName + '.zip';
    var filename = path.basename(file);
    res.setHeader('Content-disposition', 'attachment; filename=' + filename);
    res.setHeader('Content-type', 'application/zip');

    res.sendfile(file);

};

/**
 * downloader methods
 * @type {{getFile: getFile, getFileLIst: getFileLIst}}
 */
Downloader.prototype = {

    /**
     * return a file as response. if file not found,
     * print an error.
     * @param fileName
     * @param res
     */
    getFile: function (fileName, res) {
        locateFile(fileName, res);
    },

    /**
     * return a Map object of files name as key
     * and the the content of the matching MD5 file
     * as value
     * @param res
     */
    getFileLIst: function (res) {
        buildList(res);
    }
};

/**
 * expose the downloader as a
 * @type Downloaderr}
 */
exports.Downloader = Downloader;