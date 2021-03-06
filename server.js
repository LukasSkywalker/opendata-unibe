var express = require("express");
var app = express();
var port = process.env.PORT || 3700;
var io = require('socket.io').listen(app.listen(port));
var Instagram = require('instagram-node-lib');
var http = require('http');
var request = ('request');
var intervalID;
var subId;
var measuringHour = new Date().getHours();
var counter = 0;
var API_LIMIT = 10;

/**
 * Set the paths for your files
 * @type {[string]}
 */
var pub = __dirname + '/public',
    view = __dirname + '/views';

/**
 * Set the 'client ID' and the 'client secret' to use on Instagram
 * @type {String}
 */
var clientID = 'c842735be89349b29e0d343d97a0988e',
    clientSecret = 'aea33ae88f144953862804fec975b807';

/**
 * Set the configuration
 */
Instagram.set('client_id', clientID);
Instagram.set('client_secret', clientSecret);
Instagram.set('callback_url', 'http://opendata-unibe.herokuapp.com/callback');
Instagram.set('redirect_uri', 'http://opendata-unibe.herokuapp.com');
Instagram.set('maxSockets', 10);

/**
 * Uses the library "instagram-node-lib" to Subscribe to the Instagram API Real Time
 * with the tag "hashtag" lollapalooza
 * @type {String}
 */
/*Instagram.subscriptions.subscribe({
  object: 'tag',
  object_id: 'nofilter',
  aspect: 'media',
  callback_url: 'http://opendata-unibe.herokuapp.com/callback',
  type: 'subscription',
  id: '#'
});*/
var subscription = Instagram.tags.subscribe(
	{ object_id: 'nofilter',
	callback_url: 'http://opendata-unibe.herokuapp.com/callback'
});
subId = subscription.id;
console.log(subId);

// if you want to unsubscribe to any hashtag you subscribe
// just need to pass the ID Instagram send as response to you
//Instagram.subscriptions.unsubscribe({ id: '3668016' });

// https://devcenter.heroku.com/articles/using-socket-io-with-node-js-on-heroku
io.configure(function () { 
  io.set("transports", ["xhr-polling"]); 
  io.set("polling duration", 10); 
});

/**
 * Set your app main configuration
 */
app.configure(function(){
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(pub));
    app.use(express.static(view));
    app.use(express.errorHandler());
});
app.set('view engine', 'ejs');
app.engine('html', require('ejs').__express);

/**
 * Render your index/view "my choice was not use jade"
 */
app.get("/views", function(req, res) {
	console.log(req.query.tag);
    res.render("index.html");
});

// check subscriptions
// https://api.instagram.com/v1/subscriptions?client_secret=YOUR_CLIENT_ID&client_id=YOUR_CLIENT_SECRET

/**
 * On socket.io connection we get the most recent posts
 * and send to the client side via socket.emit
 */
io.sockets.on('connection', function (socket) {
  Instagram.tags.recent({ 
      name: 'nofilter',
      complete: function(data) {
        socket.emit('firstShow', { firstShow: data });
      }
  });
});

/**
 * Needed to receive the handshake
 */
app.get('/callback', function(req, res){
	console.log('callback received');
    Instagram.subscriptions.handshake(req, res);
});

app.get('/stop', function(req, res) {
	console.log('stopping');
	unsubscribe();
})

/**
 * for each new post Instagram send us the data
 */
app.post('/callback', function(req, res) {
	ct = incrementCounter();
	if(ct > API_LIMIT) {
		console.log('API limit reached, unsubscribed');
		unsubscribe();
	}
    var data = req.body;
	console.log('response received');

    // Grab the hashtag "tag.object_id"
    // concatenate to the url and send as a argument to the client side
    data.forEach(function(tag) {
      var url = 'https://api.instagram.com/v1/tags/' + tag.object_id + '/media/recent?client_id=c842735be89349b29e0d343d97a0988e';
      sendMessage(url);

    });
    res.end();
});

/**
 * Send the url with the hashtag to the client side
 * to do the ajax call based on the url
 * @param  {[string]} url [the url as string with the hashtag]
 */
function sendMessage(url) {
  io.sockets.emit('show', { show: url });
}

function incrementCounter(time) {
	var h = new Date().getHours();
	console.log('Counter is ' + counter);
	if( h == measuringHour ) {
		counter++;
	} else {
		measuringHour = h;
		counter = 1;
	}
	return counter;
}

function unsubscribe() {
	Instagram.tags.unsubscribe_all();
}

console.log("Listening on port " + port);

