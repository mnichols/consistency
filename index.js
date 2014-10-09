var Hapi = require('hapi');

// Create a server with a host and port
var opts = {
    cors: {
        exposedHeaders: [
            'Accept-Ranges'
            , 'Content-Encoding'
            , 'Content-Length'
            , 'Content-Range'
            ,'Content-Encoding'
        ]
    }
}

var server = new Hapi.Server('localhost', 3200, opts)

function Asset(id,name, groups) {
    this.id = id
    this.name = name
    this.groups = groups
}
Asset.prototype.rename = function(name) {
    this.name = name
}
Asset.prototype.groups = function(groups) {
    this.groups = groups
}

var assets = {}
for(var i = 0; i < 3 ; i++) {
    var ass = new Asset(i + 1,'asset' + i,[])
    assets[ass.id] = ass
}

server.route({
    method: 'GET'
    ,path: '/ping'
    ,handler: function(request,reply){
        return reply({
            server: 'PONG'
        })
    }
})

// Add the route
server.route({
    method: 'GET',
    path: '/assets',
    handler: function (request, reply) {
        return reply({
            assets: assets
        })
    }
});
server.route({
    method: 'PATCH'
    ,path: '/groups'
    ,handler: function(request, reply) {
        var asset = assets[request.payload['asset-key']]
        asset.groups(request.payload['group'])
        console.log('mypayload',request.payload)

    }
})

// Start the server
server.start();
