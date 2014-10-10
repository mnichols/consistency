module.exports = function(PORT){
    var async = require('async');

    var nginx = require('ngineer')(__dirname + '/nginx', {
      port: 8080
    });
    var proxy = nginx.location('/api').proxy('http://localhost:' + PORT + '/');


    async.series([ nginx.scaffold, nginx.start, proxy ], function(err) {
      if (err) {
        return console.error(err);
      }

      console.log('started nginx, pid: ' + nginx.pid);
      console.log('app available at http://localhost:8080/express-test');
    });
}

