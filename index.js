'use strict';

var Promise = require('bluebird');
var PriorityQueue = require('js-priority-queue');
var cp = require('child_process');
var uuid = require('uuid');
var _ = require('lodash');


var _initialized = false, _options, _addsPending = 0, _toRemove = 0, _addResolver;

/*
numChildren: In a single core environment, we'll still use one thread and let the OS manage
resources. In a multicore environment, we'll leave one core for Node and use the rest for child threads.
 */
var _defaultOptions = {
  numChildren: require('os').cpus().length -1 || 1,
  priority: true,
  addTimout: 30000
};

var _functionDefaults = {
  priority: 100,
};

/*
A container for our child threads.
 */
var _children = {};

/*
This object is mainly for holding the resolver functions, but also keeps a record of each payload.
 */
var _inProcess = {};

var _priorities = {};

var _queue = new PriorityQueue({comparator: function(a,b){ return a.priority - b.priority;}});


var Tadpole = {

  spawn: function(userOptions){

    if (_initialized) throw new Error('Cannot re-initialize Tadpole.');

    userOptions = userOptions || {};
    _.defaults(userOptions, _defaultOptions);

    for (var i = 0; i < userOptions.numChildren; i++){

      var id = uuid.v4();
      var child = cp.fork(__dirname + '/child.js', {execArgv: []});

      child.on('error', function(error){
        console.error('Error in child process: ' + error);
      });

      //when we get the result of reach transaction, this function is called to get the next operation in the queue
      child.on('message', function(payload){
        next(id, payload);
      });

      var container = {thread: child, childId: id, active: false};
      _children[id] = container;
    }

    _options = userOptions;
    _initialized = true;

  },

  add: function(functionObject) {

    if (_addsPending > 0) throw new Error('Cannot add another function until previous add has completed.');
    if (_priorities[functionObject.name]) throw new Error('Already added a function with that name.');
    if (functionObject.priority < 1) throw new Error('Priority less than 1 reserved for module use.');
    if (!functionObject.func || !functionObject.name) throw new Error('Function object must contain both function and name.');

    _.defaults(functionObject, _functionDefaults);

    functionObject.func = stringifyFunction(functionObject.func); //dehydrate the function

    functionObject.action = 'ADDFUNC';

    _priorities[functionObject.name] = functionObject.priority;

    _.each(_children, function(child){
      _addsPending++;
      setId(functionObject);
      new Promise(function(resolve, reject) {
        functionObject.resolver = resolve;
        functionObject.rejecter = reject;
        _inProcess[functionObject.id] = functionObject;
        child.thread.send(functionObject);
        // console.log('IP', _inProcess[functionObject.id]);
      });

    });

    return new Promise(function(resolve, reject){
      _addResolver = resolve;
      //TODO: reject if timeout elapses
      });
  },

  run: function(name, args){
    return new Promise(function(resolve, reject){
      request({action: name,
                priority: _priorities[name],
                args: args,
                resolver: resolve,
                rejecter: reject
              });
    });

  },

  remove: function(num){
    num = num || 1;
    _toRemove++;
  },

  size: function(){
    return Object.keys(_children).length;
  }

};

module.exports = Tadpole;


//Utility functions.
function stringifyFunction (func) {
  return '(' + func + ')';
}

/*
This function is used by the module methods to process the result of each child thread action,
and then get the next action from the queue.
 */
function next (childId, payload) {
  //use the IDs to retrieve the payload from our storage in this thread
  var sentPayload = _inProcess[payload.id];

  if (payload.error){
    sentPayload.rejecter(payload.error);
    return;
  }

  if (sentPayload.action === 'ADDFUNC') {
    _addsPending--;
    if (_addsPending === 0) _addResolver(true);
  } else {
      sentPayload.resolver(payload.result); //resolve those promises!
    }

  delete _inProcess[payload.id]; //no memory leaks please

  //take this child out of service if we want to decrement running processes
  if (_toRemove) {
    delete children[childId];
    _toRemove--;
    return;
  }

  try{
    var nextPayload = _queue.dequeue();
    _inProcess[nextPayload.id] = nextPayload;
    _children[childId].child.send(nextPayload);
  } catch(err){
    //empty queue throws error
    _children[childId].active = false; //if the queue is empty, this child can rest
  }
}

function setId(payload){
  payload.id = uuid.v4();
}


function request (payload){
  setId(payload);
  if (_queue.length){ // if the queue is full, just enqueue the payload
    _queue.queue(payload);
  } else { //otherwise, let's find this payload a home!
    var slotted = false;
    _.each(_children, function(child, key){
      if (!child.active){
        _inProcess[payload.id] = payload;
        child.active = true;
        child.thread.send(payload);
        slotted = true;
        return false; //if we've found a home, we stop the each loop
      }
    });
    if (!slotted) _queue.queue(payload); //in case the queue was empty, but all the threads were working
  }
}