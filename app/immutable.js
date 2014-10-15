var App = (function(){

    var socket
        ,API_ENDPOINT = 'http://localhost:8000/api'
        ,NOTIFICATIONS_ENDPOINT = 'http://localhost:8001/'
        ,revisions = []
    ;

    function seedRevisions() {
        //this should come from server
        revisions = [
            { revision: 1 }
        ]
    }

    function toggleDetails(e) {
        var details = document.querySelector('.md-target')
        details.classList.toggle('show')
        details.classList.toggle('hidden')
    }
    //notification handlers
    function handleRevisionChange(e) {
        var client = revisions[0]
        if(e) {
            revisions.unshift(e)
        }
        e = e || client
        var form = document.querySelector('form.update')
        form.querySelector('.current-revision').innerHTML = e.revision
        form.querySelector('.stale-revision').innerHTML = client.revision
        if(client.revision === e.revision) {
            return form.querySelector('button').setAttribute('disabled','')
        }
    }

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
    function loadAssets(revision) {
        return httpinvoke(url('/org/' + revision + '/assets-catalog'),'GET',
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
        socket.on('revisionChanged',handleRevisionChange)

    }

    //forms
    function bindForms() {
        var groupsForm = document.querySelector('.groups-form')
        var namesForm = document.querySelector('.names-form')
        var updateForm = document.querySelector('.update')
        var detailsToggler = document.querySelector('.details-toggle')
        groupsForm.addEventListener('submit',patchGroups)
        namesForm.addEventListener('submit',patchNames)
        updateForm.addEventListener('submit',reload)
        detailsToggler.addEventListener('click',toggleDetails)
    }

    //form handlers
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

    function reload(e) {
        e.preventDefault()
        var lastKnown = revisions[0]
        return loadAssets(lastKnown.revision)
    }

    function compileMarkdown(){
        var content = document.querySelector('.md-content')
        if(!content) {
            return
        }
        document.querySelector('.md-target').innerHTML = marked(content.innerHTML)
        content.remove()
    }

    function start(){
        console.log('starting app')
        seedRevisions()
        handleRevisionChange()
        ping()
        connectToNotifications()
        loadAssets(revisions[0].revision)
        bindForms()
        compileMarkdown()
    }


    return {
        start: start
        ,toggleDetails: toggleDetails
    }
})()

