var Hapi = require('hapi')
    ,PORT = process.env.PORT || 3200
    ,NOTIFICATIONS_PORT = process.env.NOTIFICATIONS_PORT || 4000


var server = new Hapi.Server('localhost', PORT)
    ,notificationsServer = new Hapi.Server('localhost',NOTIFICATIONS_PORT)
    ,io = require('socket.io')(notificationsServer.listener)
    ,notifier = new Notifier()

function Notifier(socket) {
    if(socket){
        this.wire(socket)
    }
}
Notifier.prototype.wire = function(socket){
    this.socket = socket
    return this
}
Notifier.prototype.emit = function(e, data) {
    if(!this.socket) {
        //console.log('notifications not connected',e,data)
        return this
    }
    this.socket.emit(e,data)
    return this
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

io.on('connection',notifier.wire.bind(notifier))

//apps
require('./immutable')(server,notifier,'')

// Start the server
server.start(function(){
    notificationsServer.start()
    setInterval(function(){
        notifier.emit('currentTime',{
            message: new Date().toString()
        })

    },1000)

})




