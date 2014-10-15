var App = (function(){

    var socket
        ,API_ENDPOINT = 'http://localhost:8000/api'
        ,IMMUTABLE_ENDPOINT = API_ENDPOINT + '/immutable'
        ,NOTIFICATIONS_ENDPOINT = 'http://localhost:8001/'
        ,revisions = []
        ,clientRevision
    ;
    function toggleDetails(e) {
        var details = document.querySelector('.md-target')
        details.classList.toggle('show')
        details.classList.toggle('hidden')
    }
    //notification handlers
    function handleRevisionChange(e) {
        var client = getClientRevision()
        var form = document.querySelector('form.update')
            ,button = form.querySelector('button')
        if(e) {
            console.log('NOTIFICATION','revisionChanged',e)
            revisions.unshift(e)
        }
        e = e || client
        form.querySelector('.current-revision').innerHTML = e.revision
        form.querySelector('.stale-revision').innerHTML = client.revision

        if(client.revision === e.revision) {
            form.classList.remove('bg-primary')
            form.classList.add('bg-info')
            return button.setAttribute('disabled','')
        } else {
            form.classList.add('bg-primary')
            form.classList.remove('bg-info')
            return button.removeAttribute('disabled')
        }

    }

    function getClientRevision() {
        return clientRevision || revisions[0]
    }

    function url(path,endpoint,revision) {
        endpoint = endpoint || IMMUTABLE_ENDPOINT
        return endpoint + path
    }
    function noop(){}

    function ping(cb) {
        cb = (cb || noop)
        httpinvoke(url('/ping',API_ENDPOINT),'GET',{
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
    function loadRevisions(cb){
        return httpinvoke(url('/org/revisions'),'GET',
                function(err, body, statusCode) {
                    var data = JSON.parse(body)
                    revisions = data.revisions
                    if(cb) {
                        return cb(err)
                    }
                })
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
            ,rev = getClientRevision()
        ;

        e.preventDefault()
        var data = new FormData(this)
        httpinvoke(url('/org/' + rev.revision + '/assets-catalog'),'PATCH',{
            input: data
            ,inputType: "formdata"
        },function(err) {
            form.reset()
        })
    }
    function patchNames(e) {
        var form = this
            ,rev = getClientRevision()
        e.preventDefault()
        var data = new FormData(this)
        console.log('data',data)
        httpinvoke(url('/org/' + rev.revision + '/assets-catalog'),'PATCH',{
            input: data
            ,inputType: "formdata"
        },function(err) {
            form.reset()
        })
    }

    function reload(e) {
        e.preventDefault()
        var lastKnown = getClientRevision()
        loadAssets(lastKnown.revision)
        handleRevisionChange(lastKnown)
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
        ping()
        connectToNotifications()
        bindForms()
        compileMarkdown()
        loadRevisions(function(err){
            if(err) {
                console.error(err)
            }
            handleRevisionChange(getClientRevision())
            loadAssets(getClientRevision().revision)
        })
    }


    return {
        start: start
        ,toggleDetails: toggleDetails
    }
})()
