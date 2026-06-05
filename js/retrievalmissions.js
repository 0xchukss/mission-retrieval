/*
 * Mission Retrieval custom mission layer.
 */

(function () {
    var glowGreen = "#6dff85";

    GTA.RetrievalMissionConfig = {
        projectName: "Mission Retrieval",
        characterName: "Adam",
        totalMissions: 7,
        totalSubmissions: 94,
        missions: [
            {
                id: 1,
                name: "Dense Symbols",
                logo: "dense-symbols",
                color: glowGreen,
                accent: "#ffe451",
                submissions: ["$", "%", "&", "?", "@"]
            },
            {
                id: 2,
                name: "Containers",
                logo: "containers",
                color: glowGreen,
                accent: "#76ff8f",
                submissions: ["(", ")", "<", ">", "[", "]", "{", "}"]
            },
            {
                id: 3,
                name: "Floating Marks",
                logo: "floating-marks",
                color: "#ff6a55",
                accent: "#ff574b",
                submissions: ["!", "\"", "'", ",", ".", ":", ";", "^", "`"]
            },
            {
                id: 4,
                name: "Crossbars",
                logo: "crossbars",
                color: "#ffe45c",
                accent: "#ffda4b",
                submissions: ["#", "*", "+", "E", "F", "H", "I", "L", "T", "f", "t"]
            },
            {
                id: 5,
                name: "Ghosts",
                logo: "ghosts",
                color: "#b966ff",
                accent: "#ad5dff",
                submissions: ["\u2423", "-", "1", "4", "7", "=", "_", "i", "j", "l", "r", "|"]
            },
            {
                id: 6,
                name: "Angles",
                logo: "angles",
                color: "#ff9a24",
                accent: "#ff8e1a",
                submissions: ["/", "A", "K", "M", "N", "V", "W", "X", "Y", "Z", "\\", "k", "v", "w", "x", "y", "z"]
            },
            {
                id: 7,
                name: "Curves",
                logo: "curves",
                color: "#d7dde1",
                accent: "#c8d0d6",
                submissions: ["0", "2", "3", "5", "6", "8", "9", "B", "C", "D", "G", "J", "O", "P", "Q", "R", "S", "U", "a", "b", "c", "d", "e", "g", "h", "m", "n", "o", "p", "q", "s", "u"]
            }
        ]
    };

    var missionMarkerOffsets = [
        [-160, 18],
        [240, -160],
        [-270, 210],
        [320, 180],
        [-360, -200],
        [420, -20],
        [-80, 330]
    ];

    var submissionOffsets = [
        [-820, -470],
        [660, -620],
        [-740, 520],
        [940, 340],
        [90, 900],
        [-1180, 120],
        [1220, -80],
        [430, -1040],
        [-460, 1120],
        [1360, 680],
        [-1320, -760],
        [820, 1120],
        [-980, 930],
        [1120, -960]
    ];

    GTA.RetrievalMissions = function (game) {
        this.game = game;
        this.config = GTA.RetrievalMissionConfig;
        this.currentMissionIndex = 0;
        this.collectibles = [];
        this.collected = {};
        this.time = 0;
        this.transitioning = false;
        this.completedMissions = 0;
        this.knownSubmissions = this.countKnownSubmissions();
        this.phase = "marker";
        this.mapExpanded = false;
        this.mapDrawTimer = 0;
    };

    GTA.RetrievalMissions.prototype.countKnownSubmissions = function () {
        var total = 0,
            i;

        for (i = 0; i < this.config.missions.length; i += 1) {
            total += this.config.missions[i].submissions.length;
        }

        return total;
    };

    GTA.RetrievalMissions.prototype.start = function () {
        this.injectStyles();
        this.createHud();
        this.loadMission(0);
    };

    GTA.RetrievalMissions.prototype.injectStyles = function () {
        var style = document.createElement("style");

        style.type = "text/css";
        style.appendChild(document.createTextNode(
            "#missionRetrievalHud{" +
                "position:absolute;left:12px;top:58px;width:290px;color:#dfffe6;" +
                "font:12px/1.35 Arial,Helvetica,sans-serif;z-index:5;pointer-events:none;" +
                "text-shadow:0 0 8px rgba(109,255,133,.75);" +
            "}" +
            "#missionRetrievalHud .panel{" +
                "background:rgba(1,8,12,.76);border:1px solid rgba(109,255,133,.5);" +
                "box-shadow:0 0 22px rgba(31,255,91,.22);padding:12px;" +
            "}" +
            "#missionRetrievalHud .title{" +
                "font-weight:bold;font-size:18px;text-transform:uppercase;letter-spacing:0;" +
                "color:#fff;margin-bottom:2px;" +
            "}" +
            "#missionRetrievalHud .meta{color:#93ffad;margin-bottom:10px;}" +
            "#missionRetrievalHud .missionRow{display:flex;align-items:center;gap:10px;margin-bottom:10px;}" +
            "#missionRetrievalHud canvas{width:64px;height:64px;image-rendering:pixelated;flex:0 0 auto;}" +
            "#missionRetrievalHud .missionName{font-size:15px;font-weight:bold;color:#fff;text-transform:uppercase;}" +
            "#missionRetrievalHud .missionCount{color:#9cfab0;}" +
            "#missionRetrievalHud .progressBar{height:8px;background:rgba(255,255,255,.12);overflow:hidden;margin:8px 0;}" +
            "#missionRetrievalHud .progressBar span{display:block;height:100%;width:0;background:#6dff85;box-shadow:0 0 12px #6dff85;}" +
            "#missionRetrievalHud .symbols{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;}" +
            "#missionRetrievalHud .symbol{" +
                "min-width:30px;height:30px;display:flex;align-items:center;justify-content:center;" +
                "font:bold 22px/1 Courier New,monospace;color:#152416;border:1px solid rgba(109,255,133,.32);" +
                "background:rgba(109,255,133,.14);" +
            "}" +
            "#missionRetrievalHud .symbol.done{" +
                "color:#fff;background:rgba(109,255,133,.44);box-shadow:0 0 12px rgba(109,255,133,.8);" +
            "}" +
            "#missionRetrievalHud .phase{" +
                "color:#b8ffc4;text-transform:uppercase;margin-top:8px;" +
            "}" +
            "#missionRetrievalToast{" +
                "position:absolute;left:50%;top:18%;transform:translate(-50%,-20px);opacity:0;z-index:7;" +
                "font:bold 28px/1 Arial,Helvetica,sans-serif;color:#fff;text-transform:uppercase;" +
                "text-shadow:0 0 18px #6dff85,0 0 34px #2cff55;pointer-events:none;transition:opacity .18s,transform .18s;" +
            "}" +
            "#missionRetrievalToast.show{opacity:1;transform:translate(-50%,0);}" +
            "#missionRetrievalLoader{" +
                "position:absolute;inset:0;display:none;align-items:center;justify-content:center;z-index:6;" +
                "background:radial-gradient(circle at center,rgba(31,255,91,.2),rgba(0,0,0,.86) 58%);" +
                "color:#fff;text-align:center;text-transform:uppercase;pointer-events:none;" +
                "font:bold 30px/1.25 Arial,Helvetica,sans-serif;text-shadow:0 0 20px #6dff85;" +
            "}" +
            "#missionRetrievalLoader.show{display:flex;}" +
            "#missionRetrievalLoader .small{font-size:13px;color:#9cffad;margin-top:10px;}" +
            "#missionRetrievalMap{" +
                "position:absolute;right:12px;top:12px;width:194px;z-index:12;color:#dfffe6;" +
                "font:11px/1.2 Arial,Helvetica,sans-serif;text-transform:uppercase;pointer-events:auto;cursor:pointer;" +
                "background:rgba(1,8,12,.78);border:1px solid rgba(109,255,133,.45);padding:8px;" +
                "box-shadow:0 0 22px rgba(31,255,91,.24);" +
            "}" +
            "#missionRetrievalMap .mapTitle{display:flex;justify-content:space-between;margin-bottom:6px;color:#9cffad;}" +
            "#missionRetrievalMap canvas{display:block;width:180px;height:180px;image-rendering:pixelated;background:#020608;}" +
            "#missionRetrievalMap.expanded{" +
                "left:50%;top:50%;right:auto;transform:translate(-50%,-50%);" +
                "width:536px;max-width:calc(100vw - 32px);z-index:13;padding:12px;" +
            "}" +
            "#missionRetrievalMap.expanded canvas{width:512px;height:512px;max-width:calc(100vw - 56px);max-height:calc(100vh - 92px);}"
        ));

        document.getElementsByTagName("head")[0].appendChild(style);
    };

    GTA.RetrievalMissions.prototype.createHud = function () {
        var hud = document.createElement("div"),
            toast = document.createElement("div"),
            loader = document.createElement("div");

        hud.id = "missionRetrievalHud";
        hud.innerHTML =
            "<div class=\"panel\">" +
                "<div class=\"title\"></div>" +
                "<div class=\"meta\"></div>" +
                "<div class=\"missionRow\">" +
                    "<canvas width=\"128\" height=\"128\"></canvas>" +
                    "<div>" +
                        "<div class=\"missionName\"></div>" +
                        "<div class=\"missionCount\"></div>" +
                    "</div>" +
                "</div>" +
                "<div class=\"progressText\"></div>" +
                "<div class=\"progressBar\"><span></span></div>" +
                "<div class=\"symbols\"></div>" +
            "</div>";

        toast.id = "missionRetrievalToast";
        loader.id = "missionRetrievalLoader";
        loader.innerHTML = "<div><div class=\"message\"></div><div class=\"small\"></div></div>";

        document.body.appendChild(hud);
        document.body.appendChild(toast);
        document.body.appendChild(loader);

        this.hud = hud;
        this.logoCanvas = hud.getElementsByTagName("canvas")[0];
        this.toast = toast;
        this.loader = loader;

        this.createNavigationMap();
    };

    GTA.RetrievalMissions.prototype.createNavigationMap = function () {
        var panel = document.createElement("div"),
            self = this;

        panel.id = "missionRetrievalMap";
        panel.innerHTML =
            "<div class=\"mapTitle\"><span>Nav Map</span><span></span></div>" +
            "<canvas width=\"180\" height=\"180\"></canvas>";

        panel.onclick = function () {
            self.mapExpanded = !self.mapExpanded;
            panel.className = self.mapExpanded ? "expanded" : "";
            self.updateNavigationMap(true);
        };

        document.body.appendChild(panel);

        this.mapPanel = panel;
        this.mapCanvas = panel.getElementsByTagName("canvas")[0];
        this.buildBaseMap();
    };

    GTA.RetrievalMissions.prototype.buildBaseMap = function () {
        var canvas = document.createElement("canvas"),
            ctx,
            image,
            data,
            x,
            y,
            type,
            color,
            index,
            colors = {
                0: [5, 9, 12, 255],
                1: [20, 49, 72, 255],
                2: [58, 64, 85, 255],
                3: [104, 112, 102, 255],
                4: [42, 82, 48, 255],
                5: [12, 22, 18, 255],
                6: [48, 48, 55, 255],
                7: [48, 48, 55, 255]
            };

        canvas.width = 256;
        canvas.height = 256;
        ctx = canvas.getContext("2d");
        image = ctx.createImageData(256, 256);
        data = image.data;

        for (y = 0; y < 256; y += 1) {
            for (x = 0; x < 256; x += 1) {
                type = this.getColumnType(x, y);
                color = colors[type] || colors[0];
                index = ((y * 256) + x) * 4;
                data[index] = color[0];
                data[index + 1] = color[1];
                data[index + 2] = color[2];
                data[index + 3] = color[3];
            }
        }

        ctx.putImageData(image, 0, 0);
        this.baseMap = canvas;
    };

    GTA.RetrievalMissions.prototype.loadMission = function (index) {
        var mission = this.config.missions[index];

        this.clearCollectibles();
        this.currentMissionIndex = index;
        this.collected = {};
        this.transitioning = false;
        this.phase = "marker";

        if (!mission) {
            this.showLockedCampaign();
            return;
        }

        this.currentMission = mission;
        this.drawLogo(this.logoCanvas, mission);
        this.updateHud();

        this.spawnLogoMarker(mission);
        this.showToast("Mission " + mission.id + ": " + mission.name);
        this.updateNavigationMap(true);
    };

    GTA.RetrievalMissions.prototype.clearCollectibles = function () {
        var i;

        for (i = 0; i < this.collectibles.length; i += 1) {
            this.game.scene.remove(this.collectibles[i].mesh);
        }

        this.collectibles = [];
    };

    GTA.RetrievalMissions.prototype.spawnSubmission = function (mission, symbol, index) {
        var offset = submissionOffsets[index % submissionOffsets.length],
            rowShift = Math.floor(index / submissionOffsets.length) * 260,
            targetX = this.game.player.position.x + offset[0] + rowShift,
            targetY = this.game.player.position.y + offset[1] - rowShift,
            position = this.findHidingSpot(targetX, targetY, index),
            mesh = this.createCanvasMesh(this.createSymbolCanvas(symbol, mission.color), 48, 48);

        mesh.position.set(position.x, position.y, 154);
        this.game.scene.add(mesh);

        this.collectibles.push({
            type: "submission",
            symbol: symbol,
            index: index,
            mesh: mesh,
            baseZ: 154,
            radius: 86,
            collected: false
        });
    };

    GTA.RetrievalMissions.prototype.spawnLogoMarker = function (mission) {
        var offset = missionMarkerOffsets[this.currentMissionIndex % missionMarkerOffsets.length],
            targetX = this.game.player.position.x + offset[0],
            targetY = this.game.player.position.y + offset[1],
            position = this.keepAwayFromPlayer(this.findHidingSpot(targetX, targetY, 0, true), 150),
            canvas = document.createElement("canvas"),
            mesh;

        canvas.width = 128;
        canvas.height = 128;
        this.drawLogo(canvas, mission);

        mesh = this.createCanvasMesh(canvas, 58, 58);
        mesh.position.set(position.x, position.y, 158);
        this.game.scene.add(mesh);

        this.collectibles.push({
            type: "logo",
            symbol: mission.name,
            index: -1,
            mesh: mesh,
            baseZ: 158,
            radius: 72,
            collected: false
        });
    };

    GTA.RetrievalMissions.prototype.keepAwayFromPlayer = function (position, minDistance) {
        var dx = position.x - this.game.player.position.x,
            dy = position.y - this.game.player.position.y,
            distance = Math.sqrt((dx * dx) + (dy * dy)),
            scale;

        if (distance >= minDistance) {
            return position;
        }

        if (distance < 1) {
            dx = -1;
            dy = 0;
            distance = 1;
        }

        scale = minDistance / distance;

        return {
            x: this.game.player.position.x + (dx * scale),
            y: this.game.player.position.y + (dy * scale)
        };
    };

    GTA.RetrievalMissions.prototype.findHidingSpot = function (targetX, targetY, index, allowNearRoad) {
        var targetBlock = this.worldToBlock(targetX, targetY),
            best = null,
            bestScore = 999999,
            radius,
            dx,
            dy,
            blockX,
            blockY,
            score,
            type,
            nearBuilding,
            existingPenalty,
            maxRadius = allowNearRoad ? 10 : 22;

        for (radius = 0; radius <= maxRadius; radius += 1) {
            for (dx = -radius; dx <= radius; dx += 1) {
                for (dy = -radius; dy <= radius; dy += 1) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
                        continue;
                    }

                    blockX = targetBlock.x + dx;
                    blockY = targetBlock.y + dy;

                    if (!this.isInsideMap(blockX, blockY)) {
                        continue;
                    }

                    type = this.getColumnType(blockX, blockY);

                    if (type === 1 || type === 5 || type === 0) {
                        continue;
                    }

                    nearBuilding = this.hasAdjacentBuilding(blockX, blockY);
                    existingPenalty = this.getExistingMarkerPenalty(blockX, blockY);
                    score = (Math.abs(dx) + Math.abs(dy)) * 4 + existingPenalty;

                    if (type === 2) {
                        score += allowNearRoad ? 25 : 120;
                    }

                    if (!nearBuilding) {
                        score += allowNearRoad ? 35 : 140;
                    }

                    if (type === 3) {
                        score -= 20;
                    }

                    if (score < bestScore) {
                        bestScore = score;
                        best = {
                            x: blockX,
                            y: blockY
                        };
                    }
                }
            }

            if (best !== null && bestScore < 80) {
                break;
            }
        }

        if (best === null) {
            best = targetBlock;
        }

        return this.blockToWorld(best.x, best.y, index);
    };

    GTA.RetrievalMissions.prototype.getExistingMarkerPenalty = function (blockX, blockY) {
        var i,
            collectible,
            markerBlock,
            distance,
            penalty = 0;

        for (i = 0; i < this.collectibles.length; i += 1) {
            collectible = this.collectibles[i];
            markerBlock = this.worldToBlock(collectible.mesh.position.x, collectible.mesh.position.y);
            distance = Math.abs(markerBlock.x - blockX) + Math.abs(markerBlock.y - blockY);

            if (distance < 8) {
                penalty += (8 - distance) * 90;
            }
        }

        return penalty;
    };

    GTA.RetrievalMissions.prototype.worldToBlock = function (worldX, worldY) {
        return {
            x: Math.max(1, Math.min(254, Math.round(worldX / 64))),
            y: Math.max(1, Math.min(254, Math.round(-worldY / 64)))
        };
    };

    GTA.RetrievalMissions.prototype.blockToWorld = function (blockX, blockY, index) {
        var nudge = ((index % 3) - 1) * 12;

        return {
            x: (blockX * 64) + 8 + nudge,
            y: -(blockY * 64) - 8 - nudge
        };
    };

    GTA.RetrievalMissions.prototype.isInsideMap = function (blockX, blockY) {
        return blockX > 0 && blockX < 255 && blockY > 0 && blockY < 255 &&
            this.game.map.base[blockX] !== undefined &&
            this.game.map.base[blockX][blockY] !== undefined;
    };

    GTA.RetrievalMissions.prototype.getColumnType = function (blockX, blockY) {
        var column,
            block;

        if (!this.isInsideMap(blockX, blockY)) {
            return 0;
        }

        column = this.game.map.base[blockX][blockY];
        block = column.blocks[2] || column.blocks[column.blocks.length - 1];

        return block ? block.type : 0;
    };

    GTA.RetrievalMissions.prototype.hasAdjacentBuilding = function (blockX, blockY) {
        return this.getColumnType(blockX + 1, blockY) === 5 ||
            this.getColumnType(blockX - 1, blockY) === 5 ||
            this.getColumnType(blockX, blockY + 1) === 5 ||
            this.getColumnType(blockX, blockY - 1) === 5;
    };

    GTA.RetrievalMissions.prototype.createCanvasMesh = function (canvas, width, height) {
        var texture = new THREE.Texture(canvas),
            material,
            mesh;

        texture.needsUpdate = true;

        material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height, 1, 1), material);
        mesh.doubleSided = true;

        return mesh;
    };

    GTA.RetrievalMissions.prototype.createSymbolCanvas = function (symbol, color) {
        var canvas = document.createElement("canvas"),
            ctx;

        canvas.width = 256;
        canvas.height = 256;
        ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, 256, 256);
        ctx.fillStyle = "rgba(0,8,10,.74)";
        ctx.fillRect(28, 28, 200, 200);
        ctx.strokeStyle = "rgba(109,255,133,.55)";
        ctx.lineWidth = 3;
        ctx.shadowColor = color;
        ctx.shadowBlur = 28;
        ctx.strokeRect(28, 28, 200, 200);

        ctx.font = "bold 158px Courier New,monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = color;
        ctx.shadowBlur = 34;
        ctx.fillText(symbol, 128, 132);

        ctx.shadowBlur = 0;
        ctx.fillStyle = "#ffffff";
        ctx.globalAlpha = 0.88;
        ctx.fillText(symbol, 128, 132);
        ctx.globalAlpha = 1;

        return canvas;
    };

    GTA.RetrievalMissions.prototype.drawLogo = function (canvas, mission) {
        var ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.scale(canvas.width / 128, canvas.height / 128);

        ctx.fillStyle = "#03090c";
        ctx.fillRect(10, 8, 108, 112);

        ctx.shadowColor = mission.color;
        ctx.shadowBlur = 18;
        ctx.strokeStyle = "rgba(109,255,133,.72)";
        ctx.lineWidth = 2;
        ctx.strokeRect(12, 10, 104, 108);

        switch (mission.logo) {
            case "containers":
                this.drawContainersLogo(ctx, mission);
                break;

            case "floating-marks":
                this.drawFloatingMarksLogo(ctx, mission);
                break;

            case "crossbars":
                this.drawCrossbarsLogo(ctx, mission);
                break;

            case "ghosts":
                this.drawGhostsLogo(ctx, mission);
                break;

            case "angles":
                this.drawAnglesLogo(ctx, mission);
                break;

            case "curves":
                this.drawCurvesLogo(ctx, mission);
                break;

            default:
                this.drawDenseSymbolsLogo(ctx, mission);
                break;
        }

        ctx.shadowBlur = 12;
        ctx.fillStyle = mission.color;
        ctx.font = "bold 11px Courier New,monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(mission.name.toUpperCase(), 64, 98);

        ctx.restore();
    };

    GTA.RetrievalMissions.prototype.drawPixelPattern = function (ctx, mission, pixels, startX, startY, size) {
        var x,
            y;

        ctx.shadowColor = mission.color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = mission.accent;

        for (y = 0; y < pixels.length; y += 1) {
            for (x = 0; x < pixels[y].length; x += 1) {
                if (pixels[y].charAt(x) === "1") {
                    ctx.fillRect(startX + (x * size), startY + (y * size), size - 1, size - 1);
                }
            }
        }
    };

    GTA.RetrievalMissions.prototype.drawDenseSymbolsLogo = function (ctx, mission) {
        var pixels = [
                "0011110000",
                "0111111000",
                "1100001100",
                "1100000000",
                "1101110000",
                "1101110011",
                "1100000110",
                "1100001100",
                "1111111000",
                "0111110000"
            ],
            size = 6,
            startX = 32,
            startY = 18,
            x,
            y;

        ctx.shadowColor = mission.color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = mission.accent;

        for (y = 0; y < pixels.length; y += 1) {
            for (x = 0; x < pixels[y].length; x += 1) {
                if (pixels[y].charAt(x) === "1") {
                    ctx.fillRect(startX + (x * size), startY + (y * size), size - 1, size - 1);
                }
            }
        }

        ctx.font = "bold 34px Courier New,monospace";
        ctx.fillText("?", 87, 70);
    };

    GTA.RetrievalMissions.prototype.drawContainersLogo = function (ctx, mission) {
        var pixels = [
                "0001110000",
                "0001111000",
                "0001111100",
                "0001110110",
                "0001110000",
                "0001110000",
                "0001110000",
                "1001110000",
                "0001110000",
                "0001111000"
            ],
            size = 6,
            startX = 34,
            startY = 18,
            x,
            y;

        ctx.shadowColor = mission.color;
        ctx.shadowBlur = 18;
        ctx.fillStyle = mission.accent;

        for (y = 0; y < pixels.length; y += 1) {
            for (x = 0; x < pixels[y].length; x += 1) {
                if (pixels[y].charAt(x) === "1") {
                    ctx.fillRect(startX + (x * size), startY + (y * size), size - 1, size - 1);
                }
            }
        }

        ctx.fillRect(24, 67, 7, 7);
    };

    GTA.RetrievalMissions.prototype.drawFloatingMarksLogo = function (ctx, mission) {
        this.drawPixelPattern(ctx, mission, [
            "1000010001",
            "0111110100",
            "0011100000",
            "0001111000",
            "0011110100",
            "0101110010",
            "0001110000",
            "0000100000",
            "0010100100",
            "0100000010"
        ], 31, 18, 6);
    };

    GTA.RetrievalMissions.prototype.drawCrossbarsLogo = function (ctx, mission) {
        this.drawPixelPattern(ctx, mission, [
            "1111111000",
            "1100000000",
            "1100000000",
            "1111110000",
            "1100000000",
            "1100000010",
            "1100000110",
            "1100011100",
            "1111111000",
            "1111111000"
        ], 29, 18, 6);
    };

    GTA.RetrievalMissions.prototype.drawGhostsLogo = function (ctx, mission) {
        this.drawPixelPattern(ctx, mission, [
            "1000000010",
            "0000000000",
            "0001001000",
            "0000000000",
            "0010000100",
            "0001110000",
            "0011111000",
            "0101101100",
            "0000100000",
            "0010000100"
        ], 31, 18, 6);
    };

    GTA.RetrievalMissions.prototype.drawAnglesLogo = function (ctx, mission) {
        this.drawPixelPattern(ctx, mission, [
            "0000100000",
            "0001110000",
            "0010101000",
            "0110101100",
            "1100100110",
            "0000100000",
            "0000100000",
            "0000100000",
            "0011111000",
            "0011111000"
        ], 31, 18, 6);
    };

    GTA.RetrievalMissions.prototype.drawCurvesLogo = function (ctx, mission) {
        this.drawPixelPattern(ctx, mission, [
            "0111111000",
            "1111111100",
            "1100000000",
            "1101110000",
            "1101111000",
            "1100001100",
            "1100001100",
            "1101111000",
            "1111110000",
            "0111100000"
        ], 31, 18, 6);
    };

    GTA.RetrievalMissions.prototype.update = function (delta) {
        var i,
            collectible,
            dx,
            dy,
            distance,
            player = this.game.player;

        this.time += delta;

        for (i = 0; i < this.collectibles.length; i += 1) {
            collectible = this.collectibles[i];
            collectible.mesh.position.z = collectible.baseZ + Math.sin(this.time * 3 + i) * 8;
            collectible.mesh.scale.x = 1 + Math.sin(this.time * 4 + i) * 0.045;
            collectible.mesh.scale.y = collectible.mesh.scale.x;

            if (this.transitioning || collectible.collected) {
                continue;
            }

            dx = collectible.mesh.position.x - player.position.x;
            dy = collectible.mesh.position.y - player.position.y;
            distance = Math.sqrt((dx * dx) + (dy * dy));

            if (collectible.type === "logo" && this.phase === "marker" && distance <= collectible.radius) {
                this.activateMission(collectible);
            } else if (collectible.type === "submission" && this.phase === "submissions" && distance <= collectible.radius) {
                this.collect(collectible);
            }
        }

        this.mapDrawTimer += delta;

        if (this.mapDrawTimer > 0.12) {
            this.mapDrawTimer = 0;
            this.updateNavigationMap(false);
        }
    };

    GTA.RetrievalMissions.prototype.activateMission = function (marker) {
        var mission = this.currentMission,
            self = this,
            i;

        if (this.transitioning) {
            return;
        }

        marker.collected = true;
        marker.mesh.visible = false;
        this.phase = "loading";
        this.transitioning = true;

        if (GTA.Audio !== undefined) {
            GTA.Audio.playMission();
        }

        this.showToast("Mission " + mission.id + " Loaded");
        this.loader.getElementsByClassName("message")[0].innerHTML = "Mission " + mission.id + ": " + mission.name;
        this.loader.getElementsByClassName("small")[0].innerHTML =
            "Loading " + mission.submissions.length + " submissions";
        this.loader.className = "show";
        this.updateHud();
        this.updateNavigationMap(true);

        window.setTimeout(function () {
            self.loader.className = "";
            self.phase = "submissions";
            self.transitioning = false;

            for (i = 0; i < mission.submissions.length; i += 1) {
                self.spawnSubmission(mission, mission.submissions[i], i);
            }

            self.showToast("Search " + mission.name);
            self.updateHud();
            self.updateNavigationMap(true);
        }, 1200);
    };

    GTA.RetrievalMissions.prototype.collect = function (collectible) {
        collectible.collected = true;
        collectible.mesh.visible = false;
        this.collected[collectible.symbol + "-" + collectible.index] = true;

        if (GTA.Audio !== undefined) {
            GTA.Audio.playCollect();
        }

        this.showToast("Collected " + collectible.symbol);
        this.updateHud();
        this.updateNavigationMap(true);

        if (this.getCollectedCount() >= this.currentMission.submissions.length) {
            this.completeMission();
        }
    };

    GTA.RetrievalMissions.prototype.getCollectedCount = function () {
        var count = 0,
            key;

        for (key in this.collected) {
            if (this.collected.hasOwnProperty(key)) {
                count += 1;
            }
        }

        return count;
    };

    GTA.RetrievalMissions.prototype.updateHud = function () {
        var mission = this.currentMission,
            collected = this.getCollectedCount(),
            symbols = this.hud.getElementsByClassName("symbols")[0],
            progress = mission ? (collected / mission.submissions.length) * 100 : 0,
            i,
            symbol,
            item,
            key;

        this.hud.getElementsByClassName("title")[0].innerHTML = this.config.projectName;
        this.hud.getElementsByClassName("meta")[0].innerHTML =
            "Character: " + this.config.characterName + " | Known submissions: " +
            this.knownSubmissions + "/" + this.config.totalSubmissions;

        if (!mission) {
            return;
        }

        this.hud.getElementsByClassName("missionName")[0].innerHTML = mission.name;
        this.hud.getElementsByClassName("missionCount")[0].innerHTML =
            "Mission " + mission.id + "/" + this.config.totalMissions;
        this.hud.getElementsByClassName("progressText")[0].innerHTML = this.phase === "submissions" ?
            "Collected " + collected + "/" + mission.submissions.length :
            "Mission marker active";
        this.hud.getElementsByClassName("progressBar")[0].getElementsByTagName("span")[0].style.width =
            this.phase === "submissions" ? progress + "%" : "0%";

        symbols.innerHTML = "";

        if (this.phase !== "submissions") {
            item = document.createElement("div");
            item.className = "phase";
            item.appendChild(document.createTextNode("Enter mission to reveal submissions"));
            symbols.appendChild(item);
            return;
        }

        for (i = 0; i < mission.submissions.length; i += 1) {
            symbol = mission.submissions[i];
            key = symbol + "-" + i;
            item = document.createElement("div");
            item.className = "symbol" + (this.collected[key] ? " done" : "");
            item.appendChild(document.createTextNode(symbol));
            symbols.appendChild(item);
        }
    };

    GTA.RetrievalMissions.prototype.updateNavigationMap = function (force) {
        var canvas = this.mapCanvas,
            ctx,
            size,
            playerBlock,
            i,
            collectible,
            markerBlock,
            title;

        if (!canvas || !this.baseMap) {
            return;
        }

        if (!force && this.mapExpanded === false && this.phase === "loading") {
            return;
        }

        size = this.mapExpanded ? 512 : 180;

        if (canvas.width !== size) {
            canvas.width = size;
            canvas.height = size;
        }

        ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(this.baseMap, 0, 0, size, size);

        ctx.fillStyle = "rgba(0,0,0,.22)";
        ctx.fillRect(0, 0, size, size);

        for (i = 0; i < this.collectibles.length; i += 1) {
            collectible = this.collectibles[i];

            if (collectible.collected || collectible.mesh.visible === false) {
                continue;
            }

            markerBlock = this.worldToBlock(collectible.mesh.position.x, collectible.mesh.position.y);

            if (collectible.type === "logo") {
                this.drawMapMarker(ctx, markerBlock, size, "#ffe451", 7, true);
            } else if (this.phase === "submissions") {
                this.drawMapMarker(ctx, markerBlock, size, this.currentMission.color, 5, false);
            }
        }

        playerBlock = this.worldToBlock(this.game.player.position.x, this.game.player.position.y);
        this.drawMapMarker(ctx, playerBlock, size, "#ffffff", 5, true);

        ctx.strokeStyle = "rgba(109,255,133,.58)";
        ctx.lineWidth = this.mapExpanded ? 3 : 2;
        ctx.strokeRect(0, 0, size, size);

        title = this.mapPanel.getElementsByTagName("span")[1];
        title.innerHTML = this.currentMission ? "M" + this.currentMission.id + " " + this.phase : "";
    };

    GTA.RetrievalMissions.prototype.drawMapMarker = function (ctx, block, size, color, radius, ring) {
        var x = (block.x / 256) * size,
            y = (block.y / 256) * size,
            scaledRadius = this.mapExpanded ? radius + 3 : radius;

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = this.mapExpanded ? 16 : 9;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, scaledRadius, 0, Math.PI * 2, true);
        ctx.fill();

        if (ring) {
            ctx.strokeStyle = color;
            ctx.lineWidth = this.mapExpanded ? 3 : 2;
            ctx.beginPath();
            ctx.arc(x, y, scaledRadius + 6, 0, Math.PI * 2, true);
            ctx.stroke();
        }

        ctx.restore();
    };

    GTA.RetrievalMissions.prototype.completeMission = function () {
        var mission = this.currentMission,
            nextMission = this.config.missions[this.currentMissionIndex + 1],
            self = this;

        if (this.transitioning) {
            return;
        }

        this.transitioning = true;
        this.completedMissions += 1;

        if (GTA.Audio !== undefined) {
            GTA.Audio.playMission();
        }

        this.showToast("Mission " + mission.id + " Successful");
        this.loader.getElementsByClassName("message")[0].innerHTML = "Mission " + mission.id + " Successful";
        this.loader.getElementsByClassName("small")[0].innerHTML =
            nextMission ? "Loading Mission " + nextMission.id : "Campaign complete";
        this.loader.className = "show";

        window.setTimeout(function () {
            self.loader.className = "";
            self.loadMission(self.currentMissionIndex + 1);
        }, 1900);
    };

    GTA.RetrievalMissions.prototype.showLockedCampaign = function () {
        this.currentMission = null;
        this.phase = "complete";
        this.updateHud();
        this.loader.getElementsByClassName("message")[0].innerHTML = "Campaign Complete";
        this.loader.getElementsByClassName("small")[0].innerHTML =
            "All " + this.config.totalSubmissions + " submissions recovered";
        this.loader.className = "show";
    };

    GTA.RetrievalMissions.prototype.showToast = function (message) {
        var toast = this.toast;

        toast.innerHTML = message;
        toast.className = "show";

        window.clearTimeout(this.toastTimer);
        this.toastTimer = window.setTimeout(function () {
            toast.className = "";
        }, 1100);
    };
}());
