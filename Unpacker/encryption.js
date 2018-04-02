var fs = require('fs');
var path = require('path');

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

	// Advertise our stuff
	doAdvertising();

	if(opts.inject) {
		console.log('Writing...');

		// Store the file
		fs.writeFileSync(outputPath, info.buffOut, {
			encoding: null
		});

		console.log('Done writing!');
	}
}

function prepareFileStructure(folderList) {
	var theOutput = {
		name: ''
	};

	// Loop over each folder
	for(var i=0; i<folderList.length; ++i) {
		// Prepare entries for this folder
		prepareFileStructureSub(folderList[i], theOutput);
	}

	return theOutput;
}

function prepareFileStructureSub(directory, storeInto) {
	if(storeInto == null) {
		storeInto = {};
	}

	storeInto.folderList = storeInto.folderList || [];
	storeInto.fileList = storeInto.fileList || [];
	storeInto.smartList = storeInto.smartList || {};

	var allFiles = fs.readdirSync(directory);

	for(var i=0; i<allFiles.length; ++i) {
		// Grab info on the file
		var thisFile = allFiles[i];
		var fullPath = path.join(directory,thisFile);
		var fileInfo = fs.statSync(fullPath);

		// We will store info in here
		var myInfo = {
			name: thisFile,
			fullPath: fullPath
		};

		var shouldPush = true;
		if(storeInto.smartList[thisFile]) {
			// We are going to edit the existing one
			myInfo = storeInto.smartList[thisFile]

			// Update the path to the file
			myInfo.fullPath = fullPath;

			// We shouldn't push
			shouldPush = false;
		} else {
			// Store myInfo
			storeInto.smartList[thisFile] = myInfo;
		}

		if(fileInfo.isDirectory()) {
			// Add all the subdirectories
			prepareFileStructureSub(fullPath, myInfo);

			// Push it into the folder list
			if(shouldPush) storeInto.folderList.push(myInfo);
		} else {
			// Push it into the file list
			if(shouldPush) storeInto.fileList.push(myInfo);
		}
	}

	return storeInto;
}

// Builds an AYG archive from scratch
function buildAYG(outputName, fileList) {
	//console.dir(fileList);

	// Create the stream we will use to write the archive
	var writeStream = fs.createWriteStream(outputName);

	// Write the header
	writeStream.write('AYGP');
	writeStream.write('\x00\x00\x00\x00');
	writeStream.write('\x04\x00\x00\x00');
	writeStream.write('\x00\x00\x00\x00');
	writeStream.write('\x00\x00\x00\x00');
	writeStream.write('\x00\x00\x00\x00');
	writeStream.write('\x00\x00\x00\x00');
	writeStream.write('\x00\x00\x00\x00');

	console.log('Generating Archive...');

	var allSections = buildSection(fileList, true);

	// Advertise our stuff
	doAdvertising();

	// Tell the user what we're doing
	console.log('Done generating! Writing...');

	writeStream.write(allSections);
	writeStream.end();

	// Done!
	console.log('Please wait while we write ' + outputName);
}

function buildSection(fileInfo, isDir) {

	// Create the name entry
	var buffFileName = createBufferString(fileInfo.name);

	// This will store all the sections
	var allSections = [
		new Buffer(4),	// We need a blank buffer to write the buff length into
		buffFileName
	];

	if(isDir) {
		console.log(' + Folder: ' + fileInfo.name);

		// How many folders are there?
		var buffTotalFolders = new Buffer(4);
		buffTotalFolders.writeUInt32LE(fileInfo.folderList.length, 0);
		allSections.push(buffTotalFolders);

		// Loop over all sub directories and build
		for(var i=0; i<fileInfo.folderList.length; ++i) {
			var thisSection = buildSection(fileInfo.folderList[i], true);

			// Store this section
			allSections.push(thisSection);
		}

		// How many files are there?
		var buffTotalFiles = new Buffer(4);
		buffTotalFiles.writeUInt32LE(fileInfo.fileList.length, 0);

		// Add it to our section list
		allSections.push(buffTotalFiles);

		// Add all the files
		for(var i=0; i<fileInfo.fileList.length; ++i) {
			// Get the file data
			var thisSection = buildSection(fileInfo.fileList[i], false);

			// Store this section
			allSections.push(thisSection);
		}
	} else {
		// Grab the data from the file
		var data = fs.readFileSync(fileInfo.fullPath);

		// Encrypt the data
		decryptFile(data, data.length + buffFileName.length);

		// Add the data onto the list of sections
		allSections.push(data);
	}
	
	// Concat all sections to craete the final payload
	var result = Buffer.concat(allSections);

	// Write the size of this buffer into the buffer
	result.writeUInt32LE(result.length - 4, 0);

	// We're done here
	return result;
}

// Creates a buffer that contains a string + a header
function createBufferString(str) {
	var header = new Buffer(1);

	header.writeUInt8(str.length, 0);
	
	return Buffer.concat([
		header,
		new Buffer(str)
	]);
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

function doAdvertising() {
	console.log('');
	console.log('If you like this tool, and want to support the tool\'s development then make sure to subscribe to our YouTube channel.');
	console.log('Need help? Watch our Octogeddon modding tutorials on our YouTube channel, or chat on our Discord server.');
	console.log('');
	console.log('https://www.youtube.com/AzzaFortysix');
	console.log('https://discord.gg/8u6W6SX');
	console.log('');
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
var runMode = (process.argv[2] || '').toLowerCase();
var runModeParam1 = (process.argv[3] || '').toLowerCase();
var runModeParam2 = (process.argv[4] || '').toLowerCase();

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
} else if(runMode == 'build') {
	// Prepare the files that we need to pack
	var toPack;
	var outputName = runModeParam1 || 'packed.ayg';

	if(runModeParam2 == 'minimal') {
		// We are only packing the files that we find in edited_extracted
		toPack = prepareFileStructure([
			'edited_extracted'
		]);
	} else {
		// Let's pack everything from the extracted directory
		// Then we will override it with things we find in the edited directory
		toPack = prepareFileStructure([
			'extracted',
			'edited_extracted'
		]);
	}

	// Perform the packing
	buildAYG(outputName, toPack);
} else {
	console.log('Unknown operation mode: ' + runMode);
}
