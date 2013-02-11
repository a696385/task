/**
 * 
 * Task library, async-flow control
 * 
 * Author Andrew Sumskoy <andy@i2you.ru>
 * 
 **/

module.exports = exports = {
    Task: Task
}

var objectToArray = function(args){
    var result = [];
    if (typeof args === 'Array')
        result = args;
    else if (typeof args === 'Object')
        for(var key in args)
            result.push(args[key]);
    else if (typeof args !== 'Function')
        result.push(args);
    return result;
}

var nextTick = process.nextTick;

/**
 * Create Task object
 * @bind {Object} #This object not requriest
 * @fn {Function} #Function for bind
 * @return {Task}
 **/
function Task(bind, fn){
    var self = this;    
    if (typeof bind === 'function' && !fn){
        fn = bind;
        bind = self;
    }
    self.bind = bind;
    self.fn = fn;
    if (!fn)
        throw new SyntaxError();
        
    var callback = function(){
        
    }
    var result = function(){
        var args = objectToArray(arguments);
        args.push(callback);
        
    }
    return result;
}
 