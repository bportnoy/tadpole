'use strict';

var _functions = {};

process.on('message', function(payload) {

  if (payload.action === 'ADDFUNC'){
    _functions[payload.name] = eval(payload.func); //rehydrate our function
    process.send({id: payload.id, action: 'ADDFUNC'});
  } else {
    try{
      var result;
      
      if (payload.args) result = _functions[payload.action].apply(null, payload.args);
      else result = _functions[payload.action]();

      if (!result) {
        process.send({id: payload.id, result: 'undefined'}); //a clearer response if the result is undefined
      } else process.send({id: payload.id, result: result});

    } catch(err){
      console.error(err);
      process.send({id: payload.id, error: err});
    } 
  }
  

});