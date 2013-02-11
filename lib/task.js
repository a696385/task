/**
 * 
 * Task library, async-flow control
 * 
 * Author Andrew Sumskoy <andy@i2you.ru>
 * 
 **/

module.exports = exports = {
    Task: Task,
    Deferred: Deferred,
    Promise: Promise
};

var objectToArray = function(args, removeError){
    removeError = removeError || false;
    var result = [];
    if (typeof args === 'object' && args instanceof Array)
        result = args;
    else if (typeof args === 'object')
        for(var key in args)
            result.push(args[key]);
    else if (typeof args !== 'function')
        result.push(args);
    if (removeError)
        result.splice(0,1);
    return result;
};

var nextTick = process.nextTick;
function TaskAllreadyCompleted(){}

/**
 * Create Deferred object
 * @bind {Object} #This object not requriest
 * @fn {Function} #Function for bind
 * @return {Deferred}
 **/

function Deferred(){
    var self = this;        
    self.onSuccess = [];
    self.onError = [];
    self.onFinally = [];    
    self.comleted = false;
    self.result = null;
    self.error = null;  
    self.thenDefs = [];    
    
    var doSuccess = function(args){
        self.onSuccess.forEach(function(el){
            nextTick(function(){
                var result = null;
                try{
                    result = el.apply(self.bind,args);
                }catch(e){
                    self.reject(e);
                    return;
                }
                if (typeof result === 'object' && result instanceof Deferred)
                    result = result.promise;
                if (typeof result === 'object' && result instanceof Promise)
                    self.thenDefs.forEach(function(then){
                        result.then(then.resolve, then.reject); 
                    });
                else if (result != null)
                    self.resolve(result);
            });
        });
    };
    
    var doError = function(err){
        self.onError.forEach(function(el){
            nextTick(function(){
                try{
                    el.apply(self.bind,err); 
                }catch(e){ }
            });
        });
    };
    
    var doDone = function(err, args){
        var elargs = args || [];
        if (err)
            elargs.splice(0,0,err);
        self.onFinally.forEach(function(el){
            nextTick(function(){
                try{
                    el.apply(self.bind,elargs); 
                }catch(e){ }
            });
        });
    };
    
    self.resolve = function(){
        if (self.comleted) throw new TaskAllreadyCompleted();
        var args = objectToArray(arguments);
        self.comleted = true;
        self.result = args;
        if (self.result.length === 0)
            self.result = null;
        else if (self.result.length === 1)
            self.result = self.result[0];   
        doSuccess(args);        
        doDone(null, args);
    };
    
    self.reject = function(err){
       if (self.comleted) throw new TaskAllreadyCompleted();
       self.comleted = true;
       self.error = err;
       doError(err);
       doDone(err);
       self.thenDefs.forEach(function(el){
          el.reject(err); 
       });
    };    
    
    self.connectToDeferred = function(promise){
        promise.success(self.resolve);
        promise.error(self.reject);
    };    
    
    self.promise = new Promise(self);
}

/**
 * Create Promose Object
 * @def {Deferred}
 * @return {Promise}
 **/
function Promise(def){
    var self = this;
    self.def = def;    
    self.then = function(success, error, done){
        self.done(done);
        self.success(success);
        self.error(error);    
        return createThenDef();
    };      
    self.done = function(callback){
        if (callback)
            self.def.onFinally.push(callback);    
        return createThenDef();
    };
    self.success = function(callback){
        if (callback)
            self.def.onSuccess.push(callback);    
        return createThenDef();
    };
    self.error = function(callback){
        if (callback)
            self.def.onError.push(callback);    
        return createThenDef();
    };   
    var createThenDef = function(){
        var thenDef = new Deferred();
        self.def.thenDefs.push(thenDef);
        return thenDef.promise;        
    };
 }
 
 
 /**Create Task object
  * @bind {Object} optional
  * @fn {Function} callfunction
  * @return {Promise}
  **/
 function Task(bind, fn){
    var self = {};    
    if (typeof bind === 'function' && !fn){
        fn = bind;
        bind = self;
    }
     if (!fn)
        throw new SyntaxError();
    self.bind = bind;
    self.fn = fn;
    self.def = new Deferred();
    
    if (fn.length === 0){
        nextTick(function(){
            var result = null;
            try{
                result = self.fn.apply(self.bind,[]);
            }catch(e){
                self.def.reject(e);
                return;
            }
            if (typeof result === 'object' && result instanceof Deferred)
                result = result.promise;
            if (typeof result === 'object' && result instanceof Promise)
                self.def.connectToDeferred(result);
            else
                self.def.resolve(result);                             
        });    
    } else {
        var callback = function(err){        
            if (err)
                self.def.reject(err);        
            else
                self.def.resolve.apply(self.bind, objectToArray(arguments, true));
        };
        nextTick(function(){
            try{
                self.fn.apply(self.bind, [callback]);
            }catch(e){
                self.def.reject(e);
                return;
            }
        });
    }    
    
    return self.def.promise;
 }
 
 
 
 /**
  * Examples
  **/
  
 //Simple call
Task(function(){return 5;}).then(function(data){
    console.log('1: ',data);
},function(err){
    console.log('1 err: ',err);
});

//Callback call
var callbackExample = function(callback){
    callback(null, 25);
};

Task(Task,callbackExample).then(function(data){
    console.log('2: ',data);
},function(err){
    console.log('2 err: ',err);
});

//Task of Task
Task(function(){
  return Task(function(){return 5;}); 
}).then(function(data){
    console.log('3: ',data);
},function(err){
    console.log('3 err: ',err);
});


//Step-by-Step
Task(function(){return 5;}).then(function(data){
    return Task(function(){return data * 15;});
}).success(function(data){
    console.log('4: ',data);
}).error(function(err){
    console.log('4 err: ',err);
});