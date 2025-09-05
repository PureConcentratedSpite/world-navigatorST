(function () {
    // --- CONFIGURATION ---
    const MODULE_NAME = 'world-navigator';

    // --- SILLYTAVERN API ---
    const {
        extensionSettings,
        saveSettingsDebounced,
    } = SillyTavern.getContext();

    // --- DEFAULT SETTINGS ---
    const defaultSettings = Object.freeze({
        enabled: true,
        worldData: null,
        fileName: '',
    });

    function getSettings() {
        if (!extensionSettings[MODULE_NAME]) {
            extensionSettings[MODULE_NAME] = { ...defaultSettings };
        }
        for (const key of Object.keys(defaultSettings)) {
            if (!Object.hasOwn(extensionSettings[MODULE_NAME], key)) {
                extensionSettings[MODULE_NAME][key] = defaultSettings[key];
            }
        }
        return extensionSettings[MODULE_NAME];
    }

    // --- THE PROMPT INTERCEPTOR ---
    globalThis.worldNavigatorInterceptor = async function(chat, contextSize, abort, type) {
        if (!getSettings().enabled || type === 'dry') return;

        const lastUserMessage = [...chat].reverse().find(msg => msg.is_user);
        if (!lastUserMessage) return;

        const messageContent = lastUserMessage.mes;
        const coordRegex = /\[(\d+),\s*(\d+)\]/;
        const match = messageContent.match(coordRegex);

        if (match) {
            console.log(`World Navigator Interceptor: Coordinates found. Injecting system note.`);

            const x = parseInt(match[1], 10);
            const y = parseInt(match[2], 10);
            const locationInfo = findLocation(x, y);

            const systemNote = {
                is_user: false,
                is_system: true,
                send_date: Date.now(),
                mes: locationInfo, // Directly use the formatted location analysis
            };

            const lastUserMessageIndex = chat.lastIndexOf(lastUserMessage);
            if (lastUserMessageIndex !== -1) {
                chat.splice(lastUserMessageIndex, 0, systemNote);
            }
        }
    };

    // --- UI AND DATA HANDLING (No changes) ---
    function createSettingsPanel() {
        const settings = getSettings();
        const status = settings.fileName ? `Loaded: ${settings.fileName}` : 'No map data loaded.';
        const isEnabled = settings.enabled ? 'checked' : '';

        const settingsHtml = `
            <div id="world-navigator-container">
                <div class="list-group-item list-group-item-background extensions_collapsible world-navigator-header">
                    <h4>World Navigator</h4>
                    <div class="expander-arrow fa-solid fa-chevron-down"></div>
                </div>
                <div class="world-navigator-content">
                    <p>Import your World Info JSON file to be used as the coordinate map.</p>
                    <div class="inline-drawer">
                        <label for="world-navigator-enabled">Enable Navigator</label>
                        <input id="world-navigator-enabled" type="checkbox" ${isEnabled}>
                    </div>
                    <div class="inline-drawer">
                        <label>Map File Status:</label>
                        <span id="world-navigator-status-text">${status}</span>
                    </div>
                    <div class="inline-drawer">
                        <button id="world-navigator-import-button" class="menu_button">Import JSON Map</button>
                        <input type="file" id="world-navigator-file-import" accept=".json" style="display: none;">
                    </div>
                    <div class="inline-drawer">
                        <button id="world-navigator-clear-data" class="menu_button danger_button">Clear Map Data</button>
                    </div>
                </div>
            </div>`;

        $('#extensions_settings').append(settingsHtml);

        $('.world-navigator-header').on('click', function() {
            $(this).next('.world-navigator-content').slideToggle();
            $(this).find('.expander-arrow').toggleClass('down');
        });
        $('#world-navigator-enabled').on('change', function() {
            getSettings().enabled = this.checked;
            saveSettingsDebounced();
        });
        $('#world-navigator-import-button').on('click', function() {
            $('#world-navigator-file-import').click();
        });
        $('#world-navigator-file-import').on('change', handleFileImport);
        $('#world-navigator-clear-data').on('click', clearMapData);
    }

    function handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.entries || typeof data.entries !== 'object') {
                    throw new Error("Invalid format: 'entries' key not found in JSON.");
                }
                const settings = getSettings();
                settings.worldData = data;
                settings.fileName = file.name;
                saveSettingsDebounced();
                $('#world-navigator-status-text').text(`Loaded: ${file.name}`);
                alert('World map loaded successfully!');
            } catch (error) {
                console.error("World Navigator: Error parsing JSON file.", error);
                alert(`Failed to load map data: ${error.message}`);
            }
        };
        reader.readAsText(file);
    }

    function clearMapData() {
        if (confirm("Are you sure you want to clear the loaded map data?")) {
            const settings = getSettings();
            settings.worldData = null;
            settings.fileName = '';
            saveSettingsDebounced();
            $('#world-navigator-status-text').text('No map data loaded.');
            alert('Map data cleared.');
        }
    }

    // --- INITIALIZATION ---
    $(document).ready(function () {
        const css = `.world-navigator-header { cursor: pointer; display: flex; justify-content: space-between; align-items: center; } .world-navigator-content { display: none; padding: 10px; border: 1px solid var(--list-group-border); border-top: none; } .world-navigator-content .inline-drawer { margin-bottom: 10px; } .expander-arrow { transition: transform 0.3s ease-in-out; } .expander-arrow.down { transform: rotate(180deg); }`;
        $('head').append(`<style>${css}</style>`);
        createSettingsPanel();
        console.log("World Navigator (v12 Logic) loaded.");
    });


    // --- LOCATION FINDING LOGIC (PORTED FROM PYTHON v12) ---
    const KM_PER_PIXEL = 3.485;
    const MAX_DISTANCE_KM = 250;
    const PIXEL_SEARCH_RADIUS = Math.floor(MAX_DISTANCE_KM / KM_PER_PIXEL);

    function parseCoordinates(coordString) { if (!coordString || typeof coordString !== 'string') return null; try { const jsonString = coordString.replace(/\(/g, '[').replace(/\)/g, ']'); return JSON.parse(jsonString); } catch (e) { console.error("Failed to parse coordinate string:", coordString, e); return null; } }

    /**
     * Ported from Python: 16-point compass direction.
     * Angle is calculated with 0 degrees as North.
     */
    function getCardinalDirection({ playerPoint = null, poiPoint = null, vector = null }) {
        let angle;
        if (vector) {
            const [vx, vy] = vector;
            if (vx === 0 && vy === 0) return "";
            angle = Math.atan2(vx, -vy) * (180 / Math.PI);
        } else {
            const [px, py] = playerPoint;
            const [poix, poiy] = poiPoint;
            const [deltaX, deltaY] = [poix - px, poiy - py];
            if (deltaX === 0 && deltaY === 0) return "";
            angle = Math.atan2(deltaX, -deltaY) * (180 / Math.PI);
        }

        angle = (angle + 360) % 360;

        if (348.75 <= angle || angle < 11.25) return "N";
        if (11.25 <= angle && angle < 33.75) return "NNE";
        if (33.75 <= angle && angle < 56.25) return "NE";
        if (56.25 <= angle && angle < 78.75) return "ENE";
        if (78.75 <= angle && angle < 101.25) return "E";
        if (101.25 <= angle && angle < 123.75) return "ESE";
        if (123.75 <= angle && angle < 146.25) return "SE";
        if (146.25 <= angle && angle < 168.75) return "SSE";
        if (168.75 <= angle && angle < 191.25) return "S";
        if (191.25 <= angle && angle < 213.75) return "SSW";
        if (213.75 <= angle && angle < 236.25) return "SW";
        if (236.25 <= angle && angle < 258.75) return "WSW";
        if (258.75 <= angle && angle < 281.25) return "W";
        if (281.25 <= angle && angle < 303.75) return "WNW";
        if (303.75 <= angle && angle < 326.25) return "NW";
        if (326.25 <= angle && angle < 348.75) return "NNW";
        return "";
    }

    function distanceToSegment(p, v, w) {
        const [px, py] = p, [vx, vy] = v, [wx, wy] = w;
        const l2 = (vx - wx) ** 2 + (vy - wy) ** 2;
        if (l2 === 0.0) return [Math.sqrt((px - vx) ** 2 + (py - vy) ** 2), [vx, vy]];
        let t = Math.max(0, Math.min(1, ((px - vx) * (wx - vx) + (py - vy) * (wy - vy)) / l2));
        const [projX, projY] = [vx + t * (wx - vx), vy + t * (wy - vy)];
        return [Math.sqrt((px - projX) ** 2 + (py - projY) ** 2), [projX, projY]];
    }

    function isPointInPolygon(point, polygon) {
        const [x, y] = point;
        const n = polygon.length;
        let inside = false;
        let [p1x, p1y] = polygon[0];
        for (let i = 0; i <= n; i++) {
            const [p2x, p2y] = polygon[i % n];
            if (y > Math.min(p1y, p2y) && y <= Math.max(p1y, p2y) && x <= Math.max(p1x, p2x)) {
                if (p1y !== p2y) {
                    const xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x;
                    if (p1x === p2x || x <= xinters) {
                        inside = !inside;
                    }
                }
            }
            [p1x, p1y] = [p2x, p2y];
        }
        return inside;
    }

function findLocation(playerX, playerY) {
    const worldData = getSettings().worldData;
    if (!worldData) {
        return "[WorldNavigator: No map data has been loaded.]";
    }
    const playerPoint = [playerX, playerY];
    let containingRegions = [], nearbyPoisData = [];

    for (const entry of Object.values(worldData.entries)) {
        const content = entry.content || '';
        const data = {};
        content.split('\n').forEach(line => {
            if (line.startsWith('[') && line.includes(':') && line.includes(']')) {
                const key = line.substring(1, line.indexOf(':')).trim();
                const value = line.substring(line.indexOf(':') + 1, line.length - 1).trim();
                data[key] = value;
            }
        });
        const name = (entry.key && entry.key.length > 0) ? entry.key[0] : null;
        if (!name) continue; // Skip if no valid name is found

        // --- MODIFICATION START ---
        // Prefer the new top-level keys, with a fallback to the old format.
        const boundaryList = entry.boundary || parseCoordinates(data['Boundary']);
        const pathList = entry.path || parseCoordinates(data['Path']);
        const locTuple = entry.location || parseCoordinates(data['Location']);
        // --- MODIFICATION END ---


        if (boundaryList) {
            // This part remains the same as before
            if (isPointInPolygon(playerPoint, boundaryList)) {
                containingRegions.push(name);
            } else {
                let min_dist = Infinity;
                let closest_point = null;
                const n = boundaryList.length;
                for (let i = 0; i < n; i++) {
                    const v = boundaryList[i];
                    const w = boundaryList[(i + 1) % n]; // Close the polygon
                    const [dist, proj] = distanceToSegment(playerPoint, v, w);
                    if (dist < min_dist) {
                        min_dist = dist;
                        closest_point = proj;
                    }
                }

                if (min_dist <= PIXEL_SEARCH_RADIUS) {
                    let allAngles = [];
                    for (const v of boundaryList) {
                        const [deltaX, deltaY] = [v[0] - playerX, v[1] - playerY];
                        if (Math.sqrt(deltaX ** 2 + deltaY ** 2) <= PIXEL_SEARCH_RADIUS) {
                            allAngles.push(Math.atan2(deltaX, -deltaY) * (180 / Math.PI));
                        }
                    }
                    
                    let minAngle, maxAngle;
                    if (allAngles.length > 0) {
                        const baseAngle = Math.atan2(closest_point[0] - playerX, -(closest_point[1] - playerY)) * (180 / Math.PI);
                        let minDiff = 0, maxDiff = 0;
                        for (const angle of allAngles) {
                            let diff = (angle - baseAngle + 180) % 360 - 180;
                            if (diff < minDiff) minDiff = diff;
                            if (diff > maxDiff) maxDiff = diff;
                        }
                        minAngle = baseAngle + minDiff;
                        maxAngle = baseAngle + maxDiff;
                    } else {
                        minAngle = maxAngle = Math.atan2(closest_point[0] - playerX, -(closest_point[1] - playerY)) * (180 / Math.PI);
                    }
                    nearbyPoisData.push({ name, dist: min_dist, type: "span", min_angle: minAngle, max_angle: maxAngle, poi_point: closest_point });
                }
            }
        }

        if (pathList) {
            // This part remains the same as before
            if (pathList.length < 2) continue;
            let segments = [];
            for (let i = 0; i < pathList.length - 1; i++) {
                const [dist, point] = distanceToSegment(playerPoint, pathList[i], pathList[i + 1]);
                segments.push({ dist, point, index: i });
            }
            const closestSegment = segments.reduce((min, curr) => curr.dist < min.dist ? curr : min, { dist: Infinity });
            if (closestSegment.dist <= PIXEL_SEARCH_RADIUS) {
                nearbyPoisData.push({ name, dist: closestSegment.dist, type: "path", path_data: pathList, index: closestSegment.index, poi_point: closestSegment.point });
            }
        }

        if (locTuple) {
            // This part remains the same as before
            const dist = Math.sqrt((locTuple[0] - playerX) ** 2 + (locTuple[1] - playerY) ** 2);
            if (dist <= PIXEL_SEARCH_RADIUS) {
                nearbyPoisData.push({ name, dist, type: "point", poi_point: locTuple });
            }
        }
    }

    nearbyPoisData.sort((a, b) => a.dist - b.dist);
    let finalPois = [];
    const seenNames = new Set();

    for (const item of nearbyPoisData) {
        if (seenNames.has(item.name)) continue;
        
        const kmDist = item.dist * KM_PER_PIXEL;
        const directionToClosest = getCardinalDirection({ playerPoint, poiPoint: item.poi_point });
        const closestPointStr = `, ClosestPoint:(${Math.round(item.poi_point[0])},${Math.round(item.poi_point[1])})`;
        let displayText = "";

        if (item.type === 'span') {
            let startDegree = Math.round((item.min_angle + 360) % 360);
            let endDegree = Math.round((item.max_angle + 360) % 360);
            
            let span_text = "";
            if (((endDegree - startDegree + 360) % 360) < 5) {
                span_text = `in the ${directionToClosest}`;
            } else {
                const min_point = [playerX + Math.sin(item.min_angle * Math.PI / 180), playerY - Math.cos(item.min_angle * Math.PI / 180)];
                const max_point = [playerX + Math.sin(item.max_angle * Math.PI / 180), playerY - Math.cos(item.max_angle * Math.PI / 180)];
                let dir1 = getCardinalDirection({playerPoint, poiPoint: min_point});
                let dir2 = getCardinalDirection({playerPoint, poiPoint: max_point});

                if (((endDegree - startDegree + 360) % 360) > 180) {
                    [startDegree, endDegree] = [endDegree, startDegree];
                    [dir1, dir2] = [dir2, dir1];
                }
                
                const degree_text = ` [${startDegree}°-${endDegree}°]`;
                span_text = (dir1 !== dir2) ? `spanning from ${dir1} to ${dir2}${degree_text}` : `entirely in the ${dir1}${degree_text}`;
            }
            displayText = `${item.name} (~${kmDist.toFixed(1)} km ${directionToClosest}, ${span_text}${closestPointStr})`;
        } 
        else if (item.type === 'path') {
            const path = item.path_data, idx = item.index;
            const vecBefore = idx > 0 ? [path[idx][0] - path[idx-1][0], path[idx][1] - path[idx-1][1]] : null;
            const vecAfter = idx < path.length - 2 ? [path[idx+2][0] - path[idx+1][0], path[idx+2][1] - path[idx+1][1]] : null;
            const dirBefore = vecBefore ? getCardinalDirection({vector: vecBefore}) : null;
            const dirAfter = vecAfter ? getCardinalDirection({vector: vecAfter}) : null;
            let pathText = '';
            if (dirBefore && dirAfter) {
                pathText = dirBefore !== dirAfter ? `curving from ${dirBefore} to ${dirAfter}` : `running straight ${dirBefore}`;
            } else if (dirBefore) {
                pathText = `ending from the ${dirBefore}`;
            } else if (dirAfter) {
                pathText = `heading ${dirAfter}`;
            } else {
                const vecCurrent = [path[1][0] - path[0][0], path[1][1] - path[0][1]];
                pathText = `running ${getCardinalDirection({vector: vecCurrent})}`;
            }
            displayText = `${item.name} (~${kmDist.toFixed(1)} km ${directionToClosest}, ${pathText}${closestPointStr})`;
        } 
        else { // type is 'point'
            displayText = `${item.name} (~${kmDist.toFixed(1)} km ${directionToClosest}${closestPointStr})`;
        }
        finalPois.push(displayText);
        seenNames.add(item.name);
    }
    
    const playerLocationStr = `(${Math.round(playerX)}, ${Math.round(playerY)})`;
    const containingStr = containingRegions.length > 0 ? containingRegions.join(", ") : "None";
    const nearbyStr = finalPois.length > 0 ? finalPois.join(", ") : "None";
    
    return `[LocationAnalysis: PlayerLocation={${playerLocationStr}}, ContainingRegions={${containingStr}}, NearbyPOIs={${nearbyStr}}]`;
}

})();