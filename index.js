var Hapi = require('hapi')
    ,PORT = process.env.PORT || 3200
    ,NOTIFICATIONS_PORT = process.env.NOTIFICATIONS_PORT || 4000


var server = new Hapi.Server('localhost', PORT)
    ,notificationsServer = new Hapi.Server('localhost',NOTIFICATIONS_PORT)
    ,io = require('socket.io')(notificationsServer.listener)
    ,notifier



function immutable(){
    var assets = []
        ,revisions = []
        ;

    //app controllers
    function updateRevision(){
        var cur = revisions[0]
            ,newRev = cur + 1
        revisions.unshift(newRev)
        assets.unshift(new AssetsCatalog(newRev))
        notifier.emit('revisionChanged',{
            event: 'revisionChanged'
            ,revision: newRev
        })
    }
    function getAssetsAt(revision) {
        return assets[revision - 1]
    }
    //models
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

    function AssetsCatalog(revision) {
        this.assets = {}
        this.revision = revision
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
        updateRevision()
    }
    AssetsCatalog.prototype.regroup = function(id, groups) {
        var asset = this.findById(id)
        asset.regroup(groups)
        updateRevision()
    }

    revisions.unshift(1)
    assets.unshift(new AssetsCatalog(1))

    server.route({
        method: 'GET'
        ,path: '/immutable/org/revisions'
        ,handler: function(request,reply) {
            var revs = revisions.map(function(num){
                return {
                    revision: num
                }
            })
            return reply({revisions:revs})
        }
    })
    server.route({
        method: 'GET',
        path: '/immutable/org/{revision}/assets-catalog',
        handler: function (request, reply) {
            var assetsCat = getAssetsAt(request.params.revision)
            if(!assetsCat) {
                return reply(new Error('no assets at ' + request.params.org))
                    .code(404)
            }
            return reply(assetsCat)
                .header('cache-control','max-age=31536000') //one year cache
        }
    });
    server.route({
        method: 'PATCH'
        ,path: '/immutable/org/{revision}/assets-catalog'
        ,handler: function(request, reply) {

            if(parseInt(request.params.revision,10) !== revisions[0]) {
                var err = Hapi.error.badRequest('Concurrency Error:Current revision is ' + revisions[0])
                err.output.statusCode = 400
                err.reformat()
                return reply(err)
            }
            var assetsCat = getAssetsAt(parseInt(request.params.revision,10))
            var id = request.payload['asset-id']
            var name = request.payload['name']
            var groups = request.payload['group']
            if(groups) {
                assetsCat.regroup(id,groups)
            }
            if(name) {
                console.log('renaming',id,'with name',name)
                assetsCat.rename(id, name)
            }
            return reply('OK')
        }
    })
}



//common routes

server.route({
    method: 'GET'
    ,path: '/ping'
    ,handler: function(request,reply){
        return reply({
            server: 'PONG'
        })
    }
})

var ioHandler = function(socket) {
    notifier = socket
    setInterval(function(){
        socket.emit('currentTime',{
            message: new Date().toString()
        })

    },1000)
}
io.on('connection',ioHandler)

//apps
immutable()

// Start the server
server.start(function(){
    notificationsServer.start()

})




