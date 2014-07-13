/**
 * Module dependencies.
 * Karim Fanadka - Glass mirror server
 */

var express = require('express')
    , http = require('http')
    , googleapis = require('googleapis')
    , OAuth2Client = googleapis.OAuth2Client;

// Use environment variables to configure oauth client.
// That way, you never need to ship these values, or worry
// about accidentally committing them
var oauth2Client = new OAuth2Client(process.env.MIRROR_DEMO_CLIENT_ID,
    process.env.MIRROR_DEMO_CLIENT_SECRET, process.env.MIRROR_DEMO_REDIRECT_URL);

var app = express();

var io = require('socket.io');
var socket = io.listen(app);

// all environments
app.set('port', 8081);
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.configure(function(){
  app.use(express.static(__dirname + '/client'));
});

app.get('/glass', function (req, res)
{
    res.sendfile(__dirname + '/client/index.html');
});

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

var success = function (data) {
    console.log('success', data);
};
var failure = function (data) {
    console.log('failure', data); 
};

var gotToken = function (action, message) {
    googleapis
        .discover('mirror', 'v1')
        .execute(function (err, client) {
            if (!!err) {
                failure();
                return;
            }
		    

			console.log('mirror client', client);
			console.log('**********************************************************************');
			console.log('mirror client Auth object:', oauth2Client.credentials.access_token);
			console.log('**********************************************************************');
			switch (action) {
				case "listTimeline":
					listTimeline(client, failure, success);
					break;
				case "insertCard":
					insertCard(message, client, failure, success);
                    insertSubscription(client, failure, success);
					break;
				case "insertContact":
					insertContact(client, failure, success);
					break;
				case "insertLocation":
					insertLocation(message, client, failure, success);
					break;
}

            //console.log('mirror client', client);
            //listTimeline(client, failure, success);
            //insertHello(client, failure, success);
            //insertContact(client, failure, success);
            //insertLocation(client, failure, success);
        });
};


// send a simple 'hello world' timeline card with a delete option
var insertCard = function (message, client, errorCallback, successCallback) {
    client
        .mirror.timeline.insert(
        {
            "text": message,
            "callbackUrl": "https://mirrornotifications.appspot.com/forward?url=http://localhost:8081/reply",
            "menuItems": [
                {"action": "REPLY"},
                {"action": "DELETE"}
            ]
        }
    )
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};

// send a simple 'hello world' timeline card with a delete option
var insertLocation = function (message, client, errorCallback, successCallback) {
    client
        .mirror.timeline.insert(
        {
            "text": message.text,
            "callbackUrl": "https://mirrornotifications.appspot.com/forward?url=http://localhost:8081/reply",
            "location": {
                "kind": "mirror#location",
                "latitude": message.latitude,
                "longitude": message.longitude,
                "displayName": message.displayName,
                "address": message.address
            },
            "menuItems": [
                {"action":"NAVIGATE"},
                {"action": "REPLY"},
                {"action": "DELETE"}
            ]
        }
    )
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};


var insertContact = function (client, errorCallback, successCallback) {
    client
        .mirror.contacts.insert(
        {
            "id": "emil10001",
            "displayName": "emil10001",
            "iconUrl": "https://secure.gravatar.com/avatar/bc6e3312f288a4d00ba25500a2c8f6d9.png",
            "priority": 7,
            "acceptCommands": [
                {"type": "REPLY"},
                {"type": "POST_AN_UPDATE"},
                {"type": "TAKE_A_NOTE"}
            ]
        }
    )
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};
var listTimeline = function (client, errorCallback, successCallback) {
    client
        .mirror.timeline.list()
        .withAuthClient(oauth2Client)
        .execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
};
var grabToken = function (code, errorCallback, successCallback) {
    oauth2Client.getToken(code, function (err, tokens) {
        if (!!err) {
            errorCallback(err);
        } else {
            console.log('tokens', tokens);
            oauth2Client.credentials = tokens;
            successCallback();
        }
    });
};

app.get('/oauth2callback', function (req, res) {
    // if we're able to grab the token, redirect the user back to the main page
	console.log('*** ***: auth check!');
    grabToken(req.query.code, failure, function () {
        res.redirect('/index.html'); 
    });
});

app.get('/', function(req, res) {
	    if (!oauth2Client.credentials) {
		
        // generates a url that allows offline access and asks permissions
        // for Mirror API scope.
        var url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/glass.timeline'
        });
		
		res.redirect(url);
		} else {
			
		}
		res.send('Message: ' + 'Authenticated');
		res.end();
	
});

app.get('/insertCard', function(req, res) {
			console.log('*** ***: ' + req.query['message']);
			gotToken('insertCard', req.query['message']);

});

app.post('/insertLocation', function(req, res) {
				
		console.log(req.body); 
		gotToken('insertLocation', req.body);
		

	
});


// ************************************************************ Callback ******************************************************

var insertSubscription = function (client, errorCallback, successCallback) {
    client.mirror.subscriptions.insert({
        "callbackUrl":"https://mirrornotifications.appspot.com/forward?url=http://kim0z.me/notification",
        "collection":"timeline",
        "userToken":"001",
        "verifyToken":"secret",
        "operation":["INSERT"]
        }).withAuthClient(oauth2Client).execute(function (err, data) {
            if (!!err)
                errorCallback(err);
            else
                successCallback(data);
        });
    };
/*
    var subscription = require('mirror-api-subscription')(
    function () {
    })

    subscription.on('locations#UPDATE',
    function (notification, user, payload) {
      console.log('location of user %s updated', user.id)
    })

    subscription.on('timeline#INSERT:LAUNCH',
    function (notification, user, payload) {
      console.log('subscription timeline#INSERT:LAUNCH')
    })

    subscription.on('timeline#UPDATE:CUSTOM',
    function (notification, user, payload) {
        console.log('subscription timeline#UPDATE:CUSTOM')
    })

    app.post('/notification', subscription.dispatcher())
*/

app.post('/notification', function(req, res){
    var output = '';
for (var property in res) {
  output += property + ': ' + object[property]+'; ';
}
console.log(output);

    console.log('OOoooo000oooo0oo0oooooo00000ooooooo0000000oooooo000000oooooo000000oooo000');
    res.end();
});

//****************************************************** Callback ******************************************************

app.post('/reply', function(req, res){
    console.log('replied',req);
    res.end();
});
app.post('/location', function(req, res){
    console.log('location',req);
    res.end();
});

http.createServer(app).listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
