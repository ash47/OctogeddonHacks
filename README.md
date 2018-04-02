# Octogeddon Hacking Information and Hacking Tools
 - This is a repo containing hacking tools and hacking related files for Octogeddon

# Where are save files stored?
 - Save files are stored into two locations which helps prevent hacking / tamporing.
 - You need to either edit both save file locations, or delete the save files from one location and using the other location each time you perform edits.
 - `%appdata%/Roaming/Octogeddon/`
 - `Steam/userdata/525620/remote/`

# Save file format?
 - The original version of the game uses a `octogeddon.sav` format.
 - The update that came out 10th March 2018 changed the save file format, there are now two files: `octogeddon.sv2` and `octogeddon.sv2x`
 - The `octogeddon.sv2x` as of now can safely be deleted and doesn't seem to affect anything, however, a backup should be kept just incase
 - The `octogeddon.sv2x` file is simply a `octogeddon.sav` file with a checksum added to the end

# Hacked Save Files
 - You can find various hacked save files in the "HackedSaves" directory. These should be installed into the save files directory.
 - `EverythingUnlockedUltimateStart` This is a save file with the game beaten, which unlocks Hard mode and Endless Ocean. You'll also start out with unlimited money when you press "New Game", and you'll be able to add an infinite number of tentacles to your Octogeddon.

# How do I edit my save files?
 - The online save file editor is available [here](https://ash47.github.io/OctogeddonHacks/SaveEditor/)
 - Simply load in your save file, make the changes that need to be made, and then download the modified save file
 - Make sure to delete old save files that are in both locations, per above

# How do I unpack data.ayg?
 - This repo contains a tool to both unpack and repack the data.ayg file! The tool can be used to both replace existing files in an archive, and build a brand new archive from scratch!
 - The tool is written with [NodeJS](https://nodejs.org/en/download/) so make sure you've downloaded and installed a copy.
 - Copy your `data.ayg` file into the Unpackers directory and then run `unpack.bat` to unpack all of the files -- This will create the `extracted` and `edited_extracted` directories.
 - Copy any files you wish to edit into the `edited_extracted` directory, making sure that the exact path matches in both.
 - Run the `repack.bat` to repack the `data.ayg` file, this will create a new file `repacked_data.ayg`.

# How do I create data.ayg from scratch?
 - You need two directories `extracted` and `edited_extracted`.
 - There are two options `build.bat` which will create `packed.ayg` and `build_minimal.bat` which will create `minimal_packed.ayg`.
 - The `build.bat` script will take all files that are in `extracted`, and `edited_extracted` and build `packed.ayg` out of the files. The files in edited_extracted will take priority / will override anything from the `extracted` directory.
 - The `build_minimal.bat` will create `minimal_packed.ayg` which will consist only of the files in `edited_extracted`, allowing for a much smaller archive.
