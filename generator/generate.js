const fs = require('fs');
const path = require('path');

const settings = require('./settings.json');

function resolveItem(thePath) {
	var fileLoc = path.join(__dirname, settings.templateDir, thePath);

	return '' + fs.readFileSync(fileLoc);
}

function generateLevels() {
	var res = resolveItem('levels.xml/top_junk.xml');

	for(var i=0; i<3; ++i) {
		res += generateLevel();
	}

	var finalLevel = resolveItem('levels.xml/final_level.xml');
	res += finalLevel;

	return res;
}

function generateLevel() {
	// Grab all the parts
	var header = resolveItem('levels.xml/level_header.xml');
	var footer = resolveItem('levels.xml/level_footer.xml');
	var subLevel = resolveItem('levels.xml/sublevel.xml');
	var enemyTemplate = resolveItem('levels.xml/enemy.xml');

	var possibleLevels = settings.templates.city;
	var myLevelInfo = getRandomElementFromArray(possibleLevels);

	// Put it together
	var res = '';

	res += header;
	res += subLevel;
	res += footer;

	res = applyModifications(res, myLevelInfo);

	var possibleEnemies = settings.templates.cityEnemies;
	var enemyList = '';
	for(var i=0; i<5; ++i) {
		// Add an enemy to the list
		enemyList += applyModifications(enemyTemplate, {
			enemy: getRandomElementFromArray(possibleEnemies)
		});
	}

	// Apply the enemy list to the mission
	res = applyModifications(res, {
		enemies: enemyList
	});

	// Add a random boss
	var possibleBosses = settings.templates.cityBoss;
	res = applyModifications(res, {
		boss: getRandomElementFromArray(possibleBosses)
	});

	// Add a random monument
	var possibleMonuments = settings.templates.monument;
	res = applyModifications(res, {
		monument: getRandomElementFromArray(possibleMonuments)
	});

	return res;
}

function applyModifications(string, modifications) {
	for(var key in modifications) {
		string = string.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), modifications[key]);
	}

	return string;
}

function saveLevelGeneration() {
	var outputLocation = path.join(__dirname, settings.outputDir, 'properties', 'levels.xml')
	fs.writeFileSync(outputLocation, generateLevels());
}

function getRandomElementFromArray(myArray){
	return myArray[Math.floor(Math.random() * myArray.length)];
}

saveLevelGeneration();
