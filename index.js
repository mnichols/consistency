var Hapi = require('hapi')
    ,PORT = process.env.PORT || 3200
    ,NOTIFICATIONS_PORT = process.env.NOTIFICATIONS_PORT || 4000



// Create a server with a host and port
var opts = {
    cors: {
        additionalHeaders: [
            'Accept-Ranges'
            , 'Content-Encoding'
            , 'Content-Length'
            , 'Content-Range'
            ,'Content-Encoding'
            ,'Cache-Control'
            ,'Expires'
            ,'ETag'
        ]
        ,additionalExposedHeaders: [
            'Accept-Ranges'
            , 'Content-Encoding'
            , 'Content-Length'
            , 'Content-Range'
            ,'Content-Encoding'
            ,'Cache-Control'
            ,'Expires'
            ,'ETag'
        ]
    }
}

var server = new Hapi.Server('localhost', PORT, opts)
    ,notificationsServer = new Hapi.Server('localhost',NOTIFICATIONS_PORT,opts)
    ,io = require('socket.io')(notificationsServer.listener)


function AssetDescription(id,name, groups) {
    this.id = id
    this.name = name
    this.groups = groups || []
}
AssetDescription.prototype.rename = function(name) {
    this.name = name
}
AssetDescription.prototype.regroup = function(groups) {
    this.groups = [].concat(groups)
}

function AssetsCatalog(id) {
    this.assets = {}
    for(var i = 0; i < 3 ; i++) {
        var ass = new AssetDescription(i + 1,'asset' + (i + 1),[])
        this.assets[ass.id] = ass
    }
}
AssetsCatalog.prototype.findById = function(id) {
    return this.assets[id]
}
AssetsCatalog.prototype.rename = function(id, name) {
    var asset = this.findById(id)
    asset.rename(name)
}
AssetsCatalog.prototype.regroup = function(id, groups) {
    var asset = this.findById(id)
    asset.regroup(groups)
}

var assets = new AssetsCatalog()

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
    path: '/assets-catalog',
    handler: function (request, reply) {
        console.log('assets',assets)
        return reply(assets)
            .header('Cache-Control','max-age=30') //30 second cache
    }
});
server.route({
    method: 'PATCH'
    ,path: '/assets-catalog'
    ,handler: function(request, reply) {
        var id = request.payload['asset-id']
        var name = request.payload['name']
        var groups = request.payload['group']
        if(groups) {
            assets.regroup(id,groups)
        }
        if(name) {
            assets.rename(id, name)
        }
        return reply('OK')
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
server.start(function(){
    notificationsServer.start()

})




