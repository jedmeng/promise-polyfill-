var Promise = require('../promise');

describe("Promises/A+ Tests", function () {
  require("promises-aplus-tests").mocha({
    resolved: Promise.resolve,
    rejected: Promise.rejected,
    deferred: function() {
      var obj = {};
      var prom = new Promise(function(resolve, reject) {
        obj.resolve = resolve;
        obj.reject = reject;
      });
      obj.promise = prom;
      return obj;
    }
  });
});

