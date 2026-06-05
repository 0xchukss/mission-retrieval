/*
 * Mission Retrieval experience layer: intro, menu, audio, and ambient NPCs.
 */

(function () {
    var videoPath = "assets/mission-loading.mp4",
        musicPath = "assets/background-music.mp3",
        footstepPath = "assets/running-steps.mp3",
        crashPath = "assets/car-crash.mp3",
        drivingPath = "assets/car-driving.mp3";

    GTA.Audio = {
        context: null,
        music: null,
        footsteps: null,
        crash: null,
        driving: null,
        footstepsActive: false,
        drivingActive: false,
        audioMonitor: null,
        lastFootstep: 0,
        lastCrash: 0,
        unlocked: false,

        init: function () {
            if (this.music === null) {
                this.music = this.createAudio(musicPath, 0.10, true);
                this.footsteps = this.createAudio(footstepPath, 0.28, true);
                this.crash = this.createAudio(crashPath, 0.7, false);
                this.driving = this.createAudio(drivingPath, 0.68, true);
            }

            this.startLoopMonitor();
            this.attachUnlockListeners();
        },

        createAudio: function (path, volume, loop) {
            var audio = document.createElement("audio");

            audio.src = path;
            audio.loop = loop;
            audio.volume = volume;
            audio.preload = "auto";

            return audio;
        },

        startLoopMonitor: function () {
            var self = this;

            if (this.audioMonitor !== null) {
                return;
            }

            this.audioMonitor = window.setInterval(function () {
                self.refreshLoop(self.footsteps, self.footstepsActive);
                self.refreshLoop(self.driving, self.drivingActive);
            }, 500);
        },

        refreshLoop: function (audio, active) {
            if (audio === null) {
                return;
            }

            audio.loop = true;

            if (active) {
                if (audio.paused || audio.ended) {
                    if (audio.ended) {
                        audio.currentTime = 0;
                    }

                    this.safePlay(audio);
                }
            } else if (!audio.paused) {
                audio.pause();
                audio.currentTime = 0;
            }
        },

        attachUnlockListeners: function () {
            var self = this,
                unlock = function () {
                    self.unlock();
                };

            document.addEventListener("keydown", unlock, false);
            document.addEventListener("click", unlock, false);
        },

        unlock: function () {
            var AudioContext = window.AudioContext || window.webkitAudioContext,
                playPromise;

            if (this.context === null && AudioContext !== undefined) {
                this.context = new AudioContext();
            }

            if (this.context && this.context.resume !== undefined) {
                this.context.resume();
            }

            if (this.music !== null) {
                playPromise = this.music.play();

                if (playPromise && playPromise.catch !== undefined) {
                    playPromise.catch(function () {});
                }
            }

            this.unlocked = true;
        },

        tone: function (frequency, duration, type, volume, slideTo) {
            var oscillator,
                gain,
                now;

            if (this.context === null) {
                this.unlock();
            }

            if (this.context === null) {
                return;
            }

            now = this.context.currentTime;
            oscillator = this.context.createOscillator();
            gain = this.context.createGain();

            oscillator.type = type || "sine";
            oscillator.frequency.setValueAtTime(frequency, now);

            if (slideTo !== undefined) {
                oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
            }

            gain.gain.setValueAtTime(volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            oscillator.connect(gain);
            gain.connect(this.context.destination);
            oscillator.start(now);
            oscillator.stop(now + duration);
        },

        noise: function (duration, volume) {
            var buffer,
                data,
                source,
                gain,
                now,
                i;

            if (this.context === null) {
                this.unlock();
            }

            if (this.context === null) {
                return;
            }

            buffer = this.context.createBuffer(1, this.context.sampleRate * duration, this.context.sampleRate);
            data = buffer.getChannelData(0);

            for (i = 0; i < data.length; i += 1) {
                data[i] = (Math.random() * 2 - 1) * (1 - (i / data.length));
            }

            now = this.context.currentTime;
            source = this.context.createBufferSource();
            gain = this.context.createGain();

            source.buffer = buffer;
            gain.gain.setValueAtTime(volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

            source.connect(gain);
            gain.connect(this.context.destination);
            source.start(now);
        },

        playFootstep: function () {
            var now = Date.now();

            if (this.footsteps !== null) {
                this.setFootsteps(true);
                return;
            }

            if (now - this.lastFootstep < 240) {
                return;
            }

            this.lastFootstep = now;
            this.noise(0.055, 0.075);
            this.tone(95, 0.045, "triangle", 0.035, 65);
        },

        setFootsteps: function (active) {
            if (this.footsteps === null) {
                return;
            }

            this.footstepsActive = active;
            this.refreshLoop(this.footsteps, active);
        },

        playCrash: function () {
            var now = Date.now();

            if (now - this.lastCrash < 650) {
                return;
            }

            this.lastCrash = now;

            if (this.crash !== null) {
                this.crash.currentTime = 0;
                this.safePlay(this.crash);
                return;
            }

            this.noise(0.24, 0.32);
            this.tone(72, 0.22, "sawtooth", 0.16, 36);
        },

        setDriving: function (active) {
            if (this.driving === null) {
                return;
            }

            this.drivingActive = active;
            this.refreshLoop(this.driving, active);
        },

        safePlay: function (audio) {
            var playPromise = audio.play();

            if (playPromise && playPromise.catch !== undefined) {
                playPromise.catch(function () {});
            }
        },

        playCollect: function () {
            this.tone(540, 0.08, "square", 0.09, 920);
            this.tone(920, 0.12, "triangle", 0.07, 1240);
        },

        playMission: function () {
            this.tone(220, 0.1, "triangle", 0.08, 440);
            window.setTimeout(function () {
                GTA.Audio.tone(660, 0.16, "square", 0.07, 990);
            }, 90);
        },

        playMenu: function () {
            this.tone(330, 0.07, "triangle", 0.045, 440);
        }
    };

    GTA.Experience = {
        game: null,
        menu: null,
        guidance: null,
        guidanceTimer: null,
        booted: false,
        bootScreen: null,
        minBootDone: false,
        gameLoaded: false,
        platformMode: "pc",
        gameStarted: false,
        mobileControls: null,
        mobileControlsTimer: null,
        landscapeBlocker: null,
        orientationListenerReady: false,
        startGameCallback: null,
        pendingPhoneStart: false,

        boot: function (startGame) {
            var screen,
                video,
                content,
                self = this;

            GTA.Audio.init();
            this.injectStyles();

            screen = document.createElement("div");
            screen.id = "missionBoot";
            screen.innerHTML =
                "<video autoplay muted playsinline></video>" +
                "<div class=\"bootShade\"></div>" +
                "<div class=\"bootText\">" +
                    "<div class=\"bootTitle\">Mission Retrieval</div>" +
                    "<div class=\"bootSmall\">Choose your platform to begin</div>" +
                    "<div class=\"platformSelect\">" +
                        "<button data-platform=\"pc\">PC</button>" +
                        "<button data-platform=\"phone\">Phone</button>" +
                    "</div>" +
                "</div>";

            video = screen.getElementsByTagName("video")[0];
            video.src = videoPath;
            video.loop = true;
            video.play();

            document.body.appendChild(screen);
            this.bootScreen = screen;
            content = screen.getElementsByClassName("bootText")[0];
            content.offsetHeight;
            content.className = "bootText show";
            this.bindPlatformButtons(screen, startGame);
            this.createLandscapeBlocker();

            window.setTimeout(function () {
                self.minBootDone = true;
                self.finishBoot();
            }, 4000);
        },

        bindPlatformButtons: function (screen, startGame) {
            var buttons = screen.getElementsByTagName("button"),
                self = this,
                i;

            for (i = 0; i < buttons.length; i += 1) {
                buttons[i].onclick = function () {
                    self.selectPlatform(this.getAttribute("data-platform"), startGame);
                };
            }
        },

        selectPlatform: function (mode, startGame) {
            var screen = this.bootScreen,
                small;

            if (this.gameStarted) {
                return;
            }

            this.platformMode = mode === "phone" ? "phone" : "pc";
            this.gameStarted = true;
            this.applyPlatformClass();
            GTA.Audio.unlock();
            GTA.Audio.playMenu();

            if (screen !== null) {
                screen.className = "platformChosen";
                small = screen.getElementsByClassName("bootSmall")[0];

                if (small !== undefined) {
                    small.innerHTML = this.isPhoneMode() ? "Loading phone controls" : "Loading PC controls";
                }
            }

            if (this.isPhoneMode()) {
                this.startPhoneMode(startGame);
                return;
            }

            this.startSelectedGame(startGame);
        },

        applyPlatformClass: function () {
            var body = document.body,
                className = body.className.replace(/\bmissionPhoneMode\b/g, "").replace(/\bmissionPcMode\b/g, "");

            body.className = className + (this.isPhoneMode() ? " missionPhoneMode" : " missionPcMode");
        },

        isPhoneMode: function () {
            return this.platformMode === "phone";
        },

        startSelectedGame: function (startGame) {
            window.setTimeout(function () {
                startGame();
            }, 80);
        },

        startPhoneMode: function (startGame) {
            var self = this;

            this.startGameCallback = startGame;
            this.pendingPhoneStart = true;
            this.bindOrientationListeners();
            this.requestLandscapeLock();
            this.updateLandscapeState();

            window.setTimeout(function () {
                self.updateLandscapeState();
            }, 650);
        },

        bindOrientationListeners: function () {
            var self = this,
                update = function () {
                    window.setTimeout(function () {
                        self.updateLandscapeState();
                    }, 120);
                };

            if (this.orientationListenerReady) {
                return;
            }

            this.orientationListenerReady = true;
            window.addEventListener("resize", update, false);
            window.addEventListener("orientationchange", update, false);
        },

        requestLandscapeLock: function () {
            var doc = document.documentElement,
                requestFullscreen = doc.requestFullscreen ||
                    doc.webkitRequestFullscreen ||
                    doc.mozRequestFullScreen ||
                    doc.msRequestFullscreen,
                orientation = window.screen && window.screen.orientation ? window.screen.orientation : null,
                fullscreenPromise;

            if (requestFullscreen !== undefined &&
                    (document.fullscreenElement === undefined || document.fullscreenElement === null)) {
                try {
                    fullscreenPromise = requestFullscreen.call(doc);

                    if (fullscreenPromise && fullscreenPromise.catch !== undefined) {
                        fullscreenPromise.catch(function () {});
                    }
                } catch (ignoreFullscreen) {}
            }

            if (orientation !== null && orientation.lock !== undefined) {
                try {
                    orientation.lock("landscape").catch(function () {});
                } catch (ignoreLock) {}
            }
        },

        isLandscape: function () {
            var viewport = window.visualViewport;

            return (viewport && viewport.width ? viewport.width : window.innerWidth) >=
                (viewport && viewport.height ? viewport.height : window.innerHeight);
        },

        createLandscapeBlocker: function () {
            var blocker;

            if (this.landscapeBlocker !== null) {
                return;
            }

            blocker = document.createElement("div");
            blocker.id = "missionLandscapeBlocker";
            blocker.innerHTML =
                "<div class=\"landscapePanel\">" +
                    "<div class=\"landscapeTitle\">Rotate Phone</div>" +
                    "<div class=\"landscapeText\">Mission Retrieval phone mode is landscape only.</div>" +
                "</div>";
            document.body.appendChild(blocker);
            this.landscapeBlocker = blocker;
        },

        updateLandscapeState: function () {
            var isReady;

            if (!this.isPhoneMode()) {
                return;
            }

            this.createLandscapeBlocker();
            isReady = this.isLandscape();
            document.body.className = document.body.className.replace(/\bmissionPortraitRequired\b/g, "") +
                (isReady ? "" : " missionPortraitRequired");

            if (this.game !== null && this.game.resizeRenderer !== undefined) {
                this.game.resizeRenderer();
            }

            if (isReady && this.pendingPhoneStart && this.startGameCallback !== null) {
                this.pendingPhoneStart = false;
                this.startSelectedGame(this.startGameCallback);
            }
        },

        finishBoot: function () {
            var screen = this.bootScreen,
                self = this;

            if (!this.minBootDone || !this.gameLoaded || this.booted || screen === null) {
                return;
            }

            screen.className = "fade";
            window.setTimeout(function () {
                if (screen.parentNode) {
                    screen.parentNode.removeChild(screen);
                }

                self.booted = true;
                self.bootScreen = null;
                GTA.Audio.unlock();
            }, 520);
        },

        injectStyles: function () {
            var style = document.createElement("style");

            style.type = "text/css";
            style.appendChild(document.createTextNode(
                "#missionBoot,#missionMenuOverlay{" +
                    "position:absolute;inset:0;z-index:40;overflow:hidden;background:#020608;color:#fff;" +
                    "font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;" +
                "}" +
                "#missionBoot video,#missionMenuOverlay video{" +
                    "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" +
                "}" +
                "#missionBoot.fade{opacity:0;transition:opacity .5s ease;}" +
                ".bootShade,.menuShade{position:absolute;inset:0;background:rgba(0,0,0,.48);}" +
                ".bootText{" +
                    "position:absolute;left:36px;bottom:36px;opacity:0;transform:translateY(16px);" +
                    "text-shadow:0 0 22px #6dff85;transition:opacity .35s ease,transform .35s ease;" +
                "}" +
                ".bootText.show{opacity:1;transform:translateY(0);}" +
                ".bootTitle{font-size:42px;font-weight:bold;letter-spacing:0;}" +
                ".bootSmall{font-size:13px;color:#a4ffb2;margin-top:8px;}" +
                ".platformSelect{display:flex;gap:10px;margin-top:16px;}" +
                ".platformSelect button{" +
                    "height:40px;min-width:112px;border:1px solid rgba(109,255,133,.65);" +
                    "background:rgba(1,8,12,.74);color:#e8ffed;font:bold 13px Arial;text-transform:uppercase;" +
                    "box-shadow:0 0 18px rgba(31,255,91,.22);cursor:pointer;" +
                "}" +
                ".platformSelect button:hover{background:rgba(109,255,133,.2);}" +
                "#missionBoot.platformChosen .platformSelect{display:none;}" +
                "#missionLandscapeBlocker{" +
                    "display:none;position:fixed;inset:0;z-index:60;background:#020608;color:#e8ffed;" +
                    "font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;text-align:center;" +
                    "align-items:center;justify-content:center;padding:22px;" +
                "}" +
                "body.missionPortraitRequired #missionLandscapeBlocker{display:flex;}" +
                ".landscapePanel{border:1px solid rgba(109,255,133,.62);padding:18px 20px;background:rgba(1,8,12,.78);box-shadow:0 0 28px rgba(31,255,91,.28);}" +
                ".landscapeTitle{font-size:24px;font-weight:bold;text-shadow:0 0 16px #6dff85;}" +
                ".landscapeText{font-size:12px;color:#a4ffb2;margin-top:8px;line-height:1.4;}" +
                "#missionMenuButton{" +
                    "position:absolute;left:12px;bottom:12px;z-index:20;border:1px solid rgba(109,255,133,.55);" +
                    "background:rgba(1,8,12,.78);color:#dfffe6;padding:9px 13px;font:bold 12px Arial;" +
                    "text-transform:uppercase;cursor:pointer;box-shadow:0 0 18px rgba(31,255,91,.18);" +
                "}" +
                "#missionMenuButton:hover,.menuButton:hover{background:rgba(109,255,133,.22);}" +
                "#missionMenuOverlay{display:none;z-index:35;}" +
                "#missionMenuOverlay.show{display:block;}" +
                ".menuPanel{" +
                    "position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:330px;" +
                    "background:rgba(1,8,12,.78);border:1px solid rgba(109,255,133,.55);" +
                    "box-shadow:0 0 34px rgba(31,255,91,.3);padding:18px;max-height:calc(100vh - 56px);overflow-y:auto;" +
                "}" +
                ".menuTitle{font-size:26px;font-weight:bold;margin-bottom:12px;text-shadow:0 0 16px #6dff85;}" +
                ".menuButton{" +
                    "display:block;width:100%;height:38px;margin:8px 0;border:1px solid rgba(109,255,133,.45);" +
                    "background:rgba(0,0,0,.45);color:#fff;font:bold 13px Arial;text-transform:uppercase;cursor:pointer;" +
                "}" +
                ".missionSelect{display:none;margin-top:10px;grid-template-columns:1fr 1fr;gap:8px;}" +
                ".missionSelect.show{display:grid;}" +
                ".missionSelect button{" +
                    "height:32px;border:1px solid rgba(109,255,133,.35);background:rgba(109,255,133,.12);" +
                    "color:#dfffe6;font:bold 11px Arial;text-transform:uppercase;cursor:pointer;" +
                "}" +
                ".controlsPanel{" +
                    "display:none;margin-top:10px;padding:11px;border:1px solid rgba(109,255,133,.35);" +
                    "background:rgba(0,0,0,.42);color:#dfffe6;font:12px/1.45 Arial;text-transform:none;" +
                "}" +
                ".controlsPanel.show{display:block;}" +
                ".controlsPanel strong{display:block;color:#fff;text-transform:uppercase;font-size:12px;margin:8px 0 3px;}" +
                ".controlsPanel span{display:block;color:#b8ffc4;}" +
                ".exitMessage{display:none;color:#b8ffc4;font-size:13px;margin-top:10px;line-height:1.35;}" +
                ".exitMessage.show{display:block;}" +
                "#missionGuidance{" +
                    "position:absolute;left:50%;bottom:18px;transform:translateX(-50%);z-index:18;min-width:290px;" +
                    "max-width:560px;padding:10px 14px;border:1px solid rgba(109,255,133,.55);" +
                    "background:rgba(1,8,12,.82);color:#e8ffed;text-align:center;font:bold 12px Arial;" +
                    "text-transform:uppercase;box-shadow:0 0 20px rgba(31,255,91,.2);pointer-events:none;" +
                "}" +
                "#missionGuidance .guideKeys{display:block;color:#a4ffb2;font:bold 11px Arial;margin-top:4px;}" +
                "body.missionPhoneMode #GTADebugPositionData,body.missionPhoneMode .stats{display:none;}" +
                "body.missionPhoneMode #missionMenuButton{left:10px;bottom:calc(84px + env(safe-area-inset-bottom));padding:6px 9px;font-size:10px;}" +
                "body.missionPhoneMode #missionGuidance{" +
                    "bottom:calc(82px + env(safe-area-inset-bottom));width:auto;min-width:0;" +
                    "max-width:360px;font-size:9px;padding:5px 8px;line-height:1.15;" +
                "}" +
                "body.missionPhoneMode #missionGuidance .guideKeys{font-size:8px;margin-top:2px;}" +
                "#missionTouchControls{display:none;font-family:Arial,Helvetica,sans-serif;}" +
                "body.missionPhoneMode #missionTouchControls{display:block;}" +
                "#missionTouchControls button{" +
                    "pointer-events:auto;border:1px solid rgba(109,255,133,.65);background:rgba(1,8,12,.78);" +
                    "color:#e8ffed;box-shadow:0 0 18px rgba(31,255,91,.24);font:bold 13px Arial;text-transform:uppercase;" +
                    "touch-action:none;-webkit-user-select:none;user-select:none;" +
                "}" +
                "#missionTouchControls button:active{background:rgba(109,255,133,.26);}" +
                ".touchSteer{position:fixed;left:12px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:22;display:flex;gap:10px;}" +
                ".touchActions{position:fixed;right:12px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:22;display:flex;gap:9px;align-items:flex-end;}" +
                ".touchRound{width:58px;height:58px;border-radius:50%;font-size:24px;}" +
                ".touchPill{height:56px;min-width:66px;border-radius:28px;padding:0 15px;}" +
                ".touchTall{height:68px;min-width:82px;border-radius:34px;}" +
                "#missionTouchControls .carOnly{display:none;}" +
                "#missionTouchControls.inVehicle .footOnly{display:none;}" +
                "#missionTouchControls.inVehicle .carOnly{display:inline-block;}" +
                "#missionTouchControls.inVehicle .touchActions{gap:7px;}" +
                "@media (max-width:520px){" +
                    ".bootText{left:20px;right:20px;bottom:28px;}" +
                    ".bootTitle{font-size:32px;}" +
                    ".platformSelect{flex-wrap:wrap;}" +
                    ".platformSelect button{min-width:104px;}" +
                    ".touchRound{width:54px;height:54px;}" +
                    ".touchPill{height:52px;min-width:58px;padding:0 12px;font-size:11px;}" +
                    ".touchTall{height:62px;min-width:74px;}" +
                "}"
            ));

            document.getElementsByTagName("head")[0].appendChild(style);
        },

        gameReady: function (game) {
            this.game = game;
            this.gameLoaded = true;
            this.createMenu();
            this.createGuidance();
            this.updateLandscapeState();

            if (this.isPhoneMode()) {
                this.createMobileControls();
            }

            if (GTA.NPCManager !== undefined) {
                game.npcManager = new GTA.NPCManager(game);
            }

            this.finishBoot();
        },

        createMenu: function () {
            var button,
                overlay,
                video,
                missions,
                select,
                i,
                missionButton,
                self = this;

            if (this.menu !== null) {
                return;
            }

            button = document.createElement("button");
            button.id = "missionMenuButton";
            button.appendChild(document.createTextNode("Menu"));
            document.body.appendChild(button);

            overlay = document.createElement("div");
            overlay.id = "missionMenuOverlay";
            overlay.innerHTML =
                "<video autoplay muted playsinline loop></video>" +
                "<div class=\"menuShade\"></div>" +
                "<div class=\"menuPanel\">" +
                    "<div class=\"menuTitle\">Mission Retrieval</div>" +
                    "<button class=\"menuButton restart\">Restart</button>" +
                    "<button class=\"menuButton selectMission\">Select Mission</button>" +
                    "<button class=\"menuButton controlsMenu\">Controls</button>" +
                    "<button class=\"menuButton closeMenu\">Resume</button>" +
                    "<button class=\"menuButton exitGame\">Exit</button>" +
                    "<div class=\"missionSelect\"></div>" +
                    "<div class=\"controlsPanel\">" +
                        "<strong>On Foot</strong>" +
                        "<span>W / Arrow Up: move forward</span>" +
                        "<span>S / Arrow Down: move backward</span>" +
                        "<span>A / D: turn left or right</span>" +
                        "<span>E: enter a nearby car or hijack a moving car</span>" +
                        "<span>Phone: hold RUN and steer with the arrow buttons</span>" +
                        "<strong>In A Car</strong>" +
                        "<span>W: drive forward</span>" +
                        "<span>A / D: steer</span>" +
                        "<span>R: reverse</span>" +
                        "<span>S: speed boost</span>" +
                        "<span>E: exit the car</span>" +
                        "<span>Phone: DRIVE, REV, BOOST, E, and arrow buttons</span>" +
                        "<strong>Map And Missions</strong>" +
                        "<span>Click the nav map to expand it</span>" +
                        "<span>Enter the glowing mission marker to reveal submissions</span>" +
                    "</div>" +
                    "<div class=\"exitMessage\">Session closed. Press restart to begin again.</div>" +
                "</div>";

            video = overlay.getElementsByTagName("video")[0];
            video.src = videoPath;
            video.play();

            missions = overlay.getElementsByClassName("missionSelect")[0];

            for (i = 0; i < GTA.RetrievalMissionConfig.missions.length; i += 1) {
                missionButton = document.createElement("button");
                missionButton.setAttribute("data-mission", i);
                missionButton.appendChild(document.createTextNode("Mission " + (i + 1)));
                missions.appendChild(missionButton);
            }

            document.body.appendChild(overlay);

            button.onclick = function () {
                GTA.Audio.playMenu();
                overlay.className = "show";
            };

            overlay.getElementsByClassName("restart")[0].onclick = function () {
                GTA.Audio.playMenu();
                window.location.reload();
            };

            overlay.getElementsByClassName("selectMission")[0].onclick = function () {
                GTA.Audio.playMenu();
                select = overlay.getElementsByClassName("missionSelect")[0];
                select.className = select.className === "missionSelect show" ? "missionSelect" : "missionSelect show";
                overlay.getElementsByClassName("controlsPanel")[0].className = "controlsPanel";
            };

            overlay.getElementsByClassName("controlsMenu")[0].onclick = function () {
                var controls = overlay.getElementsByClassName("controlsPanel")[0];

                GTA.Audio.playMenu();
                controls.className = controls.className === "controlsPanel show" ? "controlsPanel" : "controlsPanel show";
                overlay.getElementsByClassName("missionSelect")[0].className = "missionSelect";
            };

            overlay.getElementsByClassName("closeMenu")[0].onclick = function () {
                GTA.Audio.playMenu();
                overlay.className = "";
            };

            overlay.getElementsByClassName("exitGame")[0].onclick = function () {
                GTA.Audio.playMenu();
                overlay.getElementsByClassName("exitMessage")[0].className = "exitMessage show";
            };

            missions.onclick = function (event) {
                var target = event.target,
                    missionIndex;

                if (target && target.getAttribute("data-mission") !== null) {
                    missionIndex = parseInt(target.getAttribute("data-mission"), 10);

                    if (self.game && self.game.retrievalMissions) {
                        GTA.Audio.playMission();
                        self.game.retrievalMissions.loadMission(missionIndex);
                        overlay.className = "";
                    }
                }
            };

            this.menu = overlay;
        },

        createGuidance: function () {
            var guidance,
                self = this;

            if (this.guidance !== null) {
                return;
            }

            guidance = document.createElement("div");
            guidance.id = "missionGuidance";
            document.body.appendChild(guidance);
            this.guidance = guidance;
            this.updateGuidance();

            this.guidanceTimer = window.setInterval(function () {
                self.updateGuidance();
            }, 140);
        },

        updateGuidance: function () {
            var player,
                carDistance;

            if (this.guidance === null || this.game === null || this.game.player === undefined) {
                return;
            }

            player = this.game.player;

            if (player.vehicle !== null) {
                this.setGuidance(
                    "Driving mode",
                    this.isPhoneMode() ? "DRIVE forward | arrows steer | REV reverse | BOOST speed | E exit" :
                        "W forward | A/D steer | R reverse | S boost | E exit"
                );
                return;
            }

            carDistance = this.nearestCarDistance(player.position.x, player.position.y);

            if (carDistance < 230) {
                this.setGuidance(
                    this.isPhoneMode() ? "Tap E to enter the car" : "Press E to enter the car",
                    this.isPhoneMode() ? "You can also hijack a moving car with E" : "You can also hijack a moving car with E"
                );
                return;
            }

            this.setGuidance(
                "Find the glowing mission marker",
                this.isPhoneMode() ? "Hold RUN and steer with arrows to search the city" :
                    "Enter it to reveal submission assets"
            );
        },

        createMobileControls: function () {
            var controls,
                buttons,
                i,
                control,
                self = this;

            if (this.mobileControls !== null) {
                return;
            }

            controls = document.createElement("div");
            controls.id = "missionTouchControls";
            controls.innerHTML =
                "<div class=\"touchSteer\">" +
                    "<button class=\"touchRound\" data-touch=\"left\">&larr;</button>" +
                    "<button class=\"touchRound\" data-touch=\"right\">&rarr;</button>" +
                "</div>" +
                "<div class=\"touchActions\">" +
                    "<button class=\"touchTall footOnly\" data-touch=\"run\">Run</button>" +
                    "<button class=\"touchTall carOnly\" data-touch=\"drive\">Drive</button>" +
                    "<button class=\"touchPill carOnly\" data-touch=\"reverse\">Rev</button>" +
                    "<button class=\"touchPill carOnly\" data-touch=\"boost\">Boost</button>" +
                    "<button class=\"touchRound vehicleAction\" data-touch=\"vehicle\">E</button>" +
                "</div>";

            document.body.appendChild(controls);
            this.mobileControls = controls;
            buttons = controls.getElementsByTagName("button");

            for (i = 0; i < buttons.length; i += 1) {
                control = buttons[i].getAttribute("data-touch");

                if (control === "vehicle") {
                    this.bindMobileTap(buttons[i]);
                } else {
                    this.bindMobileHold(buttons[i], control);
                }
            }

            this.mobileControlsTimer = window.setInterval(function () {
                self.updateMobileControls();
            }, 180);
            this.updateMobileControls();
        },

        bindMobileHold: function (button, control) {
            var self = this,
                start = function (event) {
                    event.preventDefault();
                    self.setMobileControl(control, true);
                },
                end = function (event) {
                    event.preventDefault();
                    self.setMobileControl(control, false);
                };

            if (window.PointerEvent !== undefined) {
                button.addEventListener("pointerdown", start, false);
                button.addEventListener("pointerup", end, false);
                button.addEventListener("pointercancel", end, false);
                button.addEventListener("pointerleave", end, false);
            } else {
                button.addEventListener("touchstart", start, false);
                button.addEventListener("touchend", end, false);
                button.addEventListener("touchcancel", end, false);
                button.addEventListener("mousedown", start, false);
                button.addEventListener("mouseup", end, false);
                button.addEventListener("mouseleave", end, false);
            }
        },

        bindMobileTap: function (button) {
            var self = this,
                tap = function (event) {
                    event.preventDefault();
                    self.mobileVehicleTap();
                };

            if (window.PointerEvent !== undefined) {
                button.addEventListener("pointerdown", tap, false);
            } else {
                button.addEventListener("touchstart", tap, false);
                button.addEventListener("mousedown", tap, false);
            }
        },

        setMobileControl: function (control, active) {
            var player = this.game && this.game.player ? this.game.player : null;

            if (player === null) {
                return;
            }

            if (control === "left") {
                player.turnLeft = active;
            } else if (control === "right") {
                player.turnRight = active;
            } else if (control === "run" || control === "drive") {
                player.moveForward = active;
            } else if (control === "reverse") {
                player.vehicleReverse = active;
            } else if (control === "boost") {
                player.vehicleBoost = active;
            }

            this.updateMobileControls();
        },

        mobileVehicleTap: function () {
            var player = this.game && this.game.player ? this.game.player : null,
                self = this;

            if (player === null || player.vehicleUseDown) {
                return;
            }

            player.moveForward = false;
            player.vehicleReverse = false;
            player.vehicleBoost = false;
            player.vehicleUseDown = true;
            player.toggleVehicle();
            this.updateMobileControls();

            window.setTimeout(function () {
                player.vehicleUseDown = false;
                self.updateMobileControls();
            }, 240);
        },

        updateMobileControls: function () {
            var player = this.game && this.game.player ? this.game.player : null,
                vehicleButton;

            if (this.mobileControls === null || player === null) {
                return;
            }

            this.mobileControls.className = player.vehicle !== null ? "inVehicle" : "";
            vehicleButton = this.mobileControls.getElementsByClassName("vehicleAction")[0];

            if (vehicleButton !== undefined) {
                vehicleButton.innerHTML = player.vehicle !== null ? "Exit" : "E";
            }
        },

        nearestCarDistance: function (playerX, playerY) {
            var distance = 999999,
                activeObjects = this.game.activeObjects || [],
                i,
                car,
                dx,
                dy,
                current;

            for (i = 0; i < activeObjects.length; i += 1) {
                car = activeObjects[i];

                if (car.sprite === undefined || car.type === undefined || this.game.cars[car.type] === undefined) {
                    continue;
                }

                dx = car.sprite.position.x - playerX;
                dy = car.sprite.position.y - playerY;
                current = Math.sqrt(dx * dx + dy * dy);

                if (current < distance) {
                    distance = current;
                }
            }

            if (this.game.npcManager !== undefined) {
                for (i = 0; i < this.game.npcManager.cars.length; i += 1) {
                    car = this.game.npcManager.cars[i].object;
                    dx = car.sprite.position.x - playerX;
                    dy = car.sprite.position.y - playerY;
                    current = Math.sqrt(dx * dx + dy * dy);

                    if (current < distance) {
                        distance = current;
                    }
                }
            }

            return distance;
        },

        setGuidance: function (title, detail) {
            this.guidance.innerHTML = title + "<span class=\"guideKeys\">" + detail + "</span>";
        }
    };

    GTA.NPCManager = function (game) {
        this.game = game;
        this.walkers = [];
        this.cars = [];
        this.time = 0;
        this.carRoadCounts = {};
        this.walkerRoadCounts = {};
        this.maxCarsPerRoad = 2;
        this.maxWalkersPerRoad = 2;
        this.maxCrossing = 1;
        this.localWalkerCount = 6;
        this.localCarCount = 3;
        this.pedColors = [0xff6b6b, 0x58d6ff, 0xffd166, 0xb56dff, 0x72ef8a, 0xff9f43];
        this.carColors = [0xffffff, 0xff4757, 0x2ed573, 0x1e90ff, 0xffc312, 0xa4b0be, 0xff7f50];
        this.spawnWalkers(18);
        this.spawnCars(8);
    };

    GTA.NPCManager.prototype.cloneTintedMesh = function (source, tint) {
        var geometry = THREE.GeometryUtils.clone(source.geometry),
            material = new THREE.MeshBasicMaterial({
                map: source.material.map,
                transparent: true,
                color: tint
            }),
            mesh = new THREE.Mesh(geometry, material);

        mesh.geometry.dynamic = true;
        mesh.doubleSided = true;

        return mesh;
    };

    GTA.NPCManager.prototype.spawnWalkers = function (count) {
        var i,
            offset = this.game.spriteNumbers.offset.PED,
            sprite,
            spot;

        for (i = 0; i < count; i += 1) {
            spot = this.findPavementStart(i);
            this.changeRoadCount(this.walkerRoadCounts, spot.roadKey, 1);
            sprite = this.cloneTintedMesh(this.game.sprites[offset].sprite, this.pedColors[i % this.pedColors.length]);
            sprite.position.set(spot.world.x, spot.world.y, 142);
            this.game.scene.add(sprite);

            this.walkers.push({
                sprite: sprite,
                animator: new GTA.SpriteAnimation(this.game, offset, sprite),
                animationBase: offset,
                animationFrame: 0,
                animationClock: 0,
                block: {
                    x: spot.block.x,
                    y: spot.block.y
                },
                direction: spot.direction,
                targetBlock: {
                    x: spot.block.x + spot.direction.x,
                    y: spot.block.y + spot.direction.y
                },
                mode: "walk",
                waitTimer: 0,
                crossing: null,
                roadKey: spot.roadKey,
                speed: 22 + (i % 4) * 3
            });
        }
    };

    GTA.NPCManager.prototype.spawnCars = function (count) {
        var models = [4, 12, 24, 31, 36, 44, 58, 6, 10, 20],
            i,
            car,
            spot,
            model;

        for (i = 0; i < count; i += 1) {
            model = models[i % models.length];

            if (this.game.cars[model] === undefined) {
                model = 4;
            }

            spot = this.findRoadStart(i);
            this.changeRoadCount(this.carRoadCounts, spot.roadKey, 1);
            car = new GTA.GameObjectPosition();
            car.addCar(this.game, model, spot.world.x, -spot.world.y + (this.game.cars[model].height / 2), 255, 0);
            car.sprite = this.cloneTintedMesh(car.sprite, this.carColors[i % this.carColors.length]);
            car.sprite.position.set(spot.world.x, spot.world.y, 129);
            car.sprite.rotation.z = this.carRotationForDirection(spot.direction);
            this.game.scene.add(car.sprite);

            this.cars.push({
                object: car,
                block: {
                    x: spot.block.x,
                    y: spot.block.y
                },
                direction: spot.direction,
                laneSide: spot.laneSide,
                targetBlock: {
                    x: spot.block.x + spot.direction.x,
                    y: spot.block.y + spot.direction.y
                },
                state: "drive",
                stopTimer: 0,
                blocksUntilStop: 2 + (i % 4),
                roadKey: spot.roadKey,
                speed: 42 + (i % 3) * 6,
                color: this.carColors[i % this.carColors.length]
            });
        }
    };

    GTA.NPCManager.prototype.findPavementStart = function (index) {
        var start = this.getSpawnAnchor(index, "walker"),
            rings,
            dx,
            dy,
            block,
            direction,
            roadKey,
            found = 0,
            desired = index < this.localWalkerCount ? index * 2 : 0;

        for (rings = 1; rings < 64; rings += 1) {
            for (dx = -rings; dx <= rings; dx += 1) {
                for (dy = -rings; dy <= rings; dy += 1) {
                    if (Math.abs(dx) !== rings && Math.abs(dy) !== rings) {
                        continue;
                    }

                    block = {
                        x: start.x + dx,
                        y: start.y + dy
                    };

                    if (this.getColumnType(block.x, block.y) !== 3 || !this.isRoadsidePavement(block.x, block.y)) {
                        continue;
                    }

                    roadKey = this.roadKeyForSidewalk(block.x, block.y);

                    if (roadKey === null || this.getRoadCount(this.walkerRoadCounts, roadKey) >= this.maxWalkersPerRoad) {
                        continue;
                    }

                    direction = this.choosePavementDirection(block.x, block.y, index);

                    if (found < desired) {
                        found += 1;
                        continue;
                    }

                    return {
                        block: block,
                        direction: direction,
                        roadKey: roadKey,
                        world: this.blockToWorld(block.x, block.y)
                    };
                }
            }
        }

        block = {
            x: start.x + 3 + index,
            y: start.y + 3
        };

        return {
            block: block,
            direction: {
                x: 1,
                y: 0
            },
            roadKey: this.roadKeyForSidewalk(block.x, block.y),
            world: this.blockToWorld(block.x, block.y)
        };
    };

    GTA.NPCManager.prototype.findRoadStart = function (index) {
        var start = this.getSpawnAnchor(index, "car"),
            rings,
            dx,
            dy,
            block,
            directions,
            direction,
            roadKey,
            attempt,
            found = 0,
            desired = index < this.localCarCount ? index * 3 : 0;

        for (rings = 1; rings < 72; rings += 1) {
            for (dx = -rings; dx <= rings; dx += 1) {
                for (dy = -rings; dy <= rings; dy += 1) {
                    if (Math.abs(dx) !== rings && Math.abs(dy) !== rings) {
                        continue;
                    }

                    block = {
                        x: start.x + dx,
                        y: start.y + dy
                    };

                    if (this.getColumnType(block.x, block.y) !== 2) {
                        continue;
                    }

                    directions = this.getRoadDirections(block.x, block.y);

                    if (directions.length > 0) {
                        for (attempt = 0; attempt < directions.length; attempt += 1) {
                            direction = directions[(index + attempt) % directions.length];
                            roadKey = this.roadKeyForRoad(block.x, block.y, direction);

                            if (this.getRoadCount(this.carRoadCounts, roadKey) >= this.maxCarsPerRoad) {
                                continue;
                            }

                            if (found < desired) {
                                found += 1;
                                continue;
                            }

                            return {
                                block: block,
                                direction: direction,
                                roadKey: roadKey,
                                laneSide: (index % 2) ? 1 : -1,
                                world: this.blockToLaneWorld(block.x, block.y, direction, (index % 2) ? 1 : -1)
                            };
                        }
                    }
                }
            }
        }

        block = {
            x: start.x + 6 + index,
            y: start.y
        };
        direction = {
            x: 1,
            y: 0
        };

        return {
            block: block,
            direction: direction,
            roadKey: this.roadKeyForRoad(block.x, block.y, direction),
            laneSide: 1,
            world: this.blockToLaneWorld(block.x, block.y, direction, 1)
        };
    };

    GTA.NPCManager.prototype.worldToBlock = function (worldX, worldY) {
        return {
            x: Math.max(1, Math.min(254, Math.round(worldX / 64))),
            y: Math.max(1, Math.min(254, Math.round(-worldY / 64)))
        };
    };

    GTA.NPCManager.prototype.getColumnType = function (blockX, blockY) {
        var column,
            block;

        if (blockX <= 0 || blockX >= 255 || blockY <= 0 || blockY >= 255 ||
                this.game.map.base[blockX] === undefined ||
                this.game.map.base[blockX][blockY] === undefined) {
            return 0;
        }

        column = this.game.map.base[blockX][blockY];
        block = column.blocks[2] || column.blocks[column.blocks.length - 1];

        return block ? block.type : 0;
    };

    GTA.NPCManager.prototype.getSpawnAnchor = function (index, kind) {
        var player = this.game.player,
            playerBlock = this.worldToBlock(player.position.x, player.position.y),
            seed;

        if ((kind === "car" && index < this.localCarCount) ||
                (kind === "walker" && index < this.localWalkerCount)) {
            return playerBlock;
        }

        seed = kind === "car" ? (index * 37) + 19 : (index * 53) + 41;

        return {
            x: 16 + ((seed * 17) % 224),
            y: 16 + (((seed + 29) * 31) % 224)
        };
    };

    GTA.NPCManager.prototype.getRoadAxis = function (blockX, blockY) {
        if (this.getColumnType(blockX + 1, blockY) === 2 || this.getColumnType(blockX - 1, blockY) === 2) {
            return "h";
        }

        if (this.getColumnType(blockX, blockY + 1) === 2 || this.getColumnType(blockX, blockY - 1) === 2) {
            return "v";
        }

        return null;
    };

    GTA.NPCManager.prototype.roadKeyForRoad = function (blockX, blockY, direction) {
        var axis = direction && direction.x !== 0 ? "h" : direction && direction.y !== 0 ? "v" : this.getRoadAxis(blockX, blockY);

        if (axis === "h") {
            return "h:" + blockY;
        }

        if (axis === "v") {
            return "v:" + blockX;
        }

        return "r:" + blockX + ":" + blockY;
    };

    GTA.NPCManager.prototype.roadKeyForSidewalk = function (blockX, blockY) {
        var candidates = [
                { x: blockX + 1, y: blockY },
                { x: blockX - 1, y: blockY },
                { x: blockX, y: blockY + 1 },
                { x: blockX, y: blockY - 1 }
            ],
            i,
            axis;

        for (i = 0; i < candidates.length; i += 1) {
            if (this.getColumnType(candidates[i].x, candidates[i].y) !== 2) {
                continue;
            }

            axis = this.getRoadAxis(candidates[i].x, candidates[i].y);

            if (axis === "h") {
                return "h:" + candidates[i].y;
            }

            if (axis === "v") {
                return "v:" + candidates[i].x;
            }

            return "r:" + candidates[i].x + ":" + candidates[i].y;
        }

        return null;
    };

    GTA.NPCManager.prototype.getRoadCount = function (counts, key) {
        if (key === null || counts[key] === undefined) {
            return 0;
        }

        return counts[key];
    };

    GTA.NPCManager.prototype.changeRoadCount = function (counts, key, delta) {
        if (key === null) {
            return;
        }

        counts[key] = Math.max(0, this.getRoadCount(counts, key) + delta);
    };

    GTA.NPCManager.prototype.setWalkerRoadKey = function (walker, key) {
        if (walker.roadKey === key) {
            return;
        }

        this.changeRoadCount(this.walkerRoadCounts, walker.roadKey, -1);
        walker.roadKey = key;
        this.changeRoadCount(this.walkerRoadCounts, walker.roadKey, 1);
    };

    GTA.NPCManager.prototype.setCarRoadKey = function (car, key) {
        if (car.roadKey === key) {
            return;
        }

        this.changeRoadCount(this.carRoadCounts, car.roadKey, -1);
        car.roadKey = key;
        this.changeRoadCount(this.carRoadCounts, car.roadKey, 1);
    };

    GTA.NPCManager.prototype.canCarUseRoadKey = function (car, key) {
        return key === car.roadKey ||
            this.getRoadCount(this.carRoadCounts, key) < this.maxCarsPerRoad;
    };

    GTA.NPCManager.prototype.blockToWorld = function (blockX, blockY) {
        return {
            x: blockX * 64,
            y: -(blockY * 64)
        };
    };

    GTA.NPCManager.prototype.blockToLaneWorld = function (blockX, blockY, direction, laneSide) {
        var world = this.blockToWorld(blockX, blockY);

        if (direction.x !== 0) {
            world.y += laneSide * 14;
        } else {
            world.x += laneSide * 14;
        }

        return world;
    };

    GTA.NPCManager.prototype.isRoadsidePavement = function (blockX, blockY) {
        return this.getColumnType(blockX + 1, blockY) === 2 ||
            this.getColumnType(blockX - 1, blockY) === 2 ||
            this.getColumnType(blockX, blockY + 1) === 2 ||
            this.getColumnType(blockX, blockY - 1) === 2;
    };

    GTA.NPCManager.prototype.getPavementDirections = function (blockX, blockY, requireRoadside) {
        var directions = [],
            candidates = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 }
            ],
            i,
            nextX,
            nextY;

        for (i = 0; i < candidates.length; i += 1) {
            nextX = blockX + candidates[i].x;
            nextY = blockY + candidates[i].y;

            if (this.getColumnType(nextX, nextY) !== 3) {
                continue;
            }

            if (requireRoadside && !this.isRoadsidePavement(nextX, nextY)) {
                continue;
            }

            directions.push(candidates[i]);
        }

        return directions;
    };

    GTA.NPCManager.prototype.choosePavementDirection = function (blockX, blockY, index) {
        var directions = this.getPavementDirections(blockX, blockY, true);

        if (directions.length === 0) {
            directions = this.getPavementDirections(blockX, blockY, false);
        }

        if (directions.length === 0) {
            directions.push({ x: 1, y: 0 });
        }

        return directions[index % directions.length];
    };

    GTA.NPCManager.prototype.canWalkerUseBlock = function (walker, blockX, blockY) {
        var roadKey;

        if (this.getColumnType(blockX, blockY) !== 3 || !this.isRoadsidePavement(blockX, blockY)) {
            return false;
        }

        roadKey = this.roadKeyForSidewalk(blockX, blockY);

        return roadKey === walker.roadKey ||
            this.getRoadCount(this.walkerRoadCounts, roadKey) < this.maxWalkersPerRoad;
    };

    GTA.NPCManager.prototype.hasActiveCrossing = function () {
        var i;

        for (i = 0; i < this.walkers.length; i += 1) {
            if (this.walkers[i].mode === "wait" || this.walkers[i].mode === "cross") {
                return true;
            }
        }

        return false;
    };

    GTA.NPCManager.prototype.getRoadDirections = function (blockX, blockY) {
        var directions = [];

        if (this.getColumnType(blockX + 1, blockY) === 2) {
            directions.push({ x: 1, y: 0 });
        }

        if (this.getColumnType(blockX - 1, blockY) === 2) {
            directions.push({ x: -1, y: 0 });
        }

        if (this.getColumnType(blockX, blockY + 1) === 2) {
            directions.push({ x: 0, y: 1 });
        }

        if (this.getColumnType(blockX, blockY - 1) === 2) {
            directions.push({ x: 0, y: -1 });
        }

        return directions;
    };

    GTA.NPCManager.prototype.findCrossing = function (blockX, blockY, index) {
        var directions = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 }
            ],
            i,
            direction,
            step,
            x,
            y;

        for (i = 0; i < directions.length; i += 1) {
            direction = directions[(i + index) % directions.length];
            x = blockX + direction.x;
            y = blockY + direction.y;

            if (this.getColumnType(x, y) !== 2) {
                continue;
            }

            for (step = 1; step <= 7; step += 1) {
                x = blockX + direction.x * step;
                y = blockY + direction.y * step;

                if (this.getColumnType(x, y) === 3 && this.isRoadsidePavement(x, y)) {
                    return {
                        x: x,
                        y: y,
                        direction: direction
                    };
                }

                if (this.getColumnType(x, y) !== 2) {
                    break;
                }
            }
        }

        return null;
    };

    GTA.NPCManager.prototype.pedRotationForDirection = function (direction) {
        return Math.atan2(-direction.y, direction.x) + 1.57079633;
    };

    GTA.NPCManager.prototype.carRotationForDirection = function (direction) {
        return this.pedRotationForDirection(direction);
    };

    GTA.NPCManager.prototype.walkerTargetWorld = function (walker) {
        return this.blockToWorld(walker.targetBlock.x, walker.targetBlock.y);
    };

    GTA.NPCManager.prototype.carTargetWorld = function (car) {
        return this.blockToLaneWorld(car.targetBlock.x, car.targetBlock.y, car.direction, car.laneSide);
    };

    GTA.NPCManager.prototype.moveToward = function (sprite, target, speed, delta) {
        var dx = target.x - sprite.position.x,
            dy = target.y - sprite.position.y,
            distance = Math.sqrt(dx * dx + dy * dy),
            step = speed * delta;

        if (distance <= step || distance < 1) {
            sprite.position.x = target.x;
            sprite.position.y = target.y;

            return true;
        }

        sprite.position.x += (dx / distance) * step;
        sprite.position.y += (dy / distance) * step;

        return false;
    };

    GTA.NPCManager.prototype.animateWalker = function (walker, delta) {
        walker.animationClock += delta;

        if (walker.animationClock >= 0.11) {
            walker.animationClock = 0;
            walker.animationFrame = (walker.animationFrame + 1) % 7;
            walker.animator.setSprite(walker.animationBase + walker.animationFrame);
        }
    };

    GTA.NPCManager.prototype.advanceWalker = function (walker, index) {
        var crossing,
            nextBlock,
            directions,
            chosen;

        walker.block.x = walker.targetBlock.x;
        walker.block.y = walker.targetBlock.y;
        this.setWalkerRoadKey(walker, this.roadKeyForSidewalk(walker.block.x, walker.block.y));

        if (walker.mode === "cross") {
            walker.mode = "walk";
            walker.crossing = null;
            walker.direction = this.choosePavementDirection(walker.block.x, walker.block.y, index);
            walker.targetBlock = {
                x: walker.block.x + walker.direction.x,
                y: walker.block.y + walker.direction.y
            };
            return;
        }

        if (!this.hasActiveCrossing() && (index + walker.block.x + walker.block.y) % 19 === 0) {
            crossing = this.findCrossing(walker.block.x, walker.block.y, index);

            if (crossing !== null) {
                walker.mode = "wait";
                walker.waitTimer = 0.55 + (index % 3) * 0.18;
                walker.crossing = crossing;
                return;
            }
        }

        nextBlock = {
            x: walker.block.x + walker.direction.x,
            y: walker.block.y + walker.direction.y
        };

        if (!this.canWalkerUseBlock(walker, nextBlock.x, nextBlock.y)) {
            directions = [
                { x: walker.direction.y, y: walker.direction.x },
                { x: -walker.direction.y, y: -walker.direction.x },
                { x: -walker.direction.x, y: -walker.direction.y }
            ];
            chosen = 0;

            while (chosen < directions.length &&
                    !this.canWalkerUseBlock(walker, walker.block.x + directions[chosen].x, walker.block.y + directions[chosen].y)) {
                chosen += 1;
            }

            walker.direction = directions[chosen] || this.choosePavementDirection(walker.block.x, walker.block.y, index);
        }

        walker.targetBlock = {
            x: walker.block.x + walker.direction.x,
            y: walker.block.y + walker.direction.y
        };
    };

    GTA.NPCManager.prototype.advanceCar = function (car, index) {
        var directions,
            forward,
            left,
            right,
            options = [],
            choice,
            roadKey,
            i;

        car.block.x = car.targetBlock.x;
        car.block.y = car.targetBlock.y;
        this.setCarRoadKey(car, this.roadKeyForRoad(car.block.x, car.block.y, car.direction));

        car.blocksUntilStop -= 1;

        if (car.blocksUntilStop <= 0) {
            car.state = "stopped";
            car.stopTimer = 1.4 + (index % 4) * 0.35;
            car.blocksUntilStop = 2 + ((index + car.block.x + car.block.y) % 4);
            car.targetBlock = {
                x: car.block.x,
                y: car.block.y
            };
            return;
        }

        directions = this.getRoadDirections(car.block.x, car.block.y);
        forward = {
            x: car.direction.x,
            y: car.direction.y
        };
        left = {
            x: -car.direction.y,
            y: car.direction.x
        };
        right = {
            x: car.direction.y,
            y: -car.direction.x
        };

        roadKey = this.roadKeyForRoad(car.block.x, car.block.y, forward);

        if (this.getColumnType(car.block.x + forward.x, car.block.y + forward.y) === 2 &&
                this.canCarUseRoadKey(car, roadKey)) {
            choice = forward;
        } else {
            roadKey = this.roadKeyForRoad(car.block.x, car.block.y, left);

            if (this.getColumnType(car.block.x + left.x, car.block.y + left.y) === 2 &&
                    this.canCarUseRoadKey(car, roadKey)) {
                options.push(left);
            }

            roadKey = this.roadKeyForRoad(car.block.x, car.block.y, right);

            if (this.getColumnType(car.block.x + right.x, car.block.y + right.y) === 2 &&
                    this.canCarUseRoadKey(car, roadKey)) {
                options.push(right);
            }

            if (options.length === 0 && directions.length > 0) {
                for (i = 0; i < directions.length; i += 1) {
                    roadKey = this.roadKeyForRoad(car.block.x, car.block.y, directions[i]);

                    if (this.canCarUseRoadKey(car, roadKey)) {
                        options.push(directions[i]);
                    }
                }
            }

            if (options.length === 0) {
                car.state = "stopped";
                car.stopTimer = 1.2;
                car.targetBlock = {
                    x: car.block.x,
                    y: car.block.y
                };
                return;
            }

            choice = options[(index + car.block.x + car.block.y) % options.length];
        }

        car.direction = choice;
        car.targetBlock = {
            x: car.block.x + car.direction.x,
            y: car.block.y + car.direction.y
        };
    };

    GTA.NPCManager.prototype.hijackNearestCar = function (playerX, playerY, maxDistance) {
        var nearest = null,
            nearestIndex = -1,
            nearestDistance = maxDistance,
            i,
            car,
            dx,
            dy,
            distance,
            vehicle,
            worldX,
            worldY;

        for (i = 0; i < this.cars.length; i += 1) {
            car = this.cars[i];
            dx = car.object.sprite.position.x - playerX;
            dy = car.object.sprite.position.y - playerY;
            distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < nearestDistance) {
                nearest = car;
                nearestIndex = i;
                nearestDistance = distance;
            }
        }

        if (nearest === null) {
            return null;
        }

        this.cars.splice(nearestIndex, 1);
        this.changeRoadCount(this.carRoadCounts, nearest.roadKey, -1);
        this.spawnEvictedDriver(nearest, nearestIndex + 20);

        vehicle = nearest.object;
        worldX = vehicle.sprite.position.x;
        worldY = vehicle.sprite.position.y;
        vehicle.x = worldX + 32;
        vehicle.y = -worldY + (this.game.cars[vehicle.type].height / 2);
        vehicle.z = 255;
        vehicle.rotation = vehicle.sprite.rotation.z + 1.57079633;
        vehicle.initPhysics(this.game);
        vehicle.physics.SetAngle(-vehicle.sprite.rotation.z);
        vehicle.physics.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0, 0));
        this.game.activeObjects.push(vehicle);

        return vehicle;
    };

    GTA.NPCManager.prototype.spawnEvictedDriver = function (car, index) {
        var carBlock = this.worldToBlock(car.object.sprite.position.x, car.object.sprite.position.y),
            radius,
            dx,
            dy,
            block,
            roadKey,
            direction,
            offset = this.game.spriteNumbers.offset.PED,
            sprite;

        for (radius = 1; radius < 6; radius += 1) {
            for (dx = -radius; dx <= radius; dx += 1) {
                for (dy = -radius; dy <= radius; dy += 1) {
                    block = {
                        x: carBlock.x + dx,
                        y: carBlock.y + dy
                    };

                    if (this.getColumnType(block.x, block.y) !== 3 || !this.isRoadsidePavement(block.x, block.y)) {
                        continue;
                    }

                    roadKey = this.roadKeyForSidewalk(block.x, block.y);

                    if (this.getRoadCount(this.walkerRoadCounts, roadKey) >= this.maxWalkersPerRoad) {
                        continue;
                    }

                    direction = this.choosePavementDirection(block.x, block.y, index);
                    this.changeRoadCount(this.walkerRoadCounts, roadKey, 1);
                    sprite = this.cloneTintedMesh(this.game.sprites[offset].sprite, this.pedColors[index % this.pedColors.length]);
                    sprite.position.set(block.x * 64, -(block.y * 64), 142);
                    this.game.scene.add(sprite);

                    this.walkers.push({
                        sprite: sprite,
                        animator: new GTA.SpriteAnimation(this.game, offset, sprite),
                        animationBase: offset,
                        animationFrame: 0,
                        animationClock: 0,
                        block: {
                            x: block.x,
                            y: block.y
                        },
                        direction: direction,
                        targetBlock: {
                            x: block.x + direction.x,
                            y: block.y + direction.y
                        },
                        mode: "walk",
                        waitTimer: 0,
                        crossing: null,
                        roadKey: roadKey,
                        speed: 20
                    });

                    return;
                }
            }
        }
    };

    GTA.NPCManager.prototype.update = function (delta) {
        var i,
            walker,
            car,
            target,
            reached;

        this.time += delta;

        for (i = 0; i < this.walkers.length; i += 1) {
            walker = this.walkers[i];

            if (walker.mode === "wait") {
                walker.waitTimer -= delta;
                walker.sprite.rotation.z = this.pedRotationForDirection(walker.crossing.direction);

                if (walker.waitTimer <= 0) {
                    walker.mode = "cross";
                    walker.direction = walker.crossing.direction;
                    walker.targetBlock = {
                        x: walker.crossing.x,
                        y: walker.crossing.y
                    };
                }
            } else {
                target = this.walkerTargetWorld(walker);
                reached = this.moveToward(walker.sprite, target, walker.mode === "cross" ? 36 : walker.speed, delta);
                walker.sprite.rotation.z = this.pedRotationForDirection(walker.direction);
                this.animateWalker(walker, delta);

                if (reached) {
                    this.advanceWalker(walker, i);
                }
            }

            walker.sprite.position.z = 142 + Math.sin(this.time * 9 + i) * 2;
        }

        for (i = 0; i < this.cars.length; i += 1) {
            car = this.cars[i];

            if (car.state === "stopped") {
                car.stopTimer -= delta;
                car.object.sprite.rotation.z = this.carRotationForDirection(car.direction);

                if (car.stopTimer <= 0) {
                    car.state = "drive";
                    this.advanceCar(car, i);
                }

                continue;
            }

            target = this.carTargetWorld(car);
            reached = this.moveToward(car.object.sprite, target, car.speed, delta);
            car.object.sprite.rotation.z = this.carRotationForDirection(car.direction);

            if (reached) {
                this.advanceCar(car, i);
            }
        }
    };
}());
