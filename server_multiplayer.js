// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8000;
var request = require('request');

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/www'));

//VARIABLES GLOBALES
var numUsers = 0;
var room = 0;
var numUsersRoom = 0;

/*io.Socket.prototype.disconnectRoom = function (name) {
    var nsp = this.namespace.name
    , name = (nsp + '/') + name;

    var users = this.manager.rooms[name];

    for(var i = 0; i < users.length; i++) {
        io.sockets.socket(users[i]).disconnect();
    }

    return this;
};*/
//############ METODO PRINCIPAL AL CONECTARSE UN CLIENTE #############// io.once solo una oportunidad
io.on('connection', function (socket) {

  console.log("#### A INGRESADO UNA NUEVA CONEXION AL SERVIDOR ####");
  var addedPlayer = false;

   //########### AL CONECTARSE UN CLIENTE INGRESAMOS AL ULTIMO ROOM
  console.log("STATUS CLIENTES EN ROOM: "+room);
	
    console.log("UNIENDOSE A LA ROOM: "+room);
	
	if(socket.room != null){//VALIDAMOS SI ESTE SOCKET ESTA EN LA ROOM
	console.log("El socketid: "+socket.id+", ya está en la room: "+room);
	socket.leave(socket.room);
	socket.join(room);
	console.log("Se desconecta de la room la antigua instancia y se reconecta.");
	}else{
    socket.join(room);
	console.log("El socketid: "+socket.id+", se unió a la room: "+room);
	}
	
	console.log("%%% NUM USERS AFTER SOCKET JOIN: "+numUsersRoom);
	/*var clients = io.sockets.adapter.rooms[room];
	for (var clientId in clients) {
	  console.log(io.sockets.connected[clientId]);
	  numUsersRoom++;
}
	if(numUsersRoom == 1){
		console.log("SOLO UN JUGADOR EN LA ROOM");
	}else if(numUsersRoom == 2){
		console.log("DOS JUGADORES EN LA ROOM");
	}*/
   
  //##############################################################################################################//
  //############# CLIENTE EMITE AGREGAR JUGADOR Y SE CONTROLA LOGIN Y MENSAJE A CLIENTES DE USER JOINED ##########//
  //##############################################################################################################//
  socket.on('add player', function (data) {
    
    var code;
    var res;
    var jsonObject;
    var aliasReq = data.alias;
    var imeiReq = data.imei;
    var actionGameReq = data.action; 
	var imgAvatarReqOne = data.imgavatar;
	//var previousSocketId = data.previousSocketId;
	var socketId = socket.id;

      console.log('### SOLICITANDO CREAR PARTIDA A AMBICIOSO.CL #### '+socketId);
      //INVOCACION DE CREACION PARTIDA
      //REQUEST DE PRUEBA SOCKET{"alias": "Jose", "imei": 484738733, "action_game": "one_player"}

     request('http://ambicioso.cl/crear_registro_ambicioso.asp?alias='+aliasReq+'&imei='+imeiReq+'&action='+actionGameReq+"&socketid="+socketId, function (error, response, body) {

    if (!error && response.statusCode == 200) {
        
    code = response.statusCode;
    res = response.body;
    console.log('STATUS: ' + code);
    console.log('BODY: ' + JSON.stringify(res));
	
    //TEMPORAL MIENTRAS ARREGLAN LAS RESPUESTAS DOCIRS
    //var prueba='{"token": "QY83", "imei": "'+imeiReq+'", "alias": "'+aliasReq+'", "action": "multiplayer", "room": "'+room
	//+'", "imgavatar": "'+imgAvatarReqOne+'", "numUsers": '+numUsersRoom+'}';
	
	//var prueba='{"token": "QY83", "imei": "'+imeiReq+'", "alias": "'+aliasReq+'", "action": "'+actionGameReq+'"}';
	
	jsonObject = JSON.parse(res);//CAMBIAR POR RES DESPUES
	
	if (addedPlayer) return;
    //ALMACENAMOS LAS VARIABLES GLOBALES DEL JUGADOR EN SU SOCKET
	socket.token = jsonObject.token;
    socket.alias = aliasReq;
    socket.room = room;
	socket.actiongame = actionGameReq;
	socket.imgavatar = imgAvatarReqOne;
    addedPlayer = true;
	
	jsonObject['room'] = room;
	jsonObject['imgavatar'] = imgAvatarReqOne;
	jsonObject['numUsers'] = ++numUsers;
	jsonObject['activeSocketId'] = socket.id;
	
	console.log("JSON ALIAS: "+jsonObject.alias+", JSON TOKEN: "+jsonObject.token+", JSON ROOM: "+jsonObject.room+
	", previousSocket: "+jsonObject.previousSocketId+", activeSocket: "+jsonObject.activeSocket);
	
	/*var socketIds = io.sockets.adapter.rooms[socket.room];
	for (var i = 0, len = socketIds.length; i < len; i++) {
            // check if the socket is not the requesting
            // socket
			console.log("Socket en room: "+socketIds.sockets[i]);
			
            if (socketIds.sockets[i] == previousSocketId && previousSocketId != null) {
				console.log("El mismo jugador intenta ingresar a la misma sala!");
				var oldSocket = io.sockets.connected[previousSocketId];
				oldSocket.leave(socket.room);
				--numUsers;
			}else{
				console.log("El jugador ingresa en una sala distinta tras su nueva conexión.")
			}
	}*/
	
    console.log("#### SE EMITE MENSAJE DE LOGIN AL JUGADOR "+socket.alias+" ####");
	//MENSAJE SOLO EMITIDO AL JUGADOR QUE INVOCO
	socket.emit('login', socket.alias, jsonObject);//SE ENVIA DATA POR SER LOGIN SOLO DATOS INICIALES DEL USUARIO
	
    //EMITE MENSAJE A LOS OTROS CLIENTES DISTINTOS AL DEL SOCKET EN LA ROOM ESPECIFICADA
    socket.broadcast.to(room).emit('user joined', socket.alias, jsonObject);//SE ENVIA TODOS LOS DATOS
	  //LA VARIABLE ROOM SE INCREMENTA CADA VEZ QUE DOS SOCKETS SE UNEN Y HACEN LOGIN, ESTO PARA QUE LOS SIGUIENTES CLIENTES TENGAN SUS PROPIAS ROOM
	  if(numUsers % 2 == 0){
	  room++;//INCREMENTAMOS LA VARIABLE GLOBAL ROOM, PARA QUE LAS PROXIMAS CONEXIONES SEAN SEGMENTADAS
	  numUsersRoom = 0;
	  }
  
    }else{
      console.log('STATUS: ' + code);
      console.log(error);}
      });
  });
  
  //##############################################################################################################//
  //########################### CUANDO EL CLIENTE EMITE UNA SOLICITUD DE CARTA ###################################//
  //##############################################################################################################//
  socket.on('new card', function (data) {
    console.log('### SOLICITANDO NUEVA CARTA A AMBICIOSO.CL ####');
    var res;
    var code;
	var jsonCard;
    var aliasReq = data.alias;
    var tokenReq = data.token;
    var turnReq = data.turn;
    var roomReq = data.room;
	var actionReq = data.action;
	
	var prueba = '';

    //{"alias": "Luis", "imei": "73462374", "token": "01BO",  "turn": "A", "room": 1} REQUEST DE PRUEBA

    request('http://ambicioso.cl/devuelve_carta_sacada_ambicioso.asp?token='+tokenReq+'&alias='+aliasReq+'&turn='+turnReq+'&room='+roomReq+'&action='+actionReq, function (error, response, body) {
    if (!error && response.statusCode == 200) {

        code = response.statusCode;
		res = response.body;
		console.log('STATUS: ' + code);
		console.log('BODY: ' + JSON.stringify(res));
		//TEMPORAL MIENTRAS ARREGLAN LAS RESPUESTAS DOCIRS
		//prueba='{"last_card": "07Diamante_A", "keeping_cards":"91", "action":"multiplayer", "turn": "'+turnReq+'", "room":'+roomReq+'}';
		//prueba='{"last_card": "cuatro_diamante", "keeping_cards":"91", "action":"multiplayer"}';

		jsonCard = JSON.parse(res);
		jsonCard['room'] = roomReq;
		jsonCard['turn'] = turnReq;//REEMPLAZO EL QUE VIENE DE DOCIRS
		
		console.log("Last_card: "+jsonCard.last_card+ ", RoomReq: "+jsonCard.room+", Turn: "+jsonCard.turn+ ", Points: "+jsonCard.value);
		
		io.in(roomReq).emit('new card', socket.alias, jsonCard);

    }else{ 
    	console.log('STATUS: ' + code);
    	console.log(error);} 
    });
  });

  //##############################################################################################################//
  //####################CUANDO EL JUGADOR HACE TOUCH SE EMITE QUE ESTA JUGANDO ###################################//
  //##############################################################################################################//
  socket.on('reconnect', function (data) {

	  console.log("#### LLEGO A RECONNECT SOCKET ON ####");
    var roomReq = data.room;
    var alias = data.alias;

    console.log("REGRESANDO A LA ROOM: "+roomReq);
    socket.join(roomReq);
	addedPlayer = true;
	++numUsers;
    //EMITE MENSAJE CON EL ALIAS DEL JUGADOR QUE HA REGRESADO AL OTRO JUGADOR ACTIVO
    socket.broadcast.to(roomReq).emit('user back', alias);
  });

  //##############################################################################################################//
  //################################### THE CLIENT STOP PLAYING (TOUCHING) #######################################//
  //##############################################################################################################//
  socket.on('user leave', function (data) {
    //SI TIENE MAS DE 20 SEGUNDOS SIN JUGAR SE EMTIRA ESTE MENSAJE
    var roomReq = data.room;
    var alias = data.alias;

    if (addedPlayer) {
		numUsers--;
      /*--numUsers;
	  if(numUsers < 0){
		  numUsers = 0;
	  }*/
	  /*--numUsersRoom;
	  if(numUsersRoom < 0){
		  numUsersRoom = 0;
	  }else if(numUsersRoom == 1){
		  numUsersRoom = 0;
	  }*/
	  
	  console.log("%%% NUM USERS AFTER DISCONNECT: "+numUsers);
	  
	  socket.leave(roomReq);
      //socket.leave('/'+roomReq);
      //EMITE MENSAJE A LOS CLIENTES DE LA ROOM QUE EL USUARIO HA ABANDONADO
      socket.broadcast.to(roomReq).emit('user left', socket.alias, socket.room);
    }
	
  });

  //##############################################################################################################//
  //######################################### EL CLIENTE SE HA DESCONECTADO ######################################//
  //##############################################################################################################//
  socket.on('disconnect', function (data) {
	  console.log("#### DISCONNECTED SOCKET #### "+socket.alias+", Sale de la room: "+socket.room);
	  //socket.leave(socket.room);
    
	if (addedPlayer) {
		numUsers--;
      //--numUsers;
	  /*if(numUsers < 0){
		  numUsers = 0;
	  }*/
	  /*--numUsersRoom;
	  if(numUsersRoom < 0){
		  numUsersRoom = 0;
	  }else if(numUsersRoom == 1){
		  numUsersRoom = 0;
	  }*/
	  
	  console.log("%%% NUM USERS AFTER DISCONNECT: "+numUsers);
      socket.leave(socket.room);
      //socket.leave('/'+socket.room);

      //EMITE MENSAJE A LOS CLIENTES DE LA ROOM QUE EL USUARIO HA ABANDONADO
      socket.broadcast.to(socket.room).emit('user left', socket.alias, socket.room);
    }

  });

  //##############################################################################################################//
  //##################################### EL CLIENTE SOLICITA EL FIN DEL TURNO ###################################//
  //##############################################################################################################//
  socket.on('end turn', function (data) { 

      var aliasReq = data.player1;
      var remoteAliasReq = data.player2;
      var actionGameReq = data.action;
      var roomReq = data.room;
      var tokenReq = data.token;
	  var turnReq = data.turn;
	  var typeEndTurn = data.typeEndTurn;
	  var newTurn;
      var code;
      var res;
      var jsonEndTurn;
	  
	  var prueba = '';

      console.log("#### SOLICITANDO END TURN SOCKET ON ####");

     //INVOCACION DE METODO END TURN PARTIDA http://ambicioso.cl/MiTurno_Ambicioso.asp?token=01BO&player1=Luis&player2=Pepe 
     //JSON REQUEST PRUEBA {"player1": "Luis", "player2": "Pepe", "token": "01BO"}

	 //TOKEN REQ ESTA DANDO PROBLEMAS!!!!
     //request('http://ambicioso.cl/MiTurno_Ambicioso.asp?player1='+aliasReq+'&player2='+remoteAliasReq+'&token=01BO&action='+actionGameReq+'&room='+roomReq, function (error, response, body) {

    /*if (!error && response.statusCode == 200) {
        
    code = response.statusCode;
    res = response.body;
    console.log('STATUS: ' + code);
    console.log('BODY: ' + JSON.stringify(res));*/
    //TEMPORAL MIENTRAS ARREGLAN LAS RESPUESTAS DOCIRS 
	
	//GIRO DE TURNOS
	if(turnReq == 'A'){
		console.log("ERA EL TURNO A y DEVOLVEMOS EL B");
		newTurn = 'B';
	}else if(turnReq == 'B'){
		newTurn = 'A';
	console.log("ERA EL TURNO A y DEVOLVEMOS EL B");
	}
	
    prueba='{"ultima_linea": "04Corazon_A|102|||A|", "total_jugador1": 0, "total_jugador2": 0}';
    jsonEndTurn = JSON.parse(prueba);
	jsonEndTurn['room'] = roomReq;
	jsonEndTurn['token'] = tokenReq;
	jsonEndTurn['turn'] = newTurn;
	jsonEndTurn['typeEndTurn'] = typeEndTurn;

    console.log("room: "+jsonEndTurn.room+", token: "+jsonEndTurn.token+", turn starting: "+jsonEndTurn.turn+", how finish last turn: "+typeEndTurn);
	
	io.in(roomReq).emit('end turn', socket.alias, jsonEndTurn);
 
    /*}else{
      console.log('STATUS: ' + code); 
      console.log(error);}
 
    });*/
   
  });
  
  //##########################################################################################################################################//
  //################################################ ON USER BEFORE SEND DATA TO JOINED PLAYER ###############################################//
  //##########################################################################################################################################//
  socket.on('user before', function (data) {
    console.log('### ENVIANDO DATA DE USUARIO INICIAL AL QUE SE HA UNIDO RECIENTEMENTE ####');
    var res;
    var code;
	var jsonUserBeforeData;
    var aliasReq = data.alias;
    var imeiReq = data.imei;
    var imgAvatarReq = data.imgavatar;
	var roomReq = data.room;
	//var tokenReq = data.token; VALIDAR SI MANEJAMOS EL MISMO TOKEN!!!!!!
	var jsonStr = '';
	
	jsonStr='{"alias": "'+aliasReq+'", "imei": "'+imeiReq+'", "imgavatar": "'+imgAvatarReq+'"}';//, "token": "'+tokenReq+'"}';
	jsonUserBeforeData = JSON.parse(jsonStr);
	//EMITE MENSAJE A LOS CLIENTES DE LA ROOM QUE EL USUARIO HA ABANDONADO
      socket.broadcast.to(roomReq).emit('user before', socket.alias, jsonUserBeforeData);
});

});
