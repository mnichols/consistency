var App = (function(){

    function noop(){}

    function ping(cb) {
        cb = (cb || noop)
        httpinvoke('http://localhost:3200/ping','GET',{
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
        console.log('assets',assets)
        for(var k in assets) {
            var ass = assets[k]
            assignAssetValue(ass)
        }
    }
    function loadAssets() {
        httpinvoke('http://localhost:3200/assets','GET',function(err,body,statusCode){
            var data = JSON.parse(body)
            return assignValues(data.assets)
        })
    }
    function bindForms() {
        var groupsForm = document.querySelector('.groups-form')
        var namesForm = document.querySelector('.names-form')
        groupsForm.addEventListener('submit',patchGroups)
        namesForm.addEventListener('submit',patchNames)
    }
    function start(){
        console.log('starting app')
        ping()
        loadAssets()
        bindForms()
    }


    function patchGroups(e){
        var form = this
        e.preventDefault()
        httpinvoke('http://localhost:3200/groups','PATCH',{
            input: new FormData(this)
        },function(err) {
            form.reset()
            loadAssets()
        })
    }
    function patchNames(e) {
        var form = this
        e.preventDefault()
        httpinvoke('http://localhost:3200/names','PATCH',{
            input: new FormData(this)
        },function(err) {
            form.reset()
            loadAssets()
        })
    }

    return {
        start: start
    }
})()

