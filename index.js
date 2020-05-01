
function jiffyMultiServer(httpServer, options = null) {
	this.httpServer = httpServer;
	this.options = options;
	//format object = protocol + path : {'path' : string, 'options': Object, 'f': function}
	this.listServicesWS = {};
	//initializing server
	this.io = require('socket.io')(this.httpServer);
	//same structure as options, you can pass an options object plus a callabck or only the callback
	this.get = function (path, ...args) {
		this.httpServer.get(path, ...args);
		var options = {};
		var f = args[0];
		if(args.length > 1) { 
			options =  args[0]; 
			f = args[1]; 
		}
		if(options.ioDisable != true) {
			var paramsPath = [];
			if(path.indexOf(':') !== -1) {
				var resultPathParse = this.parsePathForWS(path);
				path = resultPathParse.pathRegex;
				paramsPath = resultPathParse.params;
			}
		listServicesWS['get/' + path] = {'path': path, 'options': options, 'f': f, 'params': paramsPath};
		}
	}
	this.post = function (path, ...args) {
		this.httpServer.post(path, ...args);
		var options = {};
		var f = args[0];
		if(args.length > 1) { 
			options =  args[0]; 
			f = args[1]; 
		}
		if(options.ioDisable != true) {
			var paramsPath = [];
			if(path.indexOf(':') !== -1) {
				var resultPathParse = this.parsePathForWS(path);
				path = resultPathParse.pathRegex;
				paramsPath = resultPathParse.params;
			}
			listServicesWS['post/' + path] = {'path': path, 'options': options, 'f': f, 'params': paramsPath};
		}
	}	
	this.listen  = function (port, ...args) {
		var cb = args[0];
		if(args.length > 1) {
			cb = args[1];
		}
		this.httpServer.listen(port, ...args);	
			io.on('connection', (socket) => {
					socket.on("req", (o) => {
						var requestParam = o.reqPathServer.path;
						var timestamp = o.reqPathServer.timestamp;
						//client can send the path to execute in 2 different parameters name, just in case the client is sending that param name in the request
						//timestamp is sent back so client can diferentiate the callback to be used when the answer arrives, in case that the endpoint is called twice 
						if(o.reqPathServer99 != null && o.reqPathServer99 != undefined && o.reqPathServer99 != '') {
							requestParam = o.reqPathServer99.path;							
							timestamp = o.reqPathServer99.timestamp;
						}
						var responseObj = {};
						//parsing path & parameters
						var keyService = '';
						Object.keys(this.listServicesWS).forEach(k => {
							if(requestParam.match(k) != null){
								keyService = k;
							}
						});
						if(keyService === '') {
							socket.emit('res', {code: 404});
						} else {
							if(this.listServicesWS[keyService].params.length > 0) {
							var arrayValuesParams = new RegExp(this.listServicesWS[keyService].path, 'ig').exec(requestParam).splice(1,1);
								for(var i=0; i < arrayValuesParams.length; i++){
									responseObj.params[this.listServicesWS[keyService].params[i]] = arrayValuesParams[i];							
								}
							} else {
								responseObj.params = null;
							}
							responseObj.originalUrl = requestParam.replace(/(get\/|post\/)/i, "");
							responseObj.method = requestParam.substr(0, 2).toUpperCase();						
							switch(responseObj.method) {
								case 'POST':
									responseObj.body = o;
								break;
								case 'GET':
									responseObj.query = o;								
								break;
							}
							// we create a new object instance, with the socket as member variable and the replication of the response function for compatibility
							// in this way, when the refer to "this" in the response function, we get the socket of this request
							var resObj = Object.assign({}, {"socket": socket, method: requestParam.substr(0, 2), "send": this.response, "json": this.response, "timestamp": timestamp, "path": requestParam, type: this.setType});
							this.listServicesWS[k].f(responseObj, resObj);
						}
					});				
			});				
	}
	this.parsePathForWS = function(path) {
		var r = {pathRegex: '', params: []};
		r.params = path.match(new RegExp("\:[a-zA-Z0-9_-]+", 'ig'));
		r.pathRegex = path.replace(/\:[a-zA-Z0-9_-]+/ig, '[a-zA-Z0-9_-]+').replace("/", "\/");
		return r;
	}
	this.response = function (data, type = null){
		this.socket.emit("res", {"path": this.path, "method": this.method, "timestamp": this.timestamp, "data": data, "type": (type || this.typeVal)});
	}
	this.setType = function (type) {
		this.typeVal = type;
		return this;
	}
}

module.exports = jiffyMultiServer
