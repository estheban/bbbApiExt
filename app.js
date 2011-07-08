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
  app.set('view engine', 'ejs');
  app.set('view options', { layout: false });
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

// DB Configuration
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/bbbApiExt');

// Model Definition
var Schema = mongoose.Schema;

var CustomerModel = new Schema({
    clientId: String,
    securitySalt: String
});
var Customer = mongoose.model('Customers',CustomerModel);

var MeetingModel = new Schema({
    clientId: String,
    meetingId: String
});
var Meeting = mongoose.model('Meetings',MeetingModel);

// BBB Server configuration
var bbb = require('bbb');
bbb.securitySalt = "57e120a999816bdb5938dc7e80f15aec"; // TODO: Specify the BBB sercuritySalt
bbb.url          = "bbb.evocatio.net"; // TODO: Specify the Address of the server (hostname or IP)

// Routes
app.get('/:clientId/api/:cmd', function(req, res) {
    //console.log(req.params.clientId);
    console.log(req.params);
    console.log(req.query);

    // get client securitySalt from db
    console.log("FindOne Customer");
    Customer.findOne({ clientId: req.params.clientId}, function (err, customer){
      console.log(customer);
      console.log(err);
      if(customer == null) {
          res.contentType("text/xml");
          res.send("<response><returncode>FAILED</returncode><messageKey>checksumError</messageKey><message>You did not pass the checksum security check</message></response>");
      } else {
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
            }

            console.log("Server : securitySalt: "+bbb.securitySalt);
            console.log("command: "+req.params.cmd);
            console.log("params: "+params);
            console.log("Supplied checksum: "+checksum);
            console.log("Computed checksum: "+bbb.checksum(customer.securitySalt, req.params.cmd, params));

            // validate query string
            if(checksum == bbb.checksum(customer.securitySalt, req.params.cmd, params)) {
                console.log("== Checksum validated");
                console.log("== Command : "+req.params.cmd);

                switch(req.params.cmd) {
                    case "join":
                        var queryString = bbb.generateQueryString("bigbluebutton", bbb.securitySalt, req.params.cmd, params);

                        res.writeHead(302, {
                          'Location': 'http://'+bbb.url+queryString
                        });
                        res.end();
                        break;
                        
                    case "create":
                        console.log("======== CREATE ===========");
                        /*var meeting = new Meeting();
                        meeting.clientId = customer.clientId;
                        meeting.meetingId = req.query.meetingID;
                        meeting.save(function(err) {});
                        
                        */
                       if(!customer.meetings) {
                           customer.meetings = Array();
                       }
                       
                       bbb.query(req.params.cmd, params, function(data) {
                           console.log("DATA:"); console.log(data);
                           customer.meetings.push(data);
                           
                           res.contentType("text/xml");
                           var json2xml = require('json2xml');
                           res.send(json2xml.toXml("response", data));
                           
                           /*
                           console.log("create :: CUSTOMER MEETINGS");
                           console.log(customer.meetings);
                           */
                       });
                       break;
                       
                    default:
                        Meeting.find({ clientId: req.params.clientId}, function (err, meetings){
                            bbb.query(req.params.cmd, params, function(data) {
                                console.log("DATA:"); console.log(data);
                                
                                // ERROR if only one meeting, need to transform meetings to array
                                if (!data.meetings) {
                                    data = {
                                      returncode: data.returncode,
                                      meetings: { meeting: [ data ] }
                                    }
                                }
                                
                                
                                for(meeting in data.meetings.meeting) {
                                    console.log(meeting);
                                }
                                
                                res.contentType("text/xml");
                                var json2xml = require('json2xml');

                                res.send(json2xml.toXml("response", data));
                            });
                        });
                        
                        break;
                }
            } else {
                // Throw Error
                res.contentType("text/xml");
                res.send("<response><returncode>FAILED</returncode><messageKey>checksumError</messageKey><message>You did not pass the checksum security check</message></response>");
            }
        }
    });
});

app.get('/admin', function(req, res) {
    console.log(req.params);
    console.log(req.query);
    
    Customer.find({}, function (err, customers){
      console.log(customers);
      console.log(err);
      /*
      Meeting.find({}, function (err, meetings){
          console.log(meetings);
          console.log(err);
          res.render("index",{users: customers, meetings: meetings});
        });
      */
      res.render("index",{users: customers});
    });
    
    
});

app.get('/admin/add', function(req, res) {
   res.render("add"); 
});

app.post('/admin/add', function(req, res) {
    console.log("ADD");
    console.log(req.body.user);
    
    var customer = new Customer();
    customer.clientId = req.body.user.clientId;
    customer.securitySalt = req.body.user.securitySalt;
    customer.save(function(err) {
        res.redirect('/admin');
    });
});

app.get('/admin/delete/:id', function(req, res) {
    console.log("DELETE");
    console.log(req.params);

    Customer.remove({ _id: req.params.id}, function (err){
        if(err != null)
            console.log(err);

        res.redirect('/admin');
    });
});

app.listen(3000);
console.log("bbbApiExt server listening on port %d", app.address().port);