
module.exports = exports = {
    Task: Task,
    fTask: fTask,
    Deferred: Deferred,
    Promise: Promise,
    series: series
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
function TaskAlreadyCompleted(){}

/**
 * Create Deferred object
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
                    self.comleted = false;
                    self.reject(e);
                    return;
                }
                if (typeof result === 'object' && result instanceof Deferred)
                    result = result.promise;
                if (typeof result === 'object' && result instanceof Promise)
                    self.thenDefs.forEach(function(then){
                        result.then(then.resolve, then.reject); 
                    });
                else if (result !== null)
                    self.resolve(result);
            });
        });
    };
    
    var doError = function(err){
        self.onError.forEach(function(el){
            nextTick(function(){
                try{
                    el.apply(self.bind,[err]);
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
        if (self.comleted) throw new TaskAlreadyCompleted();
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
       if (self.comleted) throw new TaskAlreadyCompleted();
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
 * Create Promise Object
 * @param def {Deferred}
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
  * @param bind {Object} optional
  * @param fn {Function} callFunction
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
 * For each array function in series
 * @param arr {Array}
 * @return {Promise}
 */
function series(arr){
    var def = new Deferred();
    var keys = [];
    for(var key in arr)
        keys.push(key);
    var index = 0;
    var result = [];
    var next = function(){
        var key = keys[index],
            el = arr[key];
        var task = el;
        if (typeof task === 'object' && result instanceof Deferred)
            task = task.promise;
        else if (!(typeof result === 'object' && result instanceof Promise))
            task = Task(task);
        task.then(function(){
            var args = objectToArray(arguments);
            if (args.length === 0)
                args = null;
            else if (args.length === 1)
                args = args[0];
            result[key] = args;

            //To next tick
            index++;
            if (index >= keys.length){
                def.resolve(result);
                return;
            } else nextTick(next);
        },function(err){
            def.reject(err);
        });
    };
    if (keys.length > 0)
        nextTick(next);
    else
        nextTick(function(){def.resolve(result)});
    return def.promise;
}

/**
 * Create paramtred Task
 * @param bind {Object} optional
 * @param fn {Function} callFunction
 * @return {Function}
 **/
function fTask(bind, fn){
    var self = {};    
    if (typeof bind === 'function' && !fn){
        fn = bind;
        bind = self;
    }
     if (!fn)
        throw new SyntaxError();
    self.bind = bind;
    self.fn = fn;
    var result = function(){
        var  args = objectToArray(arguments);
        return Task(function(callback){
            args.push(callback);
           self.fn.apply(self.bind, args); 
        });
    };
    return result;
}