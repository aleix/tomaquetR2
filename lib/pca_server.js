// main library for handling pwm events
// Events are pwm requests channel, value = offtime, on-time always 0 

var socketio, io, PwmDriver, pwm, makePwm, Gpio, wpi, pins;

socketio = require('socket.io');
makePwm = require('adafruit-pca9685');
pwm = makePwm({"freq": 50, "correctionFactor": 1.118});
wpi = require('wiring-pi');
wpi.setup('gpio');

pins=[{
  pin :12,
  confPin: {
    mode:"out",
    initValue:0,
    object:"Led"
  }},
  {
  pin:16,
  confPin:{
    mode:"out",
    initValue:0,
    object:"Driver up camera motor"
  }},
  {
  pin:17,
  confPin:{
    mode:"out",
    initValue:0,
    object:"Driver up camera motor"
  }},
  {
  pin:18,
  confPin:{
    mode:"out",
    initValue:0,
    object:"Driver turn head motor"
  }},
  {
  pin:22,
  confPin:{
    mode:"out",
    initValue:0,
    object:"Driver turn head motor"
  }},
  {
  pin:23,
  confPin:{
    mode:"out",
    initValue:0,
    object:"motor 5"
  }},
  {
  pin:6,
  confPin:{
    mode:"in",
    initValue:0,
    object:"Up limit switch"
  }
}]

//init for pins
for (var i = pins.length - 1; i >= 0; i--) {
  var pin=pins[i].pin, 
      mode=pins[i].confPin.mode.toUpperCase();
 
//console.log('pin: '+pin+'mode: '+mode);
  wpiPinMode(pin,mode);
  //wpi.pinMode(pins[i], wpi.OUTPUT);
  //console.log(pins[i].pin);
  //console.log(pins[i].confPin.mode);
}
// setting up pin mode
function wpiPinMode(pin, mode){
  target=parseInt(pin);
  console.log(target);
  if (mode=="IN"){
    wpi.pinMode(target,wpi.IN);
  } else {
    wpi.pinMode(target,wpi.OUTPUT);
  }
  
}
// posem els pins dels motors i leds com a sortida

/*wpi.pinMode(12, wpi.OUTPUT);// led)
wpi.pinMode(16, wpi.OUTPUT);// led
wpi.pinMode(17, wpi.OUTPUT);// motor 1
wpi.pinMode(18, wpi.OUTPUT);// motor 1
wpi.pinMode(22, wpi.OUTPUT);// motor 2
wpi.pinMode(23, wpi.OUTPUT);// motor 2*/
//wpi.pinMode(6, wpi.INPUT);  // interruptor fi de carrera

wpi.digitalWrite(12,0);
wpi.digitalWrite(16,0);
wpi.digitalWrite(17,0);
wpi.digitalWrite(18,0);
wpi.digitalWrite(22,0);
wpi.digitalWrite(23,0);

setInterval(
function readPin(){
    console.log(wpi.digitalRead(6));	
	if(wpi.digitalRead(6)){
		wpi.digitalWrite(12,0);
		wpi.digitalWrite(16,0);
		wpi.digitalWrite(17,0);
		wpi.digitalWrite(18,0);
		wpi.digitalWrite(22,0);
		wpi.digitalWrite(23,0);
	}
}

,300);


// deal with any signals and cleanup

process.on('SIGINT', function(code) {
    console.log("\nCtrl-C caught ...");
    process.exit(0);
});

process.on('SIGHUP', function(code) {
    console.log("exiting ...");
    process.exit(0);
});

process.on('exit', function(code) {
    console.log("exiting ...");
    process.exit(0);
});

// Setup the socketio connection and listeners

exports.listen = function(server) {
  io = socketio.listen(server);
  io.set('log level', 1);
  io.sockets.on('connection', function (socket) {
    console.log('client connected');
    handlePwmRequest(socket);
    handlePwmPulseRequest(socket);
    handleStopRequest(socket);
    handleClientDisconnection(socket);
    handleUpMotorRequest(socket);
    handleDownMotorRequest(socket);
    handleCancelPinRequest(socket);
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
      console.log("client disconnected");
  });
}

/*funcions control motors*/

function handleUpMotorRequest(socket) {
    socket.on('upMotor', function() {
	
	wpi.digitalWrite(18,0);
	wpi.digitalWrite(17,1);
	console.log('startMotor led on');
	wpi.digitalWrite(12,1);

 
      });
}


function handleDownMotorRequest(socket) {
    socket.on('downMotor', function() {
	
	wpi.digitalWrite(18,1);
	wpi.digitalWrite(17,0);
	console.log('startMotor led on');
	wpi.digitalWrite(12,0);

 
      });
}



function handleCancelPinRequest(socket){
	socket.on('cancelPin', function(){
	wpi.digitalWrite(12,0);
	wpi.digitalWrite(16,0);
	wpi.digitalWrite(17,0);
	wpi.digitalWrite(18,0);
	wpi.digitalWrite(22,0);
	wpi.digitalWrite(23,0);
	
	});
}





