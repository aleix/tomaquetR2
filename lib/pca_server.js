// main library for handling pwm events
// Events are pwm requests channel, value = offtime, on-time always 0 


var socketio, io, PwmDriver, pwm, makePwm, Gpio, wpi, pins, proc, fs, spawn;

spawn = require('child_process').spawn;
fs = require('fs');
socketio = require('socket.io');
makePwm = require('adafruit-pca9685');
pwm = makePwm({
    "freq": 50,
    "correctionFactor": 1.118
});
wpi = require('wiring-pi');
wpi.setup('gpio');

pins = [{
        pin: 12,
        confPin: {
            mode: "output",
            initValue: 0,
            object: "Led"
        }
    }, {
        pin: 16,
        confPin: {
            mode: "output",
            initValue: 0,
            object: "Driver up camera motor"
        }
    }, {
        pin: 17,
        confPin: {
            mode: "output",
            initValue: 0,
            object: "Driver up camera motor"
        }
    }, {
        pin: 18,
        confPin: {
            mode: "output",
            initValue: 0,
            object: "Driver turn head motor"
        }
    }, {
        pin: 22,
        confPin: {
            mode: "output",
            initValue: 0,
            object: "Driver turn head motor"
        }
    }, {
        pin: 23,
        confPin: {
            mode: "output",
            initValue: 0,
            object: "motor 5"
        }
    }, {
        pin: 6,
        confPin: {
            mode: "input",
            initValue: 0,
            object: "Camera up limit switch"
        }
    }]
    //resetting pwm
console.info('stopping pwm for better battery performance')
//pwm.stop();

//init for pins
for (var i = pins.length - 1; i >= 0; i--) {
    var pin = pins[i].pin,
        mode = pins[i].confPin.mode.toUpperCase(),
        value = pins[i].confPin.initValue;

    wpiPinMode(pin, mode);

    if (mode == "OUTPUT") {
        wpiDigitalWrite(pin, value);
    }

}

// setting up pin mode
function wpiPinMode(pin, mode) {
    target = parseInt(pin);
    console.info("initiatin pin: " + target + " as " + mode);
    if (mode == "INPUT") {
        wpi.pinMode(target, wpi.INPUT);
    } else {
        wpi.pinMode(target, wpi.OUTPUT);
    }
}

function wpiDigitalWrite(pin, value) {
    wpi.digitalWrite(pin, value);
    console.info("writing digital value to pin: " + pin + " with value: " + value);
}

function lookingForFinal() {
    var interval = setInterval(
        function readPin() {
            console.info(wpi.digitalRead(6));
            if (wpi.digitalRead(6)) {
                stopAll();
                clearInterval(interval);
            }
        }, 100);

}


// deal with any signals and cleanup

process.on('SIGINT', function(code) {
    console.info("\nCtrl-C caught ...");
    process.exit(0);
});

process.on('SIGHUP', function(code) {
    console.info("exiting ...");
    process.exit(0);
});

process.on('exit', function(code) {
    console.info("exiting ...");
    process.exit(0);
});

// Setup the socketio connection and listeners

exports.listen = function(server) {
    io = socketio.listen(server);
    io.set('log level', 1);
    io.sockets.on('connection', function(socket) {
        console.info('client connected');
        handlePwmRequest(socket);
        handlePwmPulseRequest(socket);
        handleStopRequest(socket);
        handleClientDisconnection(socket);
        handleUpMotorRequest(socket);
        handleDownMotorRequest(socket);
        handleCancelPinRequest(socket);
        handleCameraRequest(socket, io);
    });
};

function handlePwmRequest(socket) {
    socket.on('pwm', function(channel, value) {
        var ch = parseInt(channel);
        var v = parseInt(value);
        pwm.setPwm(ch, 0, v);
    });
}

function handlePwmPulseRequest(socket) {
    socket.on('pwmpulse', function(channel, value) {
        var ch = parseInt(channel);
        var v = parseInt(value);
        pwm.setPulse(ch, v);
    });
}

function handleStopRequest(socket) {
    socket.on('pwmstop', function() {
        pwm.stop();
    });
}

function handleClientDisconnection(socket) {
    socket.on('disconnect', function() {
       pwm.stop();
       stopStreaming();
        console.info("client disconnected");
    });
}

/*funcions control motors*/

function handleUpMotorRequest(socket) {
    socket.on('upMotor', function() {
        wpi.digitalWrite(18, 0);
        wpi.digitalWrite(17, 1);
        wpi.digitalWrite(12, 1);
        lookingForFinal();
        console.info('Motor up');
    });
}


function handleDownMotorRequest(socket) {
    socket.on('downMotor', function() {
        wpi.digitalWrite(18, 1);
        wpi.digitalWrite(17, 0);
        wpi.digitalWrite(12, 0);
        console.info('Motor Down');
        setTimeout(stopAll, 3000);
    });
}

function handleCancelPinRequest(socket) {
    socket.on('cancelPin', function() {
        stopAll();
    });
}

//service functions
function stopAll() {
    for (var i = pins.length - 1; i >= 0; i--) {
        wpiDigitalWrite(pins[i].pin, 0)
        console.info("Stopping pin: " + pins[i].pin);
    }
}

//camera

function handleCameraRequest(socket, io) {
    socket.on('start-stream', function() {
        startStreaming(io);
    });
    socket.on('stop-stream', function() {
        stopStreaming();
    });

}

var watchingFile;

function startStreaming(io) {
    if (watchingFile) {
        io.sockets.emit('liveStream', '/stream?_t=' + (Math.random() * 100000));
        return;
    }
    var args = ["-w", "640", "-h", "480", "-o", "./stream/image_stream.jpg", "-t", "999999999", "-tl", "1", "-q", "15"];
    proc = spawn('raspistill', args);
    console.log('Watching for changes...');
    watchingFile = true;



    fs.watchFile('./stream/image_stream.jpg', { interval: 100 }, function(current, previous) {
        console.log('la imatge ha canviat?!');
        io.sockets.emit('liveStream', '/stream?_t=' + (Math.random() * 100000));
    })

}


function stopStreaming() {
 if (watchingFile) {
            if (proc) proc.kill();
            fs.unwatchFile('./stream/image_stream.jpg');
            watchingFile = false;
        }
}
