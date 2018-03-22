// When the document is ready
$(document).ready(function() {
	// Hook the file upload

	function outputSaveFile(theFile, format) {
		// Ensure we have a format
		if(format == null) {
			format = "sav";
		}

		// Create the blob
		var theBlog = new Blob([theFile]);

		// Output it
		saveAs(theBlog, "octogeddon." + format);
	}

	window.downloadEditedSaveFile = function(format) {
		// Load JSON from editor
		window.loadedSaveFile.data = window.jsonEditor.get();

		// Reload the save file
		loadSaveFile(window.loadedSaveFile, true);

		// Output the save file
		outputSaveFile(window.loadedSaveFile.outputBuff, format);
	};

	// Convert a save file into JSON
	function loadSaveFile(info, noOverRide) {
		// Create a buffer
		var buff = new buffer.Buffer(info.rawData);

		// Reset vars
		info.pos = 0;
		info.buff = buff;
		info.data = info.data || {
			// Root properties
			//root: {}
		};
		info.storeInto = "root";

		// This will store the compiled save file
		info.outputBuff = new buffer.Buffer(0);

		// Store a global reference
		window.loadedSaveFile = info;

		while(info.pos < buff.length) {
			// Read the command in
			var thisCommand = readString(info);

			// Write the command to the output file
			if(thisCommand != 'normal') {
				writeString(info, thisCommand);
			}

			console.log("command = '" + thisCommand + "'");

			switch(thisCommand) {
				case "player":
					info.data.versionHeader = readLong(info);

					// Write the version header
					writeLong(info, 327938);
				break;

				case "profile":
					// Whats the name of the store?
					info.storeInto = readString(info);

					// Write down which profile we are storing into
					writeString(info, info.storeInto)

					// Ensure we have a store for this
					info.data[info.storeInto] = info.data[info.storeInto] || {}

					console.log(' ---- Found profile "' + info.storeInto + '", offset = ' + info.pos);



					// Skip unknown stuff
					var randomBytes = skipBytes(info, 8);
					console.log("" + randomBytes)
					console.log(randomBytes)

					console.log(info.outputBuff)
					writeRawBuffer(info, randomBytes);
					console.log(info.outputBuff)
				break;

				// We got a blank command? wtf?
				case "":
					// Do nothing

					// ]Decide how much to skip
					var bytesLeft = buff.length - info.pos;
					if(bytesLeft < 8) {
						var randomBytes = skipBytes(info, bytesLeft);
						writeRawBuffer(info, randomBytes);
					}
				break

				// Null, just skip another byte
				case "\x00":
				console.log('asd')
					// Decide how much to skip
					var bytesLeft = buff.length - info.pos;
					if(bytesLeft > 8) {
						bytesLeft = 1;
					}

					var randomBytes = skipBytes(info, bytesLeft);
					writeRawBuffer(info, randomBytes);
				break;

				//case 'WAVENUM':
				case 'USERNAME':
					var newValue = readStringUnicode(info);

					// Store it
					writeStringUnicode(info, info.data[info.storeInto][thisCommand] || newValue);

					// Store the string
					if(!noOverRide) {
						info.data[info.storeInto][thisCommand] = newValue;
					}

					// Skip some bytes
					var randomBytes = skipBytes(info, 4);
					writeRawBuffer(info, randomBytes);
				break;

				// Array based entries
				case 'LEGTYPES':
				case 'NEWITEMS':
				case 'STARTINGSTOREITEMS':
				case 'UNLOCKEDITEMS':
				case 'ACHIEVED_MEDALS':
				case 'COLLECTED_MEDALS':
				case 'ENEMIES':
				case 'LABITEMS':
				case 'NEWENEMIES':
				case 'OWNEDBUDDIES':
				case 'OLDLEGS':
				case 'PURCHASES':
				case 'SEENCUTSCENES':
				case 'SEENOBJECTS':
				case 'SOLDOUTITEMS':
				case 'SPAWNCHOICES':
				case 'TUTORIALSSHOWN':
				case 'UNLOCKEDENEMIES':
				case 'VEHICLECHOICES':
				case 'LASTDNAUNLOCKED':
					var newValue = readStringArray(info);

					writeStringArray(info, info.data[info.storeInto][thisCommand] || newValue);

					if(!noOverRide) {
						info.data[info.storeInto][thisCommand] = newValue;
					}
				break;

				case 'normal':
					// Skip a ton
					info.pos += 16;
				break;

				default:
					// Warn that there is no handler yet for this
					//console.log("Warning: There is no handler for " + thisCommand);

					var newValue = readString(info);

					writeString(info, info.data[info.storeInto][thisCommand] || newValue);

					// Try to read the data string
					if(!noOverRide) {
						info.data[info.storeInto][thisCommand] = newValue;
					}
				break;
			}
		}

		// Save file is now loaded!
		window.jsonEditor.set(info.data);

		// Show editor stuff
		$(".requireLoadedFile").show();
		$("#pleaseSupportMe").hide();
	}

	// Reads an array of strings
	// First 2 bytes in LE is the number of elements, then reach number represented as a string per below
	function readStringArray(info) {
		// See how many elements there are
		var numElements = readShort(info);

		// Create a store for the elements
		var elementStore = [];

		// Loop for each element
		for(var i=0; i<numElements; ++i) {
			// Read this element
			var thisElement = readString(info);

			// Store the element
			elementStore.push(thisElement);
		}

		// Return the elements
		return elementStore;
	}

	// Writes an array of strings
	function writeStringArray(info, toWrite) {
		// Write how many elements there are
		writeShort(info, toWrite.length);

		// Write each element
		for(var i=0; i<toWrite.length; ++i) {
			writeString(info, toWrite[i]);
		}
	}

	// Skips totalToSkip bytes
	function skipBytes(info, totalToSkip) {
		// Reads the bytes and returns them
		var toReturn = info.buff.slice(info.pos, info.pos + totalToSkip);

		info.pos += totalToSkip;

		return toReturn;
	}

	// Write a raw buffer
	function writeRawBuffer(info, buff) {
		info.outputBuff = buffer.Buffer.concat([info.outputBuff, buff]);
	}

	// Reads a long -- 4 bytes
	function readLong(info) {
		// Read the long
		var result = info.buff.readUInt32LE(info.pos);

		// Increase buffer position
		info.pos += 4;

		// Return the result
		return result;
	}

	// Write a long -- 4 bytes
	function writeLong(info, toWrite) {
		var ourBuff = new buffer.Buffer(4);
		ourBuff.writeUInt32LE(toWrite, 0);

		info.outputBuff = buffer.Buffer.concat([info.outputBuff, ourBuff]);
	}

	// Reads a short -- 2 bytes
	function readShort(info) {
		// Read the long
		var result = info.buff.readUInt16LE(info.pos);

		// Increase buffer position
		info.pos += 2;

		// Return the result
		return result;
	}

	// Write a long -- 4 bytes
	function writeShort(info, toWrite) {
		var ourBuff = new buffer.Buffer(2);
		ourBuff.writeUInt16LE(toWrite, 0);

		info.outputBuff = buffer.Buffer.concat([info.outputBuff, ourBuff]);
	}

	// Reads the next N bytes, and turns it into a string
	function readNBytesAsString(info, length) {
		var result = "" + info.buff.slice(info.pos, info.pos + length);

		// Increase the buffer position again
		info.pos += length;

		return result;
	}

	// Writes a string as a bunch of bytes
	function writeStringAsBytes(info, toWrite) {
		var ourBuff = new buffer.Buffer(toWrite);

		info.outputBuff = buffer.Buffer.concat([info.outputBuff, ourBuff]);
	}

	// Reads a 2 byte header in LE, then read that many characters and turn it into a string
	function readString(info) {
		// Read the length of the string
		var stringLength = readShort(info);

		// Grab the string
		return readNBytesAsString(info, stringLength);
	}

	// Write a string back into the buffer
	function writeString(info, toWrite) {
		var stringLength = toWrite.length;

		// Write the header
		writeShort(info, stringLength);

		// Create a buffer with the contents
		var bodyBuff = new buffer.Buffer(toWrite);

		// Write the actual string
		writeStringAsBytes(info, toWrite);
	}

	// Reads a 2 byte header in LE, then read that many characters * 2 and turn it into a unicode string
	function readStringUnicode(info) {
		// Read the length of the string
		var stringLength = readShort(info) * 2;

		// Grab the string
		return readNBytesAsString(info, stringLength);
	}

	function writeStringUnicode(info, toWrite) {
		// Read the length of the string
		var stringLength = toWrite.length / 2;

		// write the header
		writeShort(info, stringLength);

		// Grab the string
		return writeStringAsBytes(info, toWrite);
	}

	// When a file is loaded, handle it
	function onLoadFile(e) {
		if(e.currentTarget != null && e.currentTarget.result != null) {
			// Grab the file contents
			var saveFileContents = e.currentTarget.result;

			// Create the buffer to store info
			var info = {
				rawData: saveFileContents
			};

			try {
				// Attempt to load the save file
				loadSaveFile(info);
			} catch(e) {
				console.log(e);

				alertify.error('Failed to load your save file, please share a copy on the Discord chat so we can add support for your save file.');
			}
		} else {
			alertify.error("Had an error successfully reading the save file.");
		}
	}

	function onLoadFileError(e) {
		alertify.error("Had an unknown error while loading the save file.");
		console.log(e);
	}

	$("#theFile").on("change", function(evt) {
		var files = evt.target.files;
		if(files.length != 1) {
			alertify.error("Please select only one file.");
			return;
		}

		// Do the reading
		var reader = new FileReader();
		reader.onload = onLoadFile;
		reader.onerror = onLoadFileError;
		reader.readAsArrayBuffer(files[0]);
	});

	// Create the editor
	var container = document.getElementById("jsoneditor");
	var options = {};
	window.jsonEditor = new JSONEditor(container, options);
});
