var Task = require('../lib/task').Task;

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

//Step-by-Step
Task(function(){return 5;}).then(function(data){
    return Task(function(){return data * data;});
}).success(function(data){
        return Task(function(){return data * data;});
    }).success(function(data){
        console.log('5: ',data);
    }).error(function(err){
        console.log('5 err: ',err);
    });

//Series
var series = require('../lib/task').series;

var elemetns = ['Hello', 'Andy', 'and', 'Serega', '!'];
var functions = [];
elemetns.forEach(function(el){
   functions[el] = function(callback){
       setTimeout(function(){
           console.log(el);
           callback(null, el, '2: '+el);
       },1000);
   };
});
series(functions).then(function(result){
    console.log('Result of serial: ',result);
},function(err){
    console.log('Serial error: ',err);
});