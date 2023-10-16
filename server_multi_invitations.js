// ######################### SETUP EXPRESS SERVER FOR MULTIPLAYER AMBICIOSO INVITATIONS TO PLAY #############################//
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 8300;
var request = require('request');

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/www'));

//VARIABLES GLOBALES
var numUsers = 0;
var room = 0;

//############ METODO PRINCIPAL AL CONECTARSE UN CLIENTE #############//
io.on('connection', function (socket) {

  console.log("#### A INGRESADO UNA NUEVA CONEXION AL SERVIDOR ####");
  var addedPlayer = false;
  var isPlayerInvited = false;
  var numUsersRoom = 0;

  //##############################################################################################################//
  //######################### CLIENTE INVITADO EMITE AGREGAR JUGADOR CON SU LOGICA ESPECIAL  #####################//
  //##############################################################################################################//
  socket.on('multiplayer invited', function(data){
	  isPlayerInvited = true; 
	  ++numUsersRoom;
	  //var socketIdPlayerOne = data.socketid;
	  
	  //console.log("UNIENDOSE A LA ROOM EL INVITADO: "+socketIdPlayerOne);

    //var socketAnfitrion = io.sockets.connected(socketIdPlayerOne);

    //console.log("ROOM DEL ANFITRION: "+socketAnfitrion.room);
	var tokenInv = data.invtoken;
	var socketRoom = tokenInv.substring(4, tokenInv.length);
	console.log("La room que se tomo del token es la siguiente: "+socketRoom);
	
    //io.sockets.manager.roomClients[socket.id]
	  socket.join(socketRoom);//SE UNE AL ROOM DEL JUGADOR QUE LO INVITO!

	  socket.room = socketRoom;
	  
	  console.log("Room socket invitado: "+socket.room);
	  
	  socket.emit('multiplayer invroom', socket.id, socket.room);
	  
	  //NOS UNIMOS AL ADD PLAYER
	  //socket.on('add player', data);
	});
  
   
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
	var socketId = socket.id;

      console.log('### SOLICITANDO CREAR PARTIDA A AMBICIOSO.CL ####');
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
	
	//########### AL CONECTARSE UN CLIENTE INGRESAMOS AL ULTIMO ROOM
    if(!isPlayerInvited){//SI NO ES JUGADOR INVITADO
		//INCREMENTAMOS EL ROOM POR DEFECTO
		room++;
		console.log("UNIENDOSE A LA ROOM: "+room);
		socket.join(room);
			//if(io.sockets.socket(room) == 1){FALLO ESTO
			//}
	}
	
	console.log("SOCKET ID: "+socket.id);
	//var prueba='{"token": "QY83", "imei": "'+imeiReq+'", "alias": "'+aliasReq+'", "action": "'+actionGameReq+'"}';
	
    jsonObject = JSON.parse(res);
	
	if (addedPlayer) return;
    //ALMACENAMOS LAS VARIABLES GLOBALES DEL JUGADOR EN SU SOCKET
	socket.token = jsonObject.token;
    socket.alias = aliasReq;
	if(!isPlayerInvited){
    socket.room = room;
	}
	socket.actiongame = actionGameReq;
	socket.imgavatar = imgAvatarReqOne;
    addedPlayer = true;
	++numUsers;
	
	jsonObject['room'] = room;
	jsonObject['imgavatar'] = imgAvatarReqOne;
	jsonObject['numUsers'] = ++numUsersRoom;
	jsonObject['socketid'] = socket.id;
	jsonObject['socketroom'] = room;
	
	console.log("JSON SOCKET ID: "+jsonObject.socketid+", JSON ALIAS: "+jsonObject.alias+", JSON TOKEN: "+jsonObject.token+", JSON ROOM: "+jsonObject.room);
	
  
    console.log("#### SE EMITE MENSAJE DE LOGIN AL JUGADOR "+socket.alias+" ####");
	//MENSAJE SOLO EMITIDO AL JUGADOR QUE INVOCO
	socket.emit('login', socket.alias, jsonObject);//SE ENVIA DATA POR SER LOGIN SOLO DATOS INICIALES DEL USUARIO
	
    //EMITE MENSAJE A LOS OTROS CLIENTES DISTINTOS AL DEL SOCKET EN LA ROOM ESPECIFICADA
    socket.broadcast.to(socket.room).emit('user joined', socket.alias, jsonObject);//SE ENVIA TODOS LOS DATOS
	  
	if(numUsersRoom % 2 == 0){
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
		
		//prueba='{"last_card": "cuatro_diamante", "keeping_cards":"91", "action":"multiplayer"}';

		jsonCard = JSON.parse(res);
		jsonCard['room'] = roomReq;
		jsonCard['turn'] = turnReq;//REEMPLAZO EL QUE VIENE DE DOCIRS
		
		console.log("Last_card: "+jsonCard.last_card+ ", RoomReq: "+jsonCard.room+", Turn: "+jsonCard.turn);
		
		io.in(roomReq).emit('new card', socket.alias, jsonCard);

    }else{ 
    	console.log('STATUS: ' + code);
    	console.log(error);} 
    });

  //EMITE MENSAJE CON LA RESPUESTA DE NUEVA CARTA PARA LOS CLIENTES PERTENECIENTES A LA ROOM QUE VIENE POR REQUEST. response devuelve los datos socket.broadcast.emit
	
	//socket.emit('card picked', socket.alias, jsonCard);//SE ENVIA DATA POR SER LOGIN SOLO DATOS INICIALES DEL USUARIO
	//console.log("## SE ENVIO CARD PICKED AL SOCKET SOLICITANTE, A CONTINUACION SE ENVIARA LA RESPUESTA A LOS DEMAS SOCKETS DE LA SALA.");
    //EMITE MENSAJE A LOS OTROS CLIENTES DISTINTOS AL DEL SOCKET EN LA ROOM ESPECIFICADA
    //socket.broadcast.to(room).emit('card opponent', socket.alias, jsonCard);//SE ENVIA TODOS LOS DATOS
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
      --numUsers;
	  numUsersRoom = 0;
	  
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

    if (addedPlayer) {
      --numUsers;
	  numUsersRoom = 0;
	  
	  socket.leave(socket.room);

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
	
    //prueba='{"ultima_linea": "04Corazon_A|102|||A|", "total_jugador1": 0, "total_jugador2": 0, "room": "'+roomReq+'", "token": "2OBG", "turn": "'+newTurn+'"}';
    prueba='{"ultima_linea": "04Corazon_A|102|||A|", "total_jugador1": 0, "total_jugador2": 0}';
	jsonEndTurn = JSON.parse(prueba);
	jsonEndTurn['room'] = roomReq;
	jsonEndTurn['token'] = tokenReq;
	jsonEndTurn['turn'] = newTurn;
	jsonEndTurn['typeEndTurn'] = typeEndTurn;

    console.log("room: "+jsonEndTurn.room+", token: "+jsonEndTurn.token+", turn starting: "+jsonEndTurn.turn+", how end last turn: "+typeEndTurn);
	
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
	var jsonStr = '';
	
	jsonStr='{"alias": "'+aliasReq+'", "imei": "'+imeiReq+'", "imgavatar": "'+imgAvatarReq+'"}';
	jsonUserBeforeData = JSON.parse(jsonStr);
	//EMITE MENSAJE A LOS CLIENTES DE LA ROOM QUE EL USUARIO HA ABANDONADO
      socket.broadcast.to(roomReq).emit('user before', socket.alias, jsonUserBeforeData);
});

});
