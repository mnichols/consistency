var Hapi = require('hapi')
    ,PORT = process.env.PORT || 3200
    ,NOTIFICATIONS_PORT = process.env.NOTIFICATIONS_PORT || 4000


var server = new Hapi.Server('localhost', PORT)
    ,notificationsServer = new Hapi.Server('localhost',NOTIFICATIONS_PORT)
    ,io = require('socket.io')(notificationsServer.listener)
    ,notifier

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
require('./immutable')(server,notifier,'')

// Start the server
server.start(function(){
    notificationsServer.start()

})




