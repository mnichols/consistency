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
    var organization = new Organization(1)

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
        this.revisions = from ? from.revisions.unshift(this) : [this]
        this.assets = new Assets(this,from && from.assets)
        this.isSealed = false
    }
    Organization.prototype.hosted = function(request){
        var pathname =  '/organizations/' + this.revision
        if(request) {
            return hosted(request,pathname)
        }
        return pathname
    }
    Organization.prototype.revise = function(){
        //revising an org should
        //* carry forward assets into new org
        //* seal previous rev from state changes
        var current = this.current()
        var newHigh = new Organization(current.revision + 1,current)
        this.revisions.forEach(function(it){
            // it.revisions.unshift(newHigh)
        })
        notifier.emit('organizationRevised',newHigh.revision)
        return newHigh
    }
    Organization.prototype.at = function(rev) {
        return this.revisions.filter(function(org){
            return org.revision = rev
        })[0]
    }
    Organization.prototype.current = function(){
        var orgs = this.revisions.map(function(org){
            return parseInt(org.revision,10)
        },this)
        var max = Math.max(orgs)
        return this.at(max)
    }
    Organization.prototype.readOnly = function(){
        this.isSealed = true
        this.assets.readOnly()
        return this
    }

    function Assets(organization,assets) {
        this.org = organization
        this.assets = assets || {}
        if(!assets) {
            for(var i = 1; i < 1001; i++) {
                this.assets[i + ''] = new Asset(i,this)
            }
        }
    }
    Assets.prototype.readOnly = function(){
        for(var k in this.assets) {
            this.assets[k].readOnly()
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
    Assets.prototype.findById = function(id) {
        return this.assets[id]
    }
    Assets.prototype.hosted = function(request) {
        return this.org.hosted(request)  + '/assets'
    }
    Assets.prototype.createCatalog = function(request){
        var cat = {
            catalog: {}
        }
        Object.keys(this.assets).reduce(function(it,key){
            var ass = this.assets[key]
            if(!ass) {
                console.error('cannot find ' + key)
            }
            var tuple = {
                name: ass.name
                ,description: ass.description
            }
            var assetUrl = ass.hosted(request)
            it[assetUrl] = tuple
            return it
        }.bind(this),cat.catalog)
        return cat
    }

    function Asset(id, assets) {
        this.id = id + ''
        this.name = 'asset numero ' + id
        this.description = '[' + id + '] is described'
        this.lastSeen = new Date().toUTCString()
        this.assets = assets
        this.isSealed = false
    }
    Asset.prototype.hosted = function(request){
        return  this.assets.hosted(request) + '/' + this.id
    }
    Asset.prototype.assertWritable = function(){
        if(this.isSealed) {
            throw new Error('asset ' + this.id + ' is sealed')
        }
        return true
    }
    Asset.prototype.rename = function(name) {
        this.assertWritable()
        this.name = name
    }
    Asset.prototype.lastSeen = function() {
        this.assertWritable()
        this.lastSeen = new Date().toUTCString()
    }
    Asset.prototype.describe = function(description){
        this.assertWritable()
        this.description = description
    }
    Asset.prototype.readOnly = function(){

        this.isSealed = true
    }


    //routes
    server.route({
        path: namespace + '/organizations/{revision}'
        ,method: 'GET'
        ,handler: function(request, reply) {
            var org = organization.at(request.params.revision)
            var hald = Halibut.parse({
                self: org.hosted(request)
                ,body: {
                    _links: {
                        revisions: { href: hosted(request,'/revisions')}
                        ,assets: { href: org.assets(hosted(request))}
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
            var org = organization.at(request.params.revision)
            var hald = Halibut.parse({
                self: hosted(request,'/revisions')
                ,body: {
                    revisions: org.revisions.map(function(its){
                        return its.revision
                    })
                }
            })
            return reply(hald.serialize())
        }
    })

    server.route({
        path: namespace + '/organizations/{revision}/assets'
        ,method: 'GET'
        ,handler: function(request, reply) {
            var org = organization.at(request.params.revision)
            var hald = Halibut.parse({
                self: org.assets.hosted(request)
                ,body: org.assets.createCatalog(request)
            })
            return reply(hald.serialize())
        }
    })

    server.route({
        path: namespace + '/organizations/{revision}/assets'
        ,method: 'PATCH'
        ,handler: function(request,reply) {
            var org = organization.at(request.params.revision)
            var data = (request.payload || {}).catalog || {}
            Object.keys(data).forEach(function(key){
                var tuple = data[key]
                console.log('finding',key)
                var ass = org.assets.findByUrl(request,key)
                console.log('PATCHING asset',ass.id,'with url',key,'using tuple',tuple)
                ass.rename(tuple.name)
                ass.describe(tuple.description)
            })
            org.revise()
            return reply({}).code(204)
        }
    })

    server.route({
        path: namespace + '/organizations/{revision}/assets/{id}'
        ,method: 'GET'
        ,handler: function(request,reply) {
            var org = organization.at(request.params.revision)
            var ass = org.assets.findById(request.params.id)
            var hald = Halibut.parse({
                self: ass.hosted(request)
                ,body: {
                    _links: {
                    }
                    ,lastSeen: ass.lastSeen
                }
            })
            return reply(hald.serialize())
        }

    })
    return server
}
