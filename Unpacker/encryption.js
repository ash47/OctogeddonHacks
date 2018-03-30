var fs = require('fs');

function decryptFile(buff, buffSize) {
	var keyNum = 0x01020304 + buff.length;

	// Loop over data in 4 byte blocks
	for(var i=0; i<buff.length; i+= 4) {
		// Decrypt this block
		doDecrypt(buff, i + 3, (keyNum & 0xFF000000) >> 24);
		doDecrypt(buff, i + 2, (keyNum & 0x00FF0000) >> 16);
		doDecrypt(buff, i + 1, (keyNum & 0x0000FF00) >> 8);
		doDecrypt(buff, i + 0, (keyNum & 0x000000FF));

		// Increase keynum
		++keyNum;
	}
}

function doDecrypt(buff, index, theKey) {
	// Can we even do this?
	if(buff.length <= index) return;

	// Do the logic
	buff[index] ^= theKey;
}

// Unpacks data.ayg
function unpackDataAyg(filePath, outputPath, opts) {
	// Ensure we have some ops
	opts = opts || {};

	console.log('Attempting to read data.ayg file...');

	var info = {
		pos: 0,
		writeOffset: 0,
		buff: fs.readFileSync(filePath, {
			encoding: null
		})
	};

	info.buffOut = Buffer.from(info.buff);

	console.log('File loading into memory!');

	// We don't care about the headers
	info.pos += 0x20;

	var continueExtracting = function(basePath) {
		basePath = basePath || '';

		// Ensure our base path exists
		ensureDirectoryExists(basePath);

		// For updating the section size later
		var currentWriteOffset = info.writeOffset;
		var sectionWriteOffset = info.pos + info.writeOffset;

		var sectionSize = readLong(info);

		var newPath = readString(info);
		var folderName = basePath;
		if(newPath.length > 0) {
			folderName += '/' + newPath;
		}

		// Ensure our new folder exists
		ensureDirectoryExists(folderName);

		var totalFolders = readLong(info);

		for(var i=0; i<totalFolders; ++i) {
			continueExtracting(folderName);
		}

		// Extract all files in here
		var totalFiles = readLong(info);
		for(var i=0; i<totalFiles; ++i) {
			// This is the position where we need to write an update filesize to
			var storeFileSizePos = info.pos;

			// Read the filesize
			var storedFileSize = readLong(info);

			var tempPos = info.pos;
			var fileName = readString(info);
			var offsetPos = info.pos;

			var fileSize = storedFileSize - (offsetPos - tempPos);

			var outputName = folderName + '/' + fileName;

			console.log('Extracting ' + outputName);

			// Should we extract files?
			if(opts.extract) {
				// An encrypted buff
				var encryptedBuff = info.buff.slice(info.pos, info.pos + fileSize);

				// Attempt to decrypt it
				decryptFile(encryptedBuff, storedFileSize);

				// Save file
				fs.writeFileSync(
					outputName,
					encryptedBuff
				);
			}

			// Let's see if there is a file to inject
			if(opts.inject) {
				var injectFileName = 'edited_' + outputName;
				if(fs.existsSync(injectFileName)) {
					var toInjectBuff = fs.readFileSync(injectFileName, {
						encoding: null
					});

					// We need to tell it how big the new part is
					var toWriteSize = storedFileSize + toInjectBuff.length - fileSize;

					// Encrypt it
					decryptFile(toInjectBuff, toWriteSize);

					// Confirm the write
					info.buffOut = Buffer.concat([
						info.buffOut.slice(0, info.pos + info.writeOffset),
						toInjectBuff,
						info.buffOut.slice(info.pos + fileSize + info.writeOffset)
					]);

					info.buffOut.writeUInt32LE(toWriteSize, storeFileSizePos + info.writeOffset);

					// Adjust the write offset
					info.writeOffset += toInjectBuff.length - fileSize;

					// Log success
					console.log(' + Successfully injected ' + injectFileName);
				}
			}

			// Move to next file
			info.pos += fileSize;
		}

		// Do we need to update the output buffer?
		if(opts.inject) {
			info.buffOut.writeUInt32LE(sectionSize + (info.writeOffset - currentWriteOffset), sectionWriteOffset);
		}
	};

	// Continue extracting
	continueExtracting('extracted');

	console.log('Done extracting!');

	// Advertise the YouTube channel
	console.log('');
	console.log('If you like this tool, and want to support the tool\'s development then make sure to subscribe to our YouTube channel.');
	console.log('Need help? Watch our Octogeddon modding tutorials on our YouTube channel.');
	console.log('');
	console.log('https://www.youtube.com/AzzaFortysix');
	console.log('');

	if(opts.inject) {
		console.log('Writing...');

		// Store the file
		fs.writeFileSync(outputPath, info.buffOut, {
			encoding: null
		});

		console.log('Done writing!');
	}
}

function ensureDirectoryExists(dir) {
	try {
		fs.mkdirSync(dir);
	} catch(e) {
		// do nothing
	}
}

function readNBytesAsString(info, length) {
		var result = "" + info.buff.slice(info.pos, info.pos + length);

		// Increase the buffer position again
		info.pos += length;

		return result;
	}

function readString(info) {
	// Read the len
	var len = info.buff.readUInt8(info.pos);
	++info.pos;

	// Return the data
	return readNBytesAsString(info, len);
}

function readLong(info) {
	var toRet = info.buff.readUInt32LE(info.pos);
	info.pos += 4;

	return toRet;
}

// Ensure we have enough arguments
if(process.argv < 3) {
	console.log('Please specify either unpack or repack mode!');
	return;
}

// Ensure the directories we care about exist
ensureDirectoryExists('extracted');
ensureDirectoryExists('edited_extracted');

// Grab the runmode
var runMode = process.argv[2].toLowerCase();

// Which action to perform?
if(runMode == 'unpack') {
	// Unpack

	unpackDataAyg('data.ayg', 'repacked_data.ayg', {
		extract: true,
		//inject: true
	});
} else if (runMode == 'repack') {
	// Repack

	unpackDataAyg('data.ayg', 'repacked_data.ayg', {
		//extract: true,
		inject: true
	});
} else {
	console.log('Unknown operation mode: ' + runMode);
}
