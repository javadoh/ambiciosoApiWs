// Sets the client's username
   /*var alias;
  var connected = false;
  var playing = false;
  var lastPlayingTime;

  var socket = io();

  function setPlayer() {

    var jsonString = '{"alias": "Jose", "imei": 484738733, "action_game": "one_player"}';
    var jsonObjectReq = JSON.parse(jsonString);
    // If the username is valid
    if (jsonObjectReq.alias) {

      alias = jsonObjectReq.alias;
      /*$loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add player', jsonObjectReq);
    }
  }*/


$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  var $window = $(window);
  var $messages = $('.messages'); // Messages area
  // Prompt for setting a username
  var alias;
  var connected = false;
  var playing = false;
  var lastPlayingTime;

  var socket = io();

  function addParticipantsMessage (data) {
    var message = '';
    if (data.numUsers === 1) {
      message += "there's 1 participant";
    } else {
      message += "there are " + data.numUsers + " participants";
    }
    log(message);
  }

  // Sets the client's username
  function setPlayer() {

    var jsonString = '{"alias": "Jose", "imei": 484738733, "action_game": "one_player"}';
    var jsonObjectReq = JSON.parse(jsonString);
    // If the username is valid
    if (jsonObjectReq.alias) {

      alias = jsonObjectReq.alias;
      /*$loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();*/

      // Tell the server your username
      socket.emit('add player', jsonObjectReq);
    }
  }

  // Sends a chat message
  function askCard() {
    
    var jsonString = '{"alias": "Jose", "imei": 484738733, "action_game": "one_player"}';
    var jsonObjectReq = JSON.parse(jsonString);
    // if there is a non-empty message and a socket connection
    if (jsonObjectReq && connected) {
      
      addMessage({
        alias: alias,
        response: jsonObjectReq
      });
      // tell server to execute 'new message' and send along one parameter
      socket.emit('new card', jsonObjectReq);
    }
  }

  // Log a message
  function log (message, options) {
    var $el = $('<li>').addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  function addMessage (data, options) {
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.alias)
      .css('color', getUsernameColor(data.alias));
    var $messageBodyDiv = $('<span class="messageBody">')
      .text(data.message);

    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<div id="responsesDiv" />')
      .data('jsonResponse', response)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);

    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  function addTyping (data) {
    data.typing = true;
    data.message = 'is typing';
    addMessage(data);
  }

  // Removes the visual chat typing message
  function removeTyping (data) {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  function addMessageElement (el, options) {
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  function cleanInput (input) {
    return $('<div/>').text(input).text();
  }

  // Updates the typing event
  function updateTyping () {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('playing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(function () {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop playing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  function getTypingMessages (data) {
    return $('.typing.message').filter(function (i) {
      return $(this).data('alias') === data.alias;
    });
  }

  // Gets the color of a username through our hash function
  function getUsernameColor (username) {
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        askCard();
        socket.emit('stop playing');
        typing = false;
      } else {
        setPlayer();
      }
    }
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', function (data) {
    connected = true;
    // Display the welcome message
    var message = "Bienvenido a Ambicioso";
    log(message, {
      prepend: true
    });
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'new message', update the chat body
  socket.on('new card', function (data) {
    addMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('player joined', function (data) {
    log(data.username + ' joined');
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('player left', function (data) {
    log(data.username + ' left');
    addParticipantsMessage(data);
    removeTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('playing', function (data) {
    addTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop playing', function (data) {
    removeTyping(data);
  });

  socket.on('disconnect', function () {
    log('you have been disconnected');
  });

  socket.on('reconnect', function () {
    log('you have been reconnected');
    if (username) {
      socket.emit('add user', username);
    }
  });

  socket.on('reconnect_error', function () {
    log('attempt to reconnect has failed');
  });

});
