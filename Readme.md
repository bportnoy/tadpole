#Tadpole - Node's child_process made easy

[![NPM](https://nodei.co/npm/tadpole.png?downloads=true&stars=true)](https://nodei.co/npm/tadpole/)
[![Build Status](https://travis-ci.org/bportnoy/tadpole.svg?branch=master)](https://travis-ci.org/bportnoy/tadpole)

##About Tadpole
Tadpole takes the pain out of multithreaded JavaScript. Using Node's child_process module and the Bluebird promise library, it's easy to run code in other processes while keeping Node's event loop spinning freely.

Tadpole can spin up additional processes, each a full instance of the V8 interpreter. You can then add functions to the collected processes while they are already running. If you need to clear system resources, you can remove unneeded processes; if you need additional capacity for expensive workloads, you can add additional processes, and your stored functions will be automatically added to the new children.

In addition, Tadpole manages the child processes such that only one task is run at a time, with others waiting in a queue. In priority mode (default), each function is given a priority, and lower priority functions dequeued first.

##Known Issues
This is alpha software, so please treat it as such - it is likely unwise to use this in production.

##Installation
To install Tadpole, simply enter `npm install tadpole --save` at the command line. Then using Tadpole in your project is as easy as:
`var Tadpole = require('tadpole');`
Note that Tadpole requires Node 0.11 or higher (or IO.js).

##Using Tadpole
####`spawn(options)`
This initializes Tadpole and spins up the child processes. You must call `tadpole.spawn()` before any other methods.
This method accepts an options object with the following keys:
* numChildren - The number of child processes to create. Default: the number of host cores minus 1.
* priority - If true, each function passd to Tadpole can be assigned an integer priority greater than 0. When dequeuning the next workload, functions with lower priority values will be dequeued first. Default: true.
* env - If set, this value is passed as the value of process.env in the child process. Default: process.env of parent.
* respawn - If true, Tadpole attempts to automatically respawn child processes that shut down due to error. Default: true.

*******

####`addFunction(functionObject)`
Adds a function to all child processes, returning a Promise that resolves to true when the function has been successfully added. Accepts an object literal with the following keys:
* name - A string representaiton used to later run the function.
* func - The function to execute. This can access any feature an instance of Node would, i.e. CommonJS require statements. However, it cannot reference any functions outside its own scope. It should return a value.
* priority - The integer value representing the priority with which requests for function calls of this type should be dequeued. Lower values are dequeued first. Must be greater than 0. Default: 100.

*******

####`run(name, args)`
Runs the function indicated by the string `name`. Args should be an array of arguments; the function will be called using `apply`, so single arguments should be wrapped in an array.

`run` returns a Promise that resolves to the result of the function call, or is rejected if an error occurs.

*******

####`add([num])`
Adds `num` child processes. Default: 1.

*******

####`remove([num])`
Removes `num` child processes. Default: 1.

*******

####`size()`
Returns the current number of child processes.

*******

####`killAll()`
Shuts down all child processes and returns Tadpole to its uninitialized state, including erasing all functions added.
