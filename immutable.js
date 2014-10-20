var url = require('url')
    ,hatchery = require('halibut')

var Halibut =  hatchery.spawn({
    request: function(){
        throw new Error('not used')
    }
    ,Promise: require('bluebird')
})


module.exports = function(server, notifier,  namespace) {

    //models
    var Organization = {
        name: 'JEDRAACK'
        ,revision: '1'
        ,revisions: ['1']
    }

    var Assets = {}
    for(var i = 1; i < 11; i++) {
        Assets[i + ''] = {
            id: i
            ,lastSeen: new Date().toUTCString()
            ,name: 'asset numero ' + i
            ,description: '[' + i + '] is described thusly - ' + i
        }
    }
    Object.defineProperty(Assets,'findByUrl',{
        value: function(request, assetUrl){
            for(var k in Assets) {
                var ass = Assets[k]
                if(hosted(request,'/assets/' + ass.id) === assetUrl) {
                    return ass
                }
            }
            throw new Error('cannot locate ' + assetUrl)
        }
        ,enumerable: false
    })

    function createCatalog(request){
        var cat = {
            catalog: {}
        }
        Object.keys(Assets).reduce(function(it,key){
            var ass = Assets[key]
            var tuple = {
                name: ass.name
                ,description: ass.description
            }
            var assetUrl = hosted(request,'/assets/' + ass.id)
            it[assetUrl] = tuple
            return it
        },cat.catalog)
        return cat
    }

    function hosted(request,pathname) {
        var host = request.headers['host']
        if(host) {
            var parsed = url.parse(host)
            parsed.host = host
            parsed.pathname = pathname
            parsed.protocol = 'http'
            return url.format(parsed)
        }
        return path
    }


    //routes
    server.route({
        path: namespace + '/organizations/{id}'
        ,method: 'GET'
        ,handler: function(request, reply) {
            var hald = Halibut.parse({
                self: hosted(request,'/organizations/' + request.params.id)
                ,body: {
                    _links: {
                        revisions: { href: '/revisions'}
                    }
                    ,name: Organization.name
                    ,revision: Organization.revision
                }
            })
            return reply(hald.serialize())
        }
    })

    server.route({
        path: namespace + '/revisions'
        ,method: 'GET'
        ,handler: function(request, reply) {
            var hald = Halibut.parse({
                self: hosted(request,'/revisions')
                ,body: {
                    revisions: Organization.revisions
                }
            })
            return reply(hald.serialize())
        }
    })

    server.route({
        path: namespace + '/assets'
        ,method: 'GET'
        ,handler: function(request, reply) {
            var hald = Halibut.parse({
                self: hosted(request,'/assets')
                ,body: createCatalog(request)
            })
            return reply(hald.serialize())
        }
    })

    server.route({
        path: namespace + '/assets'
        ,method: 'PATCH'
        ,handler: function(request,reply) {
            var data = (request.payload || {}).catalog || {}
            var cat = createCatalog(request)
            Object.keys(data).forEach(function(key){
                var tuple = data[key]
                var ass = Assets.findByUrl(request,key)
                console.log('PATCHING asset',ass.id,'with url',key,'using tuple',tuple)
                ass.name = tuple.name
                ass.description = tuple.description
            })
            return reply({}).code(204)
        }
    })

    server.route({
        path: namespace + '/assets/{id}'
        ,method: 'GET'
        ,handler: function(request,reply) {
            var ass = Assets[request.params.id]
            var hald = Halibut.parse({
                self: hosted(request,'/assets/' + ass.id)
                ,body: {
                    _links: {
                        banners: {
                            href: hosted(request,'/banners/asset' + ass.id)
                        }
                    }
                    ,lastSeen: ass.lastSeen
                }
            })
            return reply(hald.serialize())
        }

    })
    return server
}
