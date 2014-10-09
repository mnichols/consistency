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
    ,io = require('socket.io')(server.listener)


function Asset(id,name, groups) {
    this.id = id
    this.name = name
    this.groups = groups || []
}
Asset.prototype.rename = function(name) {
    this.name = name
}
Asset.prototype.regroup = function(groups) {
    this.groups = [].concat(groups)
}

var assets = {}
for(var i = 0; i < 3 ; i++) {
    var ass = new Asset(i + 1,'asset' + (i + 1),[])
    assets[ass.id] = ass
}

//routes

server.route({
    method: 'GET'
    ,path: '/ping'
    ,handler: function(request,reply){
        return reply({
            server: 'PONG'
        })
    }
})

server.route({
    method: 'GET',
    path: '/assets',
    handler: function (request, reply) {
        console.log('assets',assets)
        return reply({
            assets: assets
        })
    }
});
server.route({
    method: 'PATCH'
    ,path: '/groups'
    ,handler: function(request, reply) {
        var asset = assets[request.payload['asset-id']]
        asset.regroup(request.payload['group'])
        reply('OK')
    }
})

server.route({
    method: 'PATCH'
    ,path: '/names'
    ,handler: function(request,reply) {
        var asset = assets[request.payload['asset-id']]
        asset.rename(request.payload.name)
        reply('OK')
    }
})

var ioHandler = function(socket) {
    setInterval(function(){
        socket.emit('currentTime',{
            message: new Date().toString()
        })

    },1000)
}
io.on('connection',ioHandler)

// Start the server
server.start();


