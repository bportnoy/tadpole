var expect = require('chai').expect;
var tadpole = require('..');

describe('Tadpole', function(){
 

  it('should have the correct number of children', function(){
    expect(tadpole.size()).to.equal(0);
    var cpuSize = require('os').cpus().length -1 || 1;
    tadpole.spawn();
    expect(tadpole.size()).to.equal(cpuSize);
  });

});