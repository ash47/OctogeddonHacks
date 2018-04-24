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

	var totalBuildings = Math.floor(Math.random() * 5) + 1;

	// Add stuff
	res = applyModifications(res, {
		enemies: enemyList,
		boss: getRandomElementFromArray(settings.templates.cityBoss),
		monument: getRandomElementFromArray(settings.templates.monument),
		road_tile: getRandomElementFromArray(settings.templates.road_tile),
		layer_sky: getRandomElementFromArray(settings.templates.layer_sky),
		close_buildings: getRandomElementFromArray(settings.templates.close_buildings),
		water: getRandomElementFromArray(settings.templates.water),
		parallax1: getRandomElementFromArray(settings.templates.parallax1),
		parallax2: getRandomElementFromArray(settings.templates.parallax2),
		parallax3: getRandomElementFromArray(settings.templates.parallax3),
		wall_behind_water_tile: getRandomElementFromArray(settings.templates.wall_behind_water_tile),
		intersection: getRandomElementFromArray(settings.templates.intersection),
		totalbuildings: '' + totalBuildings
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
