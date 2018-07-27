var m5k = require('./m5k.js');
var PNGImage = require('pngjs-image');
var fs = require('fs');

// Test
var myFile = new m5k.readM5k('debug/tentacle_chicken.m5k');
//var myFile = new m5k.readM5k('debug/loadscreen.m5k');
//var myFile = new m5k.readM5k('debug/firehydrant.m5k');

/*PNGImage.readImage('debug/trex_new.png', function (err, image) {
    if (err) throw err;
 
    myFile.replaceTEXSWithPng(image);

    var newFile = myFile.serialize();
	fs.writeFileSync('trex2.m5k', newFile);
});*/