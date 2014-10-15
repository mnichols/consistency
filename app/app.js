var App = (function(){

    var socket
        ,API_ENDPOINT = 'http://localhost:8000/api/'
        ,NOTIFICATIONS_ENDPOINT = 'http://localhost:8001/'
    ;

    function url(path) {
        return API_ENDPOINT + path
    }
    function noop(){}

    function ping(cb) {
        cb = (cb || noop)
        httpinvoke(url('/ping'),'GET',{
        },function(err,body,statusCode,headers){
            if(err) {
                console.error(err)
                return cb(err)
            }
            console.log('ping',body)
            return cb()
        })
    }


    function assignAssetValue(asset) {
        var el = document.querySelector('.asset-' + asset.id)
        var name = el.querySelector('.name').innerHTML = asset.name
        var groups = el.querySelector('.groups').innerHTML= (asset.groups || []).join(',')
    }
    function assignValues(assets) {
        for(var k in assets) {
            var ass = assets[k]
            assignAssetValue(ass)
        }
    }
    function loadAssets() {
        return httpinvoke(url('/assets-catalog'),'GET',
            function(err,body,statusCode){
                var data = JSON.parse(body)
                return assignValues(data.assets)
            })
    }

    function connectToNotifications() {
        socket = io.connect(NOTIFICATIONS_ENDPOINT)
        socket.on('currentTime',function(e){
            var time = document.querySelector('.notifications .current-time')
            time.innerHTML = e.message
        })

    }

    //forms
    function bindForms() {
        var groupsForm = document.querySelector('.groups-form')
        var namesForm = document.querySelector('.names-form')
        groupsForm.addEventListener('submit',patchGroups)
        namesForm.addEventListener('submit',patchNames)
    }
    function patchGroups(e){
        var form = this
        e.preventDefault()
        httpinvoke(url('/assets-catalog'),'PATCH',{
            input: new FormData(this)
        },function(err) {
            form.reset()
        })
    }
    function patchNames(e) {
        var form = this
        e.preventDefault()
        httpinvoke(url('/assets-catalog'),'PATCH',{
            input: new FormData(this)
        },function(err) {
            form.reset()
        })
    }

    function start(){
        console.log('starting app')
        ping()
        connectToNotifications()
        loadAssets()
        bindForms()
    }


    return {
        start: start
    }
})()

