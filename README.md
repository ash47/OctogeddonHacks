# OctogeddonHacks
 - This is a repo containing hacking tools and hacking related files for Octogeddon

# Where are save files stored?
 - Save files are stored into two locations which helps prevent hacking / tamporing.
 - You need to either edit both save file locations, or delete the save files from one location and using the other location each time you perform edits.
 - `%appdata%/Roaming/Octogeddon/`
 - `Steam/userdata/525620/remote/`

# Save file format?
 - The original version of the game uses a `.sav` format.
 - The update that came out 10th March 2018 changed the save file format, there are now two files: `.sv2` and `.sv2x`
 - The `.sv2x` as of now can safely be deleted and doesn't seem to affect anything, however, a backup should be kept just incase
 - The `.sv2x` file is simply a `.sav` file with a checksum added to the end

# Hacked Save Files
 - You can find various hacked save files in the "HackedSaves" directory. These should be installed into the save files directory.
 - `EverythingUnlockedUltimateStart` This is a save file with the game beaten, which unlocks Hard mode and Endless Ocean. You'll also start out with unlimited money when you press "New Game", and you'll be able to add an infinite number of tentacles to your Octogeddon.

# How do I unpack data.ayg?
 - There is research done by aluigi on [ZenHAX](http://zenhax.com/viewtopic.php?t=7396) with regards to unpacking this file.
 - As of writing this, there is a BMS script which attempts to unpack the files, it is able to list them all, HOWEVER, the unpacked files appear to be encrypted, and as such, the tool is currently useless besides seeing what files exist.
