var publishController = require('../controllers/publishController.js');

module.exports = function(app, siofu, hostedContentPath, ua, googleAnalyticsId) {
	var http = require('http').Server(app);
	var io = require('socket.io')(http);
	
	io.on('connection', function(socket){
		console.log('a user connected via sockets');
		// create visitor record
		var visitor = ua(googleAnalyticsId, {https: true});
		// attach upload listeners
		var uploader = new siofu();
		uploader.dir = hostedContentPath;
		uploader.listen(socket);
		uploader.on("start", function(event){
			// server side test to make sure file is not a bad file type
			if (/\.exe$/.test(event.file.name)) {
				uploader.abort(event.file.id, socket);
			}
		});
		uploader.on("error", function(event){
			console.log("an error occured while uploading", event.error);
			socket.emit("publish-status", event.error)
		});
		uploader.on("saved", function(event){
			console.log("uploaded ", event.file.name);
			if (event.file.success){
				socket.emit("publish-status", "file upload successfully completed");
				publishController.publish(event.file.meta.name, event.file.name, event.file.pathName, event.file.meta.type, event.file.meta.license, event.file.meta.nsfw, socket, visitor)
			} else {
				socket.emit("publish-failure", "file uploaded, but with errors")
				// to-do: remove the file
			};
		});
		// handle disconnect
		socket.on('disconnect', function(){
			console.log('user disconnected');
		});
	});

	return http;
}