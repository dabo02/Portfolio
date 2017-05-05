var started = false;
var bitrateTimer = null;
var spinner = null;

var audioenabled = false;
var videoenabled = false;
var yourusername = null;

function SimpleVideoChat(){
    var self = this;
    self.debug = true;
    self.chatHandler = null;
    self.janus = null;
    self.username = null;
    self.otherPeer = null;
    self.jsep = null;
    self.data = null;
    self.opaqueId = "SVC-"+Janus.randomString(12);
    self.server = "https://janus.conf.meetecho.com/janus";
}

SimpleVideoChat.prototype.initialize = function(){
    var self = this;
    Janus.init({debug: self.debug, callback: function() {
        if(!Janus.isWebrtcSupported()) {
            Janus.debug("No WebRTC support... ");
            return;
        }
        // Create session
        self.janus = new Janus({
            server: self.server,
            success: function() {
                // Attach to echo test plugin
                self.janus.attach({
                    plugin: "janus.plugin.videocall",
                    opaqueId: self.opaqueId,
                    success: function(pluginHandle) {
                        self.chatHandler = pluginHandle;
                        Janus.debug("Plugin attached! (" + self.chatHandler.getPlugin() + ", id=" + self.chatHandler.getId() + ")");
                        // Prepare the username registration
                    },
                    error: function(error) {
                        Janus.error("  -- Error attaching plugin...", error);
                    },
                    consentDialog: function(on) {
                        Janus.debug("Consent dialog should be " + (on ? "on" : "off") + " now");
                        if(on) {
                            // Darken screen and show hint
                            var nav = navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
                            $.blockUI({
                                message: '<div><img src="/static/images/up_arrow.png"/></div>',
                                css: {
                                    border: 'none',
                                    padding: '15px',
                                    backgroundColor: 'transparent',
                                    color: '#aaa',
                                    top: '10px',
                                    left: (nav ? '-100px' : '300px')
                                } });
                        } else {
                            // Restore screen
                            $.unblockUI();
                        }
                    },
                    mediaState: function(medium, on) {
                        Janus.debug("Janus " + (on ? "started" : "stopped") + " receiving our " + medium);
                    },
                    webrtcState: function(on) {
                        Janus.debug("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
                    },
                    onmessage: function(msg, jsep) {
                        Janus.debug(" ::: Got a message :::");
                        self.jsep = jsep;
                        Janus.debug(JSON.stringify(msg));
                        var result = msg["result"];
                        if(result !== null && result !== undefined) {
                            if(result["list"] !== undefined && result["list"] !== null) {
                                var list = result["list"];
                                Janus.debug("Got a list of registered peers:");
                                Janus.debug(list);
                                for(var mp in list) {
                                    Janus.debug("  >> [" + list[mp] + "]");
                                }
                            } else if(result["event"] !== undefined && result["event"] !== null) {
                                var event = result["event"];
                                if(event === 'registered') {
                                    self.username = result["username"];
                                    $('#intro').addClass('hide');
                                    $('#username').addClass('hide');
                                    $('#register').addClass('hide');
                                    $('#youok').removeClass('hide').show().html("Registered as '" + self.username + "' let's get started!");
                                    setTimeout(function(){
                                        $('#login').addClass('hide');
                                        $('#phone').removeClass('hide').show();
                                        $('#call').unbind('click').click(self.doCall);
                                        $('#peer').focus();
                                        // Get a list of available peers, just for fun
                                        self.chatHandler.send({"message": { "request": "list" }});
                                    }, 3500)

                                    // TODO Enable buttons to call now
                                } else if(event === 'calling') {
                                    Janus.debug("Waiting for the peer to answer...");
                                } else if(event === 'incomingcall') {
                                    Janus.debug("Incoming call from " + result["username"] + "!");
                                    self.otherPeer = result["username"];
                                    // Notify user
                                    bootbox.hideAll();
                                    self.answerVideo();
                                } else if(event === 'accepted') {
                                    var peer = result["username"];
                                    if(peer === null || peer === undefined) {
                                        Janus.debug("Call started!");

                                    } else {
                                        Janus.debug(peer + " accepted the call!");
                                        if(spinner !== null && spinner !== undefined)
                                            spinner.stop();
                                        self.otherPeer = peer;
                                    }
                                    // Video call can start
                                    if(self.jsep)
                                        self.chatHandler.handleRemoteJsep({jsep: self.jsep});
                                    self.jsep = null;
                                } else if(event === 'hangup') {
                                    Janus.log("Call hung up by " + result["username"] + " (" + result["reason"] + ")!");
                                    // Reset status
                                    bootbox.hideAll();
                                    self.chatHandler.hangup();
                                    if(spinner !== null && spinner !== undefined)
                                        spinner.stop();
                                    $('#waitingvideo').remove();
                                    $('#videos').hide();
                                    $('#peer').removeAttr('disabled').val('');
                                    $('#call').removeAttr('disabled').html('Call')
                                        .removeClass("btn-danger").addClass("btn-success")
                                        .unbind('click').click(self.doCall);
                                    $('#toggleaudio').attr('disabled', true);
                                    $('#togglevideo').attr('disabled', true);
                                    $('#bitrate').attr('disabled', true);
                                    $('#curbitrate').hide();
                                    $('#curres').hide();
                                }
                            }
                        } else {
                            // FIXME Error?
                            var error = msg["error"];
                            bootbox.alert(error);
                            if(error.indexOf("already taken") > 0) {
                                // FIXME Use status codes...
                                $('#username').removeAttr('disabled').val("");
                                $('#register').removeAttr('disabled').unbind('click').click(self.registerUsername());
                            }
                            // TODO Reset status
                            self.chatHandler.hangup();
                            if(spinner !== null && spinner !== undefined)
                                spinner.stop();
                            $('#waitingvideo').remove();
                            $('#videos').hide();
                            $('#peer').removeAttr('disabled').val('');
                            $('#call').removeAttr('disabled').html('Call')
                                .removeClass("btn-danger").addClass("btn-success")
                                .unbind('click').click(doCall);
                            $('#toggleaudio').attr('disabled', true);
                            $('#togglevideo').attr('disabled', true);
                            $('#bitrate').attr('disabled', true);
                            $('#curbitrate').hide();
                            $('#curres').hide();
                            if(bitrateTimer !== null && bitrateTimer !== null)
                                clearInterval(bitrateTimer);
                            bitrateTimer = null;
                        }
                    },
                    onlocalstream: function(stream) {
                        Janus.debug(" ::: Got a local stream :::");
                        Janus.debug(JSON.stringify(stream));
                        $('#videos').removeClass('hide').show();
                        if($('#myvideo').length === 0)
                            $('#videoleft').append('<video class="rounded centered" id="myvideo" width=320 height=240 autoplay muted="muted"/>');
                        Janus.attachMediaStream($('#myvideo').get(0), stream);
                        $("#myvideo").get(0).muted = "muted";
                        // No remote video yet
                        $('#videoright').append('<video class="rounded centered" id="waitingvideo" width=320 height=240 />');
                        if(spinner == null) {
                            var target = document.getElementById('videoright');
                            spinner = new Spinner({top:100}).spin(target);
                        } else {
                            spinner.spin();
                        }
                        var videoTracks = stream.getVideoTracks();
                        if(videoTracks === null || videoTracks === undefined || videoTracks.length === 0) {
                            // No webcam
                            $('#myvideo').hide();
                            $('#videoleft').append(
                                '<div class="no-video-container">' +
                                '<i class="fa fa-video-camera fa-5 no-video-icon"></i>' +
                                '<span class="no-video-text">No webcam available</span>' +
                                '</div>');
                        }
                    },
                    onremotestream: function(stream) {
                        Janus.debug(" ::: Got a remote stream :::");
                        Janus.debug(JSON.stringify(stream));
                        if($('#remotevideo').length === 0)
                            $('#videoright').append('<video class="rounded centered hide" id="remotevideo" width=320 height=240 autoplay/>');
                        // Show the video, hide the spinner and show the resolution when we get a playing event
                        $("#remotevideo").bind("playing", function () {
                            $('#waitingvideo').remove();
                            $('#remotevideo').removeClass('hide');
                            if(spinner !== null && spinner !== undefined)
                                spinner.stop();
                            spinner = null;
                            var width = this.videoWidth;
                            var height = this.videoHeight;
                            $('#curres').removeClass('hide').text(width+'x'+height).show();
                            if(adapter.browserDetails.browser === "firefox") {
                                // Firefox Stable has a bug: width and height are not immediately available after a playing
                                setTimeout(function() {
                                    var width = $("#remotevideo").get(0).videoWidth;
                                    var height = $("#remotevideo").get(0).videoHeight;
                                    $('#curres').removeClass('hide').text(width+'x'+height).show();
                                }, 2000);
                            }
                        });
                        Janus.attachMediaStream($('#remotevideo').get(0), stream);
                        var videoTracks = stream.getVideoTracks();
                        if(videoTracks === null || videoTracks === undefined || videoTracks.length === 0 || videoTracks[0].muted) {
                            // No remote video
                            $('#remotevideo').hide();
                            $('#videoright').append(
                                '<div class="no-video-container">' +
                                '<i class="fa fa-video-camera fa-5 no-video-icon"></i>' +
                                '<span class="no-video-text">No remote video available</span>' +
                                '</div>');
                        }
                        $('#callee').removeClass('hide').html(yourusername).show();
                        // Enable audio/video buttons and bitrate limiter
                        audioenabled = true;
                        videoenabled = true;
                        $('#toggleaudio').html("Disable audio").removeClass("btn-success").addClass("btn-danger")
                            .unbind('click').removeAttr('disabled').click(
                            function() {
                                audioenabled = !audioenabled;
                                if(audioenabled)
                                    $('#toggleaudio').html("Disable audio").removeClass("btn-success").addClass("btn-danger");
                                else
                                    $('#toggleaudio').html("Enable audio").removeClass("btn-danger").addClass("btn-success");
                                self.chatHandler.send({"message": { "request": "set", "audio": audioenabled }});
                            });
                        $('#togglevideo').html("Disable video").removeClass("btn-success").addClass("btn-danger")
                            .unbind('click').removeAttr('disabled').click(
                            function() {
                                videoenabled = !videoenabled;
                                if(videoenabled)
                                    $('#togglevideo').html("Disable video").removeClass("btn-success").addClass("btn-danger");
                                else
                                    $('#togglevideo').html("Enable video").removeClass("btn-danger").addClass("btn-success");
                                self.chatHandler.send({"message": { "request": "set", "video": videoenabled }});
                            });
                        $('#toggleaudio').parent().removeClass('hide').show();
                        $('#bitrateset').html("Bandwidth");
                        $('#bitrate a').unbind('click').removeAttr('disabled').click(function() {
                            var id = $(this).attr("id");
                            var bitrate = parseInt(id)*1000;
                            if(bitrate === 0) {
                                Janus.log("Not limiting bandwidth via REMB");
                            } else {
                                Janus.log("Capping bandwidth to " + bitrate + " via REMB");
                            }
                            $('#bitrateset').html($(this).html()).parent().removeClass('open');
                            self.chatHandler.send({"message": { "request": "set", "bitrate": bitrate }});
                            return false;
                        });
                        if(adapter.browserDetails.browser === "chrome" || adapter.browserDetails.browser === "firefox") {
                            $('#curbitrate').removeClass('hide').show();
                            bitrateTimer = setInterval(function() {
                                // Display updated bitrate, if supported
                                var bitrate = self.chatHandler.getBitrate();
                                $('#curbitrate').text(bitrate);
                            }, 1000);
                        }
                    },
                    ondataopen: function(data) {
                        Janus.log("The DataChannel is available!");
                        $('#videos').removeClass('hide').show();
                        $('#datasend').removeAttr('disabled');
                    },
                    ondata: function(data) {
                        Janus.debug("We got data from the DataChannel! " + data);
                        $('#datarecv').val(data);
                    },
                    oncleanup: function() {
                        Janus.log(" ::: Got a cleanup notification :::");
                        $('#myvideo').remove();
                        $('#remotevideo').remove();
                        $("#videoleft").parent().unblock();
                        $('#callee').empty().hide();
                        yourusername = null;
                        $('#curbitrate').hide();
                        $('#curres').hide();
                        $('#videos').hide();
                        $('#toggleaudio').attr('disabled', true);
                        $('#togglevideo').attr('disabled', true);
                        $('#bitrate').attr('disabled', true);
                        $('#curbitrate').hide();
                        $('#curres').hide();
                        if(bitrateTimer !== null && bitrateTimer !== null)
                            clearInterval(bitrateTimer);
                        bitrateTimer = null;
                        $('#waitingvideo').remove();
                        $('#videos').hide();
                        $('#peer').removeAttr('disabled').val('');
                        $('#call').removeAttr('disabled').html('Call')
                            .removeClass("btn-danger").addClass("btn-success")
                            .unbind('click').click(doCall);
                    }
                });
            },
            error: function(error) {
                Janus.error(error);
                bootbox.alert(error, function() {
                    window.location.reload();
                });
            },
            destroyed: function() {
                window.location.reload();
            }
        });
    }});
};

SimpleVideoChat.prototype.checkEnter = function(field, event) {
    var self = this;
    var theCode = event.keyCode ? event.keyCode : event.which ? event.which : event.charCode;
    if(theCode == 13) {
        if(field.id == 'username')
            self.registerUsername(field.value);
        else if(field.id == 'peer')
            self.doCall(field.value);
        else if(field.id == 'datasend')
            self.sendData(field.value);
        return false;
    } else {
        $('#register').removeAttr('disable').click(self.buttonSubmit);
        return true;
    }
};

SimpleVideoChat.prototype.buttonSubmit = function(){
    var self = this;
    var username = document.getElementById('username').value;
    if(username === "") {
        Janus.debug("Insert a username to register (e.g., pippo)");
        return;
    }
    if (!(/[^a-zA-Z0-9]/.test(username))) {
        Janus.debug('Input is not alphanumeric');
        return;
    }
    self.registerUsername(username);
}

SimpleVideoChat.prototype.registerUsername = function(username) {
    // Try a registration
    var self = this;
    if(username === "") {
        Janus.debug("Insert a username to register (e.g., pippo)");
        return;
    }
    if(/[^a-zA-Z0-9]/.test(username)) {
        Janus.debug('Input is not alphanumeric');
        return;
    }
    var register = { "request": "register", "username": username };
    self.username = username;
    self.chatHandler.send({"message": register});
};

SimpleVideoChat.prototype.answerVideo = function(){
    var self = this;
    self.chatHandler.createAnswer(
        {
            jsep: self.jsep,
            // No media provided: by default, it's sendrecv for audio and video
            media: { data: true },	// Let's negotiate data channels as well
            success: function(jsep) {
                Janus.debug("Got SDP!");
                Janus.debug(jsep);
                var body = { "request": "accept" };
                self.chatHandler.send({"message": body, "jsep": jsep});
            },
            error: function(error) {
                Janus.error("WebRTC error:", error);
            }
        });
};

SimpleVideoChat.prototype.leaveRoom = function() {
    var self = this;
    self.janus.destroy();
};

SimpleVideoChat.prototype.doCall = function(peer) {
    // Call someone
    var self = this;
    if(peer === "" || peer === null){
        peer = document.getElementById('peer').value;
    };

    var username = peer;
    if(username === "") {
        bootbox.alert("Insert a username to call (e.g., pluto)");
        $('#peer').removeAttr('disabled');
        $('#call').removeAttr('disabled').click(doCall);
        return;
    }
    if(/[^a-zA-Z0-9]/.test(username)) {
        bootbox.alert('Input is not alphanumeric');
        $('#peer').removeAttr('disabled').val("");
        $('#call').removeAttr('disabled').click(doCall);
        return;
    }
    // Call this user
    self.chatHandler.createOffer(
        {
            // By default, it's sendrecv for audio and video...
            media: { data: true },	// ... let's negotiate data channels as well
            success: function(jsep) {
                Janus.debug("Got SDP!");
                Janus.debug(jsep);
                var body = { "request": "call", "username": username };
                self.chatHandler.send({"message": body, "jsep": jsep});
            },
            error: function(error) {
                Janus.error("WebRTC error...", error);
                bootbox.alert("WebRTC error... " + error);
            }
        });
}

SimpleVideoChat.prototype.doHangup = function() {
    // Hangup a call
    var self = this;
    $('#call').attr('disabled', true).unbind('click');
    var hangup = { "request": "hangup" };
    self.chatHandler.send({"message": hangup});
    self.chatHandler.hangup();
    yourusername = null;
}

SimpleVideoChat.prototype.sendData = function(data) {
    var self = this;
    if(data === "") {
        bootbox.alert('Insert a message to send on the DataChannel to your peer');
        return;
    }
    self.chatHandler.data({
        text: data,
        error: function(reason) { bootbox.alert(reason); },
        success: function() { $('#datasend').val(''); },
    });
}