"# world-navigatorST" 

A 'world-navigator' extension for sillyTavern. It takes coordinate data from a x,y coordinate plane and then uses a World Info .JSON file to calculates position, distances, direction, orientation, and field of view to help ground RP

I'll add more, once I have an idea if I want more features to be present or not.

Warning:
- Manual entries cannot be added to Lorebooks with these mappings due to no inherent coordinate functionality.
- There *is* a way to add the coordinates to entries from ST; but they would be present in plain text within any entries added (Will write a guide as part of todo list)

Basic Feature:
- Listens for [x, y] coordinates in promopt. Will then return objects and their position, per the .JSON map file.
- Combine with World Info, for a somewhat grounded AI that can return lore regarding mapped entries to craft a narrative.

Setup:
Must be used with custom .JSON containing grid coordinates, so that it can calculate directions. Templates can be found in the 'Template' folder.

1. Take the .JSON in the "Templates' folder, then install it via the 'Import JSON Map' button in the extension in SillyTavern.
2. Take this same .JSON and import it into SillyTavern, within World Info.

Examples of initial prompts to attempt:
a.) I'm currently at [1120, 2043], standing on a hill with a vantage point. What do I see? Give me distances, as well as provide the LocationAnalysis.
b.) I'm currently at [1131, 1405], standing on a hill with a vantage point. What do I see?
c.) Imagine that I've teleported away, and am now in a new location. [1300, 1900] What do I see?
