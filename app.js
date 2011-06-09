/*!
 * bbbApiExt
 * Copyright(c) 2011 Etienne Lachance <et@etiennelachance.com>
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes
app.get('/:clientId/api/:cmd', function(req, res) {
    var bbb = require('bbb');
    bbb.securitySalt = ""; // TODO: Specify the BBB sercuritySalt
    bbb.url          = ""; // TODO: Specify the Address of the server (hostname or IP)

    //console.log(req.params.clientId);
    console.log(req.params);
    console.log(req.query);

    // get client securitySalt from db

    var checksum = req.query["checksum"];
    
    // generate queryString
    if(typeof req.query == "object") {
        // build params string
        var params = "";
        for(var key in req.query) {
            if(key != "checksum") {
                params += key+"="+escape(req.query[key])+"&";
            }
        }
        params = params.substring(0, params.length-1)
        // end build params string
    } else {
        var params = paramsObj;
    }
    
    console.log("securitySalt: "+bbb.securitySalt);
    console.log("command: "+req.params.cmd);
    console.log("params: "+params);
    console.log("checksum: "+checksum);
    console.log("checksum: "+bbb.checksum(bbb.securitySalt, req.params.cmd, params));
    
    // validate query string
    //if(true) {
    //    console.log("== Checksum validatation SKIPED, always accept, DEBUG ONLY");
    if(checksum == bbb.checksum(bbb.securitySalt, req.params.cmd, params)) {
        console.log("== Checksum validated");
        console.log("== Command : "+req.params.cmd);
        
        if(req.params.cmd == "join") {
            console.log("==> JOIN");
            console.log("====> bbb.url: "+bbb.url);
            //console.log("====> Method: "+req.method);
            console.log("====> URL: "+req.url);
            var queryString = bbb.generateQueryString("bigbluebutton", bbb.securitySalt, req.params.cmd, params);
            console.log("====> queryString: "+queryString);
 
            res.writeHead(302, {
              'Location': 'http://'+bbb.url+queryString
            });
            res.end();
        } else {
            bbb.query(req.params.cmd, params, function(xmlData) {
                res.contentType("text/xml");
                var json2xml = require('json2xml');

                res.send(json2xml.toXml("response", xmlData));
            });
        }
    } else {
        // Throw Error
        res.end();
    }
});
/*
app.get('/', function(req, res){
  res.render('index', {
    title: 'Express'
  });
});
*/
app.listen(3000);
console.log("bbbApiExt server listening on port %d", app.address().port);