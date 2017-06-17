// load dependencies
var express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var siofu = require("socketio-file-upload");
var expressHandlebars = require("express-handlebars");
var Handlebars = require('handlebars');
var axios = require('axios');
var config = require('config');
var ua = require('universal-analytics');

var googleAnalyticsId = config.get('AnalyticsConfig.googleId');
var hostedContentPath = config.get('Database.PublishUploadPath');

// set port
var PORT = 3000;
// initialize express app
var app = express();
//require our models for syncing
var db = require("./models");

// make express look in the public directory for assets (css/js/img)
app.use(express.static(__dirname + '/public'));

// configure express app
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(siofu.router);

// configure handlebars & register it with Express app
var hbs = expressHandlebars.create({
	defaultLayout: 'main',  // sets the default layout
	handlebars: Handlebars, // includes basic handlebars for access to that library
	helpers: {  // define any extra helpers you may need
		googleAnalytics: function(){
			var googleApiKey = config.get('AnalyticsConfig.googleId')
			return new Handlebars.SafeString(`<script>
				(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
				(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
				m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
				})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');
				ga('create', '${googleApiKey}', 'auto');
				ga('send', 'pageview');
			</script>`);
		}
	}
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');

// require express routes
require("./routes/api-routes.js")(app);
require("./routes/show-routes.js")(app, ua, googleAnalyticsId);
require("./routes/serve-routes.js")(app, ua, googleAnalyticsId);
require("./routes/home-routes.js")(app);

// require socket.io routes
var http = require("./routes/sockets-routes.js")(app, siofu, hostedContentPath, ua, googleAnalyticsId);

// sync sequelize
// wrap the server in socket.io to intercept incoming sockets requests
// start server
db.sequelize.sync({})
.then(function(){
	http.listen(PORT, function() {
		console.log("Listening on PORT " + PORT);
	});
});

