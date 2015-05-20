var expect = require('chai').expect;
var tadpole = require('..');

var fib = function (n) {
  if (n === 0){
    return 0;
  }
  if (n === 1){
    return 1;
  }
  else {
    return fib(n-1) + fib(n-2);
  }
}; //a conveniently long function for testing

describe('Tadpole', function(){
 
  beforeEach(function(){
   tadpole.spawn();
  });

  afterEach(function(){
   tadpole.killAll();
  });

  it('should have the correct number of children', function(){
    var cpuSize = require('os').cpus().length -1 || 1;
    expect(tadpole.size()).to.equal(cpuSize);
    tadpole.add();
    expect(tadpole.size()).to.equal(cpuSize+1);
    tadpole.add();
    expect(tadpole.size()).to.equal(cpuSize+2);
    tadpole.remove();
    expect(tadpole.size()).to.equal(cpuSize+1);
    tadpole.add(2);
    expect(tadpole.size()).to.equal(cpuSize+3);
    tadpole.remove(2);
    expect(tadpole.size()).to.equal(cpuSize+1);
    tadpole.killAll();
    expect(tadpole.size()).to.equal(0);
  });

  it('adds functions to running processes', function(done){
    tadpole.addFunction({name: 'fib', func: fib}).then(function(){
      done();
    });
  });

  it('returns the proper values from those functions', function(done){
    tadpole.addFunction({name: 'fib', func: fib})
    .then(function(){
      tadpole.run('fib', [[1]])
      .then(function(result){
        console.log('1');
        expect(result).to.equal(0);
        tadpole.run('fib', [10])
        .then(function(result){
          expect(result).to.equal(55);
          done();
        });
      });
    });
  });


});