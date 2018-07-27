const fs = require('fs');
const zlib = require('zlib');
const PNGImage = require('pngjs-image');

function niceBuff(thePayload) {
	this.contents = thePayload;
	this.pos = 0;
}

// Read a short
niceBuff.prototype.readShort = function() {
	var ret = this.contents.readUInt16LE(this.pos);
	this.pos += 2;

	return ret;
};

// Read a long
niceBuff.prototype.readLong = function() {
	var ret = this.contents.readUInt32LE(this.pos);
	this.pos += 4;

	return ret;
};

// Read a 4 character header
niceBuff.prototype.readHeader = function() {
	var ret = this.contents.toString('utf8', this.pos, this.pos + 4);

	this.pos += 4;

	return ret;
};

// Reads a string
niceBuff.prototype.readString = function() {
	var entrySize = this.readShort();
	var ret = this.contents.toString('utf8', this.pos, this.pos + entrySize);

	this.pos += entrySize;

	return ret;
};

// Reads a given number of bytes
niceBuff.prototype.readBytes = function(numBytes) {
	var ret = this.contents.slice(this.pos, this.pos + numBytes);
	this.pos += numBytes;

	return ret;
};

// Reads the remaining bytes that are left in the buffer
niceBuff.prototype.readRemainingBytes = function() {
	var ret = this.contents.slice(this.pos);
	this.pos += ret.length;

	return ret;
};

// Reads a string array
// Assume the following format:
// <long> number of entries
// *repeat for number of entries*
	// <string> the string itself (this.readString())
niceBuff.prototype.readStringArray = function() {
	var numEntries = this.readLong();

	var ret = [];

	for(var i=0; i<numEntries; ++i) {
		ret.push(this.readString());
	}

	return ret;
}

function readM5k(filename) {
	console.log('Reading ' + filename);

	this.filename = filename;
	this.contents = fs.readFileSync(filename);

	this.pos = 0;
	this.pos += 12;

	var totalSize = this.readLong();

	this.pos += 20;

	var startPos = this.pos;

	this.extractedHeaders = {};
	this.friendlyHeaders = {};

	while(this.pos < startPos + totalSize) {
		var headerName = this.readHeader();
		var headerLen = this.readLong();
		this.extractedHeaders[headerName] = this.readBytes(headerLen);

		console.log(headerName, headerLen);

		try {
			this.unpackHeader(headerName);
		} catch(e) {
			console.log('Had an exception unpacking ' + headerName);
			console.log(e);
			// throw e;
		}
	}

	console.log('');

	//console.log(extractedHeaders);
}

readM5k.prototype = Object.create(new niceBuff(null));

// Unpacks a given header
readM5k.prototype.unpackHeader = function(headerName) {
	switch(headerName) {
		case 'STRS':
			this.unpackSTRS();
		break;

		case 'NAMS':
			this.unpackNAMS();
		break;

		case 'TEXS':
			this.unpackTEXS();
		break;
	}
};

// Unpacks the STRS header
readM5k.prototype.unpackSTRS = function() {
	var theData = new niceBuff(this.extractedHeaders.STRS);

	// Read the total amount of data in here
	var allEntries = theData.readStringArray();

	this.friendlyHeaders.STRS = allEntries;

	console.log('STRS = ', allEntries);
};

// Unpacks the NAMS header
readM5k.prototype.unpackNAMS = function() {
	var theData = new niceBuff(this.extractedHeaders.NAMS);

	// Read the total amount of data in here
	var totalEntries = theData.readLong();

	var allEntries = [];
	for(var i=0; i<totalEntries; ++i) {
		var entryName = theData.readString();
		var entryOffset = theData.readLong();

		allEntries.push(
			[entryName, entryOffset]
		);
	}

	this.friendlyHeaders.NAMS = allEntries;

	console.log('NAMS = ', allEntries);
};

readM5k.prototype.serializeNAMS = function() {
	var toMerge = [];

	// Grab the NAMES header
	var NAMS = this.friendlyHeaders.NAMS;

	// Add the number of NAMS entries
	toMerge.push(longToBuff(NAMS.length));

	// Add each entry
	for(var i=0; i<NAMS.length; ++i) {
		var pair = NAMS[i];

		// Add header + offset info
		toMerge.push(stringToBuff(pair[0]));
		toMerge.push(longToBuff(pair[1]));
	}

	// Store the modified NAMS
	this.extractedHeaders.NAMS = Buffer.concat(toMerge);
};

// Unpack TEXS -- where the image data is stored
readM5k.prototype.unpackTEXS = function() {
	var TEXS = this.extractedHeaders.TEXS;
	var theData = new niceBuff(TEXS);

	var totalEntries = theData.readLong();

	var junkBuff = [];
	var theJunk = null;

	// Add the total entries since we dont know how to handle it yet
	junkBuff.push(longToBuff(totalEntries));

	// TODO: Make this more robust, it's dodgy AF right now:
	// Read until we hit 0xFFFF
	while((theJunk == null || theJunk != 65535) && theData.pos < TEXS.length) {
		theJunk = theData.readShort();
		junkBuff.push(shortToBuff(theJunk));
	}

	// We can now read stuff we care about
	junkBuff.push(longToBuff(theData.readLong()));

	// Image size
	var imageWidth = theData.readShort();
	var imageHeight = theData.readShort();

	// Compressed image data size
	var compressedImageSize = theData.readLong();

	// Read the compressed image data
	var compressedImageData = theData.readBytes(compressedImageSize);

	// Grab the remaining bytes (this might actually contain more images)
	var theFooter = theData.readRemainingBytes();

	// Decompress data
	var rawImageData = zlib.inflateSync(compressedImageData);

	// Convert to PNG
	var pngImage = rawImageToPng(imageWidth, imageHeight, rawImageData);

	// Store it
	this.friendlyHeaders.TEXS = {
		header: Buffer.concat(junkBuff),
		footer: theFooter,
		//imageWidth: imageWidth,
		//imageHeight: imageHeight,
		//compressedImageData: compressedImageData,
		pngImage: pngImage
	};

	var newFilename = this.filename + '.png';
	if(!fs.existsSync(newFilename)) {
		pngImage.writeImage(newFilename, function (err) {
	        if (err) throw err;
	        console.log('Done saving!', newFilename);
	    });
	}
};

// Attempts to replace a TEXS automatically
readM5k.prototype.tryReplaceTEXSAutomatic = function() {
	var _this = this;

	var newFilename = this.filename + '.png';
	if(fs.existsSync(newFilename)) {
		// Read in the PNG
		PNGImage.readImage(newFilename, function (err, image) {
		    if (err) throw err;
		 
		 	// Do the replace
		    _this.replaceTEXSWithPng(image);

		    // Serialize it
		    var newM5kOutput = _this.serialize();

		    // Write it back to disk
		    fs.writeFile(_this.filename, newM5kOutput, function(err) {
		    	if(err) throw err;

		    	console.log('Done saving!', _this.filename);
		    });
		});
	}
}

// Replaces the TEXS layer with the given new png file
readM5k.prototype.replaceTEXSWithPng = function(newPng) {
	// Grab a copy of what we need to compress it to
	//var compressedImageData = compressPng(newPng);

	// Store it
	//this.friendlyHeaders.TEXS.imageWidth = newPng.getWidth();
	//this.friendlyHeaders.TEXS.imageHeight = newPng.getHeight();
	//this.friendlyHeaders.TEXS.compressedImageData = compressedImageData;
	this.friendlyHeaders.TEXS.pngImage = newPng;
};

// Serializes the TEXS from friendly back to ugly
readM5k.prototype.serializeTEXS = function() {
	var toMerge = [];

	// Grab the TEXS header
	var TEXS = this.friendlyHeaders.TEXS;

	// Add the header
	toMerge.push(TEXS.header);

	// Write the image data
	toMerge.push(shortToBuff(this.friendlyHeaders.TEXS.pngImage.getWidth()));
	toMerge.push(shortToBuff(this.friendlyHeaders.TEXS.pngImage.getHeight()));

	var compressedImageData = compressPng(this.friendlyHeaders.TEXS.pngImage);
	toMerge.push(longToBuff(compressedImageData.length));
	toMerge.push(compressedImageData);

	// Add the footer
	toMerge.push(TEXS.footer);

	// Store the modified NAMS
	this.extractedHeaders.TEXS = Buffer.concat(toMerge);
};

// Converts a raw image into a PNG
function rawImageToPng(width, height, rawImageData) {
	var image = PNGImage.createImage(width, height);

    for(var x=0; x<width; ++x) {
        for(var y=0; y<height; ++y) {
            var thePos = (y * width + x) * 4;

            var b = rawImageData.readUInt8(thePos + 0);
            var g = rawImageData.readUInt8(thePos + 1);
            var r = rawImageData.readUInt8(thePos + 2);
            var a = rawImageData.readUInt8(thePos + 3);

            image.setAt(x, y, {
                red: r,
                green: g,
                blue: b,
                alpha: a
            });
        }
    }

    return image;
}

// Converts an PNG into a raw image
function pngToRawImage(theImage) {
	var width = theImage.getWidth();
	var height = theImage.getHeight();

	var buff = new Buffer(width * height * 4);

	for(var x=0; x<width; ++x) {
        for(var y=0; y<height; ++y) {
            var thePos = (y * width + x) * 4;

            var index = theImage.getIndex(x, y);

            var r = theImage.getRed(index);
            var g = theImage.getGreen(index);
            var b = theImage.getBlue(index);
            var a = theImage.getAlpha(index);

            // If the alpha is not there, we need to make it black
            if(a <= 0) {
            	r = 0;
            	g = 0;
            	b = 0;
            }

            buff.writeUInt8(b, thePos + 0);
            buff.writeUInt8(g, thePos + 1);
            buff.writeUInt8(r, thePos + 2);
            buff.writeUInt8(a, thePos + 3);
        }
    }

    return buff;
}

// Compresses an image to store back into the game
function compressRawImage(rawImage) {
	// Simple compression
	return zlib.deflateSync(rawImage);
}

// Converts a PNG to a game ready format
function compressPng(pngImage) {
	return compressRawImage(pngToRawImage(pngImage));
}

readM5k.prototype.serializeHeader = function(headerName) {
	switch(headerName) {
		case 'NAMS':
			this.serializeNAMS();
		break;

		case 'TEXS':
			this.serializeTEXS();
		break;
	}
};

readM5k.prototype.serialize = function() {
	var toMerge = [];

	// Add the first header
	toMerge.push(Buffer.from('0100414E494DCCCC00000000', 'hex'));

	// This will be replace with the final length of the rest of the payload
	toMerge.push(null);

	// Add the second header
	toMerge.push(Buffer.from('CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC', 'hex'));

	var payloadActualSize = 0;

	// Serialize all friendly headers
	for(var headerName in this.friendlyHeaders) {
		// Serialize the header
		this.serializeHeader(headerName);
	}

	// Loop over all headers
	for(var headerName in this.extractedHeaders) {
		// Add the header name (TODO: Ensure header is exactly 4 chars)
		toMerge.push(Buffer.from(headerName));
		payloadActualSize += headerName.length;

		var buffToWrite = this.extractedHeaders[headerName];

		// Add the header of how much data is going to be in this
		toMerge.push(longToBuff(buffToWrite.length));
		payloadActualSize += 4;

		// Add the actual buff
		toMerge.push(buffToWrite);
		payloadActualSize += buffToWrite.length;
	}

	// Fix the original size header
	toMerge[1] = longToBuff(payloadActualSize);

	// Finally convert it
	return Buffer.concat(toMerge);
};

// Converts a long into a buffer
function longToBuff(val) {
	var buff = new Buffer(4);
	buff.writeUInt32LE(val);
	return buff;
}

// Converts a short into a buffer
function shortToBuff(val) {
	var buff = new Buffer(2);
	buff.writeUInt16LE(val);
	return buff;
}

// Converts a string to a buffer
function stringToBuff(val) {
	var toMerge = [];
	toMerge.push(shortToBuff(val.length));
	toMerge.push(Buffer.from(val, 'utf8'));

	return Buffer.concat(toMerge);
}

// Define exports
exports.readM5k = readM5k;

/*var head = new readM5k('head.m5k');
new readM5k('tentacle_chicken.m5k');
new readM5k('mechforce1_rising.m5k');
new readM5k('eiffel.m5k');
new readM5k('tentacle_snappingturtle.m5k');
//var fh = new readM5k('firehydrant.m5k');
var ql = new readM5k('urchin_quill.m5k');

/*head.extractedHeaders.NAMS[0][0] = 'roar1';
head.extractedHeaders.NAMS[1][0] = 'roar2';
head.extractedHeaders.NAMS[2][0] = 'ok';
head.extractedHeaders.NAMS[3][0] = 'idle';*/

/*for(var i=0; i<head.friendlyHeaders.NAMS.length; ++i) {
	head.friendlyHeaders.NAMS[i][1] = 6750208;
}

PNGImage.readImage('amazing.png', function (err, image) {
    if (err) throw err;
 
    head.replaceTEXSWithPng(image);

    var newHead = head.serialize();
	fs.writeFileSync('head2.m5k', newHead);

	new readM5k('head2.m5k');
});

/*new readM5k('head2.m5k');
new readM5k('credits.m5k');
new readM5k('map_newyork.m5k');*/

/*fh.extractedHeaders.TEXS = ql.extractedHeaders.TEXS;
fh.extractedHeaders["HDR "] = ql.extractedHeaders["HDR "];

var fh2 = fh.serialize();

fs.writeFileSync('fh.m5k', fh2);*/
