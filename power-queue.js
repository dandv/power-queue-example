coll = new Meteor.Collection("test");

if (Meteor.isClient) {
  var queue = new PowerQueue({
    maxProcessing: 10
  });


  Meteor.startup(function() {
    if (!coll.findOne({})) {
      coll.insert({ title: "foo" });
    }
  });

  var tasks = new Meteor.Collection('tasks', { connection: null});

  Template.tasks.tasks = function() {
    return tasks.find({});
  };

  var taskIndex = 0;
  Template.tasks.$index = function() {
    return (this.index % 20) == 0;
  };

  queue.errorHandler = function(data, addTask) {
    // This error handler lets the task drop, but we could use addTask to
    // Put the task into the queue again
    tasks.update({ _id: data.id }, { $set: { status: 'error'} });
  };

  queue.taskHandler = function(data, next) {

    // The task is now processed...
    tasks.update({ _id: data.id }, { $set: { status: 'processing'} });

    Meteor.setTimeout(function() {
      if (Math.random() > 0.5) {
        // We random fail the task
        tasks.update({ _id: data.id }, { $set: { status: 'failed'} });
        // Returning error to next
        next(new Meteor.Error('Error: Fail task') );
      } else {
        // We are done!
        tasks.update({ _id: data.id }, { $set: { status: 'done'} });
        // Trigger next task
        next();
      }
      // This async task duration is between 500 - 1000ms
    }, Math.round(500 + 500 * Math.random()));
  };

  // reactiveObject = Reactive.extend({}, { 
  //   progress: Reactive.computation(function() {
  //     return Math.round((this.radius || 50) - 50);
  //   }),
  //   radius: Reactive.computation(function() {
  //     return Math.round((this.progress || 0) + 50);
  //   }),
  //   'class': 'blue' });

  Template.hello.processingList = function() {
    return queue.processingList();
  };

  Template.hello.queue = function() {
    return {
      progress: queue.progress(),
      radius: 30,
      class: (queue.isPaused())?'red':'green',
      length: queue.length(),
      total: queue.total(),
      maxProcessing: queue.maxProcessing(),
      processing: queue.processing(),
      failures: queue.failures(),
      errors: queue.errors(),
      autostart: queue.autostart(),
      running: queue.isRunning(),
      paused: queue.isPaused(),
      maxFailures: queue.maxFailures()
    };
  };

  Template.hello.processing = function() {
    return {
      progress: queue.usage(),
      radius: 30,
      class: (queue.processing())?'green':'blue'
    };
  };

  Template.hello.failureRate = function() {
    return {
      progress: Math.round(queue.failures()/queue.total()*100),
      radius: 30,
      class: 'blue'
    };
  };

  Template.hello.errorRate = function() {
    return {
      progress: Math.round(queue.errors()/queue.total()*100),
      radius: 30,
      class: 'red'
    };
  };

  Template.hello.reactive = function() {
    return reactiveObject;
  };

  Template.hello.greeting = function () {
    return "Welcome to power-queue.";
  };

  var taskId = 0;

  Meteor.startup(function() {
    for (var i=0; i < 300; i++) {
      queue.add({ id: tasks.insert({ status: 'added', index: ++taskId }) });
    }
  });

  Template.hello.events({
    'click .addTask' : function () {
      for (var i=0; i < 100; i++) {
        queue.add({ id: tasks.insert({ status: 'added', index: ++taskId }) });
      }

    },
    'click .runQueue': function() {
      queue.run();
    },
    'click .btnReset': function() {
      queue.reset();
      tasks.remove({});
    },
    'click .pauseQueue': function() {
      queue.pause();
    },
    'click .toggleAutostart': function() {
      queue.autostart(!queue.autostart());
    },
    'click .decLimit': function() {
      if (queue.maxProcessing() > 1) {
        queue.maxProcessing(queue.maxProcessing()-1);
      }
    },
    'click .incLimit': function() {
      queue.maxProcessing(queue.maxProcessing()+1);
    },
    'click .decLimit50': function() {
      if (queue.maxProcessing() > 51) {
        queue.maxProcessing(queue.maxProcessing()-50);
      } else {
        queue.maxProcessing(1);
      }
    },
    'click .incLimit100': function() {
      queue.maxProcessing(queue.maxProcessing()+100);
    },
    'click .decFailures': function() {
      if (queue.maxFailures() > 0) {
        queue.maxFailures(queue.maxFailures()-1);
      }
    },
    'click .incFailures': function() {
      queue.maxFailures(queue.maxFailures()+1);
    },    
  });

  Template.progressCircle.events({
    'click': function(event, temp) {
      console.log(temp);
      temp.data.radius += 10;
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup

    var queue = new PowerQueue({
      isPaused: true
    });

    queue.add(function(done) {
      console.log('task 1');
      done();
    });
    queue.add(function(done) {
      console.log('task 2');
      done();
    });
    queue.add(function(done) {
      console.log('task 3');
      done();
    });

    console.log('Ready to run queue');
    queue.run();
  });
}
