var url = require('url')
    ,hatchery = require('halibut')

var Halibut =  hatchery.spawn({
    request: function(){
        throw new Error('not used')
    }
    ,Promise: require('bluebird')
})


module.exports = function(server, notifier,  namespace) {
    //database
    var org = new Organization(1)

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


    //models
    function Organization(rev,from){
        this.name = 'JEDRAACK'
        this.revision = rev + ''
        this.revisions = from ? from.revisions.concat(this) : [this]
        this.assets = new Assets(this,from)
    }
    Organization.prototype.hosted = function(request){
        var pathname =  '/organizations/' + this.revision
        if(request) {
            return hosted(request,pathname)
        }
        return pathname
    }
    Organization.prototype.revise = function(){
        var current = this.current()
        var newHigh = new Organization(current.revision + 1,this.revisions)

        var orgs = this.revisions.map(function(org){
            return parseInt(org.revision,10)
        })
        var max = Math.max(orgs)
        var high = max + 1
    }
    Organization.prototype.revision = function(rev) {
        return this.revisions.filter(function(org){
            return org.revision = rev
        })[0]
    }
    Organization.prototype.current = function(){
        var orgs = this.revisions.map(function(org){
            return parseInt(org.revision,10)
        })
        var max = Math.max(orgs)
        return this.revision(max)
    }
    Object.defineProperty(Organizations,'revise',{
        value: function(){
            var keys = Object.keys(Organizations).map(function(key){ return parseInt(key,10)})
            var max = Math.max(keys)
            var high = max + 1
            var newOrg = Organizations(high,Organizations[max + ''])
            Organizations[high] = newOrg
            notifier.emit('organizationRevised',newOrg)
            return newOrg
        }
        ,enumerable: false
    })

    function Assets(organization,from) {
        this.org = organization
        this.assets = (from && from.assets || {})
        for(var i = 1; i < 1001; i++) {
            this.assets[i + ''] = new Asset(i)
        }
    }
    Assets.prototype.findByUrl = function(request, assetUrl) {
        for(var k in this.assets) {
            var ass = this.assets[k]
            if(ass.hosted(request) === assetUrl) {
                return ass
            }
        }
        throw new Error('cannot locate ' + assetUrl)

    }
    Assets.prototype.hosted = function(request) {
        var pathname = this.org.hosted(request) + '/assets'
        if(request) {
            return hosted(request,pathname)
        }
        return pathname
    }
    Assets.prototype.createCatalog = function(request){
        var cat = {
            catalog: {}
        }
        Object.keys(this.assets).reduce(function(it,key){
            var ass = this.assets[key]
            var tuple = {
                name: ass.name
                ,description: ass.description
            }
            var assetUrl = ass.hosted(request)
            it[assetUrl] = tuple
            return it
        },cat.catalog)
        return cat
    }

    function Asset(id, assets) {
        this.id = id + ''
        this.name = 'asset numero ' + i
        this.description = '[' + i + '] is described'
        this.lastSeen = new Date().toUTCString()
        this.assets = assets
    }
    Asset.prototype.hosted = function(request){
        var pathname  = this.assets.hosted(request) + '/' + this.id
        if(request) {
            return hosted(request,pathname)
        }
        return pathname
    }


    Organizations['1'] = new Organization(1)



    //routes
    server.route({
        path: namespace + '/organizations/{revision}'
        ,method: 'GET'
        ,handler: function(request, reply) {
            var org = Organizations[request.params.revision]
            var hald = Halibut.parse({
                self: hosted(request,'/organizations/' + org.revision)
                ,body: {
                    _links: {
                        revisions: { href: hosted(request,'/revisions')}
                        ,assets: { href: hosted(request,'/assets')}
                    }
                    ,name: org.name
                    ,revision: org.revision
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
        path: namespace + '/organizations/{revision}/assets'
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
        path: namespace + '/organizations/{revision}/assets'
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
        path: namespace + '/organizations/{revision}/assets/{id}'
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
