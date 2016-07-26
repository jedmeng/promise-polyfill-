(function(global) {
  
  var STATUS_PENDING = 'pending';
  var STATUS_RESOLVED = 'resolved';
  var STATUS_REJECTED = 'rejected';

  var defaultOnFulfilled = function(value) {
    return Promise.resolve(value);
  };

  var defaultOnReject = function(error) {
    return Promise.reject(error);
  };
  
  var isFunc = function(obj) {
    return typeof obj == 'function';
  };
  
  var getThenProp = function(value) {
    if ((typeof value == 'object' || typeof value == 'function') && value !== null && 'then' in value) {
      var then = value.then;
      return isFunc(then) && then;
    }
    return false;
  };

  var asyncCall = function(callback) {
    setTimeout(callback, 0);
  };

  var ErrorWrapper = function(object) {
    this.object = object;
  };
  

  function Promise(resolver) {
    var self = this;
    var resolverType = typeof resolver;
    if (resolverType != 'function') {
      throw new TypeError('Promise resolver ' + resolverType + ' is not a function');
    }

    this._PromiseStatus = STATUS_PENDING;
    this._PromiseValue = '';
    this._callbacks = [];

    var onFullfilled = function(value) {
      if (self._PromiseStatus == STATUS_PENDING) {
        asyncCall(function() {
          var flag = 0;
          try {
            var then = getThenProp(value);
            
            if (then) {
              then.bind(value)(function(value) {
                flag++ || onFullfilled(value);
              }, function(error) {
                flag++ || onRejected(new ErrorWrapper(error));
              });
            } else {
              self._PromiseStatus = STATUS_RESOLVED;
              self._PromiseValue = value;
              self._trigger();
            }
          } catch(error) {
            flag++ || onRejected(new ErrorWrapper(error));
          }
        });
      }
    };

    var onRejected = function(error) {
      if (self._PromiseStatus == STATUS_PENDING) {
        asyncCall(function() {
          self._PromiseStatus = STATUS_REJECTED;
          self._PromiseValue = error instanceof ErrorWrapper ? error.object : error;
          self._trigger();
        });
      }
    };

    try {
      resolver(onFullfilled, onRejected);
    } catch(e) {
      onRejected(new ErrorWrapper(e));
    }
  }

  Promise.prototype.then = function(onFullfilled, onRejected) {
    var self = this;
    
    isFunc(onFullfilled) || (onFullfilled = defaultOnFulfilled);
    isFunc(onRejected) || (onRejected = defaultOnReject);

    function handleCallback(resolve, reject) {
      return function() {
        try {
          var result = self._PromiseStatus == STATUS_RESOLVED ? 
            onFullfilled(self._PromiseValue) : 
            onRejected(self._PromiseValue);
          
          if (result === promise) {
            reject(TypeError('A promise cannot be resolved with itself.'));
          } else {
            resolve(result);
          }
        } catch (error) {
          reject(new ErrorWrapper(error));
        }
      };
    }

    var promise = new Promise(function(resolve, reject) {
      if (self._PromiseStatus == STATUS_PENDING) {
        self._addCallback(handleCallback(resolve, reject));
      } else {
        asyncCall(handleCallback(resolve, reject));
      }
    });

    return promise;
  };

  Promise.prototype.catch = function(onRejected) {
    return this.then(null, onRejected);
  };

  Promise.prototype._addCallback = function(callback) {
    this._callbacks.push(callback);
  };

  Promise.prototype._trigger = function() {
    this._callbacks.forEach(function(callback) {
      callback();
    });
  };

  Promise.resolve = function(value) {
    return new Promise(function(resolve) {
      resolve(value);
    });
  };

  Promise.reject = function(value) {
    return new Promise(function(resolve, reject) {
      reject(value);
    });
  };

  Promise.all = function(promises) {
    var values = [];
    var promiseLength = promises.length;

    return new Promise(function(resolve, reject) {
      promiseLength || resolve();
      promises.forEach(function(promise, index) {
        promise.then(function(value) {
          values[index] = value;
          --promiseLength || resolve(values);
        }, reject);
      });
    });
  };

  Promise.race = function(promises) {
    return new Promise(function(resolve, reject) {
      promises.forEach(function(promise) {
        promise.then(resolve, reject);
      });
    });
  };

  if(typeof module !== 'undefined' && typeof exports === 'object') {
    module.exports = Promise;
  } else {
    global.Promise = Promise;
  }
})(this);
