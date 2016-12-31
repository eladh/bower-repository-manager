var Registry = require('./lib/registry').Registry,
    express = require('express'),
    fs = require('fs'),
    colors = require('colors'),
    RedisDb = require('./lib/db/redis').RedisDb;

// read configuration from file and make it acssesable globaly
global.config = JSON.parse(fs.readFileSync('config.json'));

// start the registry server
new Registry({db: new RedisDb(config.redis)})
    .initialize()
    .listen(config.server.port);

console.log("Registry server", "up and running".green.bold, "on port", config.server.port.toString().magenta.bold);