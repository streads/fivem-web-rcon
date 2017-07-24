var express = require('express')
var app = express();
var io = require('socket.io')(8080);
var fs = require('fs')
const dns = require('dns');
const uuidv4 = require('uuid/v4');
const pug = require('pug');

var Rcon = require('rcon');
var options = {
  tcp: false,       // false for UDP, true for TCP (default true)
  challenge: false  // true to use the challenge protocol (default true)
};

var online = 0;
var connected = 0;
var RconConnection = {}

app.engine('pug', require('pug').__express);
app.listen(80, function () {
    console.log('http server started on port 80');
});

// APP.GET REQUEST
app.get('/', function(req, res){
    res.end("403 Forbidden")
});
app.get('/rcon', function (req, res) {
  _tunnel = uuidv4()
  var data = pug.renderFile('ui.pug', {
    tunnel: _tunnel
  });
  res.end(data)
});


app.get('/panel', function(req,res){
  res.end(uuidv4())
});

io.on('connection', function (socket) {
  online = online+1
  connected = connected+1
  console.log("\033[2J Online: " + online);
  console.log(" Since restart: " + connected);
  socket.on('rcon_connect', function (data) {
    patt = new RegExp("^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^(([a-zA-Z]|[a-zA-Z][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z]|[A-Za-z][A-Za-z0-9\-]*[A-Za-z0-9])$|^(?:(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){6})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:::(?:(?:(?:[0-9a-fA-F]{1,4})):){5})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:(?:[0-9a-fA-F]{1,4})):){4})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,1}(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:(?:[0-9a-fA-F]{1,4})):){3})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,2}(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:(?:[0-9a-fA-F]{1,4})):){2})(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,3}(?:(?:[0-9a-fA-F]{1,4})))?::(?:(?:[0-9a-fA-F]{1,4})):)(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,4}(?:(?:[0-9a-fA-F]{1,4})))?::)(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9]))\.){3}(?:(?:25[0-5]|(?:[1-9]|1[0-9]|2[0-4])?[0-9])))))))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,5}(?:(?:[0-9a-fA-F]{1,4})))?::)(?:(?:[0-9a-fA-F]{1,4})))|(?:(?:(?:(?:(?:(?:[0-9a-fA-F]{1,4})):){0,6}(?:(?:[0-9a-fA-F]{1,4})))?::))))$")
    if (patt.test(data.ip) == false || data.port > 65535 || data.port < 1){
      newclient = null;
      socket.emit("rcon_response", {content: "Error bad hostname_1"})
    }else{
      newclient =  new Rcon(data.ip, data.port, data.password, options);
      if (newclient != null){
        newclient.on("auth", function(){
          socket.emit("rcon_response", {content: "Binded to " + data.ip + ":" + data.port})
        });
        newclient.on("response", function(str){
          if (str.startsWith("rint")){
            str = str.slice( 1 );
            str = str.slice( 1 );
            str = str.slice( 1 );
            str = str.slice( 1 );
          }
          while (str.indexOf("\n") !== -1){
            str = str.replace("\n", "<br>")
          }
          socket.emit("rcon_response", {content: str})

        })
      }

      if (RconConnection[socket.id] != null){
        RconConnection[socket.id].disconnect()
      }
      RconConnection[socket.id] = newclient
      RconConnection[socket.id].connect();
    }
  });
  socket.on("disconnect", function(){
    RconConnection[socket.id] = null;
    online = online - 1
    console.log("\033[2J Online: " + online);
    console.log(" Since restart: " + connected);
  })
  socket.on("rcon_command", function(data){
    if (RconConnection[socket.id] != null){
      RconConnection[socket.id].send(data);
    }else{
      socket.emit("rcon_response", {content: "not logged"})
    }
  })
});

String.prototype.startsWith = function(needle)
{
    return(this.indexOf(needle) == 0);
};
