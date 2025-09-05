A 'world-navigator' extension for sillyTavern. It takes coordinate data from a x,y coordinate plane and then uses a World Info .JSON file to calculates position, distances, direction, orientation, and field of view to help ground RP

I'll add more, once I have an idea if I want more features to be present or not.

**ToDo**

- Write up guide on how to create on .JSON files, as well as what's needed to map them.

- Include scripts that I use for conversion of .SVG files to .JSON format, as well as optimization script, etc.

**Basic Feature:**

- Listens for [x, y] coordinates in promopt. Will then return objects and their position, per the .JSON map file.

- Combine with World Info, for a somewhat grounded AI that can return lore regarding mapped entries to craft a narrative.

- Will keep Save States between chats. Chat 1 vs Chat 2 can have different location tracking in place, so the player character's position isn't forgotten.

**Warning:**

- Manual entries cannot be added to Lorebooks with these mappings due to no inherent coordinate functionality present in World Info.

- There is a way to add the coordinates to entries from ST; but they would be present in plain text within any entries added (Will write a guide as part of todo list)

**Setup:**
Must be used with custom .JSON containing grid coordinates, so that it can calculate directions. Templates can be found in the 'Template' folder.

1. Take the .JSON in the "Templates' folder, then install it via the 'Import JSON Map' button in the extension in SillyTavern.

2. Take this same .JSON and import it into SillyTavern, within World Info.

**Examples of initial prompts to attempt:**

a.) I'm currently at [1120, 2043], standing on a hill with a vantage point. What do I see? Give me distances, as well as provide the LocationAnalysis.

b.) I'm currently at [1131, 1405], standing on a hill with a vantage point. What do I see?

c.) Imagine that I've teleported away, and am now in a new location. [1300, 1900] What do I see?

**Example of Output:**

Output is hidden in system promt that's added right before User entry. It won't track with Chat History.

[LocationAnalysis: PlayerLocation={(1131, 1405)}, ContainingRegions={Abel, The Eternal Prairie}, NearbyPOIs={Road Abel Leazhar-Tiberias 1 (~2.8 km NNW, running straight WSW, ClosestPoint:(1131,1404)), The Forest of the Moon (~39.0 km NNW, spanning from WNW to NNE [288°-30°], ClosestPoint:(1126,1395)), Road Abel GoodRest-Tiberias 1 (~39.7 km NNW, curving from W to WSW, ClosestPoint:(1128,1394)), Tiberias (~107.6 km ENE, ClosestPoint:(1158,1390)), Road Abel Tiberius-Neria 1 (~108.3 km ENE, heading ENE, ClosestPoint:(1157,1388)), Mountain Range of Tol Jaegren (~133.7 km ENE, spanning from N to SE [7°-136°], ClosestPoint:(1168,1394)), Path Abel Leazhar-MountainRangeOfTolJaegren 1 (~242.2 km SSW, curving from WNW to W, ClosestPoint:(1112,1472))}]
