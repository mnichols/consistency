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
        var groups = el.querySelector('.groups').innerHTML= asset.groups.join(',')
    }
    function assignValues(assets) {
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
    function start(){
        console.log('starting app')
        ping()
        loadAssets()

    }

    return {
        start: start
    }
})()

