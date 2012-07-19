(function(/*! Brunch !*/) {
  'use strict';

  var globals = typeof window !== 'undefined' ? window : global;
  if (typeof globals.require === 'function') return;

  var modules = {};
  var cache = {};

  var has = function(object, name) {
    return hasOwnProperty.call(object, name);
  };

  var expand = function(root, name) {
    var results = [], parts, part;
    if (/^\.\.?(\/|$)/.test(name)) {
      parts = [root, name].join('/').split('/');
    } else {
      parts = name.split('/');
    }
    for (var i = 0, length = parts.length; i < length; i++) {
      part = parts[i];
      if (part === '..') {
        results.pop();
      } else if (part !== '.' && part !== '') {
        results.push(part);
      }
    }
    return results.join('/');
  };

  var dirname = function(path) {
    return path.split('/').slice(0, -1).join('/');
  };

  var localRequire = function(path) {
    return function(name) {
      var dir = dirname(path);
      var absolute = expand(dir, name);
      return require(absolute);
    };
  };

  var initModule = function(name, definition) {
    var module = {id: name, exports: {}};
    definition(module.exports, localRequire(name), module);
    var exports = cache[name] = module.exports;
    return exports;
  };

  var require = function(name) {
    var path = expand(name, '.');

    if (has(cache, path)) return cache[path];
    if (has(modules, path)) return initModule(path, modules[path]);

    var dirIndex = expand(path, './index');
    if (has(cache, dirIndex)) return cache[dirIndex];
    if (has(modules, dirIndex)) return initModule(dirIndex, modules[dirIndex]);

    throw new Error('Cannot find module "' + name + '"');
  };

  var define = function(bundle) {
    for (var key in bundle) {
      if (has(bundle, key)) {
        modules[key] = bundle[key];
      }
    }
  }

  globals.require = require;
  globals.require.define = define;
  globals.require.brunch = true;
})();

window.require.define({"collections/tasks": function(exports, require, module) {
  (function() {
    var Task,
      __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    Task = require("../models/task").Task;

    exports.TaskCollection = (function(_super) {

      __extends(TaskCollection, _super);

      TaskCollection.prototype.model = Task;

      TaskCollection.prototype.url = 'tasks/';

      function TaskCollection(view, listId) {
        this.view = view;
        this.listId = listId;
        this.down = __bind(this.down, this);
        this.up = __bind(this.up, this);
        this.prependTask = __bind(this.prependTask, this);
        this.addTasks = __bind(this.addTasks, this);
        TaskCollection.__super__.constructor.call(this);
        this.url = "todolists/" + this.listId + "/tasks";
        this.bind("add", this.prependTask);
        this.bind("reset", this.addTasks);
      }

      TaskCollection.prototype.parse = function(response) {
        return response.rows;
      };

      TaskCollection.prototype.addTasks = function(tasks) {
        var _this = this;
        return tasks.forEach(function(task) {
          task.collection = _this;
          return _this.view.addTaskLine(task);
        });
      };

      TaskCollection.prototype.prependTask = function(task) {
        var nextTask;
        task.url = "" + this.url + "/" + task.id + "/";
        task.collection = this;
        nextTask = this.at(0);
        if (nextTask != null) {
          nextTask.setPreviousTask(task);
          task.setNextTask(nextTask);
        }
        return this.view.addTaskLineAsFirstRow(task);
      };

      TaskCollection.prototype.insertTask = function(previousTask, task, callbacks) {
        var index,
          _this = this;
        index = this.toArray().indexOf(previousTask);
        task.set("nextTask", previousTask.nextTask);
        task.setPreviousTask(previousTask);
        task.collection = this;
        task.url = "" + this.url + "/";
        return task.save(task.attributes, {
          success: function() {
            previousTask.setNextTask(task);
            task.url = "" + _this.url + "/" + task.id + "/";
            _this.add(task, {
              at: index,
              silent: true
            });
            _this.view.insertTask(previousTask.view, task);
            return callbacks != null ? callbacks.success(task) : void 0;
          },
          error: function() {
            return callbacks != null ? callbacks.error : void 0;
          }
        });
      };

      TaskCollection.prototype.getPreviousTask = function(task) {
        return this.get(task.get("previousTask"));
      };

      TaskCollection.prototype.getNextTask = function(task) {
        return this.get(task.get("nextTask"));
      };

      TaskCollection.prototype.getPreviousTodoTask = function(task) {
        task = this.getPreviousTask(task);
        while ((task != null) && task.done) {
          task = this.getPreviousTask(task);
        }
        return task;
      };

      TaskCollection.prototype.getNextTodoTask = function(task) {
        task = this.getNextTask(task);
        while ((task != null) && task.done) {
          task = this.getNextTask(task);
        }
        return task;
      };

      TaskCollection.prototype.up = function(task) {
        var index, newPreviousTask, oldNextTask, oldPreviousTask;
        index = this.toArray().indexOf(task);
        if (index === 0) return false;
        if (index > 0) oldPreviousTask = this.at(index - 1);
        oldNextTask = this.at(index + 1);
        if (index > 1) newPreviousTask = this.at(index - 2);
        if (oldNextTask != null) {
          oldNextTask.setPreviousTask(oldPreviousTask);
          oldPreviousTask.setNextTask(oldNextTask);
        } else {
          oldPreviousTask.setNextTask(null);
        }
        if (newPreviousTask != null) {
          newPreviousTask.setNextTask(task);
          task.setPreviousTask(newPreviousTask);
        } else {
          task.setPreviousTask(null);
        }
        task.setNextTask(oldPreviousTask);
        this.remove(task);
        this.add(task, {
          at: index - 1,
          silent: true
        });
        task.view.up(oldPreviousTask.id);
        return true;
      };

      TaskCollection.prototype.down = function(task) {
        var index, newNextTask, oldNextTask, oldPreviousTask, tasksLength;
        index = this.toArray().indexOf(task);
        tasksLength = this.size();
        if (index === tasksLength - 1) return false;
        if (index < tasksLength - 1) oldNextTask = this.at(index + 1);
        if (index < tasksLength - 2) newNextTask = this.at(index + 2);
        if (index > 0) oldPreviousTask = this.at(index - 1);
        if (oldPreviousTask != null) {
          oldPreviousTask.setNextTask(oldNextTask);
          if (oldNextTask != null) oldNextTask.setPreviousTask(oldPreviousTask);
        } else {
          if (oldNextTask != null) oldNextTask.setPreviousTask(null);
        }
        if (newNextTask != null) {
          newNextTask.setPreviousTask(task);
          task.setNextTask(newNextTask);
        } else {
          task.setNextTask(null);
        }
        task.setPreviousTask(oldNextTask);
        this.remove(task);
        this.add(task, {
          at: index + 1,
          silent: true
        });
        task.view.down(oldNextTask.id);
        return true;
      };

      TaskCollection.prototype.removeTask = function(task, callbacks) {
        var nextTask, previousTask;
        previousTask = this.getPreviousTask(task);
        nextTask = this.getNextTask(task);
        if (nextTask != null) nextTask.setPreviousTask(previousTask | null);
        if (previousTask != null) previousTask.setNextTask(nextTask | null);
        return task.destroy({
          success: function() {
            task.view.remove();
            return callbacks != null ? callbacks.success() : void 0;
          },
          error: callbacks != null ? callbacks.error : void 0
        });
      };

      return TaskCollection;

    })(Backbone.Collection);

  }).call(this);
  
}});

window.require.define({"helpers": function(exports, require, module) {
  (function() {

    exports.BrunchApplication = (function() {

      function BrunchApplication() {
        var _this = this;
        $(function() {
          _this.initialize(_this);
          return Backbone.history.start();
        });
      }

      BrunchApplication.prototype.initialize = function() {
        return null;
      };

      return BrunchApplication;

    })();

    exports.selectAll = function(input) {
      return input.setSelection(0, input.val().length);
    };

    exports.slugify = function(string) {
      var _slugify_hyphenate_re, _slugify_strip_re;
      _slugify_strip_re = /[^\w\s-]/g;
      _slugify_hyphenate_re = /[-\s]+/g;
      string = string.replace(_slugify_strip_re, '').trim().toLowerCase();
      string = string.replace(_slugify_hyphenate_re, '-');
      return string;
    };

    exports.getPathRegExp = function(path) {
      var slashReg;
      slashReg = new RegExp("/", "g");
      return "^" + (path.replace(slashReg, "\/"));
    };

  }).call(this);
  
}});

window.require.define({"initialize": function(exports, require, module) {
  (function() {
    var BrunchApplication, HomeView, MainRouter,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    BrunchApplication = require('helpers').BrunchApplication;

    MainRouter = require('routers/main_router').MainRouter;

    HomeView = require('views/home_view').HomeView;

    exports.Application = (function(_super) {

      __extends(Application, _super);

      function Application() {
        Application.__super__.constructor.apply(this, arguments);
      }

      Application.prototype.initialize = function() {
        this.router = new MainRouter;
        return this.homeView = new HomeView;
      };

      return Application;

    })(BrunchApplication);

    window.app = new exports.Application;

  }).call(this);
  
}});

window.require.define({"models/models": function(exports, require, module) {
  (function() {
    var __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    exports.BaseModel = (function(_super) {

      __extends(BaseModel, _super);

      function BaseModel() {
        BaseModel.__super__.constructor.apply(this, arguments);
      }

      BaseModel.prototype.isNew = function() {
        return !(this.id != null);
      };

      return BaseModel;

    })(Backbone.Model);

  }).call(this);
  
}});

window.require.define({"models/task": function(exports, require, module) {
  (function() {
    var BaseModel,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    BaseModel = require("./models").BaseModel;

    exports.Task = (function(_super) {

      __extends(Task, _super);

      function Task(task) {
        var property;
        Task.__super__.constructor.call(this, task);
        for (property in task) {
          this[property] = task[property];
        }
        if (this.id) {
          this.url = "/todolists/" + task.list + "/tasks/" + this.id + "/";
        } else {
          this.url = "/todolists/" + task.list + "/tasks/";
        }
      }

      Task.prototype.setNextTask = function(task) {
        if (task != null) {
          return this.set("nextTask", task.id);
        } else {
          return this.set("nextTask", null);
        }
      };

      Task.prototype.setPreviousTask = function(task) {
        if (task != null) {
          return this.set("previousTask", task.id);
        } else {
          return this.set("previousTask", null);
        }
      };

      Task.prototype.setDone = function() {
        this.done = true;
        this.cleanLinks();
        return this.view.done();
      };

      Task.prototype.setUndone = function() {
        this.done = false;
        this.setLink();
        return this.view.undone();
      };

      Task.prototype.setLink = function() {
        var firstTask, nextTask, previousTask;
        if (this.collection.view.isArchive()) {
          this.view.remove();
          this.collection.view.moveToTaskList(this);
          firstTask = this.collection.at(0);
          this.setNextTask(firstTask);
          return firstTask.setPreviousTask(this);
        } else {
          previousTask = this.collection.getPreviousTodoTask(this);
          nextTask = this.collection.getNextTodoTask(this);
          if (previousTask != null) {
            this.setPreviousTask(previousTask);
            previousTask.setNextTask(this);
          } else {
            this.setPreviousTask(null);
          }
          if (nextTask != null) {
            this.setNextTask(nextTask);
            return nextTask.setPreviousTask(this);
          } else {
            return this.setNextTask(null);
          }
        }
      };

      Task.prototype.cleanLinks = function() {
        var nextTask, previousTask;
        previousTask = this.collection.getPreviousTask(this);
        nextTask = this.collection.getNextTask(this);
        if ((nextTask != null) && (previousTask != null)) {
          previousTask.setNextTask(nextTask);
          nextTask.setPreviousTask(previousTask);
        } else if (previousTask != null) {
          previousTask.setNextTask(null);
        } else if (nextTask != null) {
          nextTask.setPreviousTask(null);
        }
        this.setPreviousTask(null);
        return this.setNextTask(null);
      };

      return Task;

    })(BaseModel);

  }).call(this);
  
}});

window.require.define({"models/todolist": function(exports, require, module) {
  (function() {
    var BaseModel, request,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    BaseModel = require("models/models").BaseModel;

    request = function(type, url, data, callback) {
      return $.ajax({
        type: type,
        url: url,
        data: data,
        success: callback,
        error: function(data) {
          if (data && data.msg) {
            return alert(data.msg);
          } else {
            return alert("Server error occured.");
          }
        }
      });
    };

    exports.TodoList = (function(_super) {

      __extends(TodoList, _super);

      TodoList.prototype.url = 'todolists/';

      function TodoList(todolist) {
        var property;
        TodoList.__super__.constructor.call(this);
        for (property in todolist) {
          this[property] = todolist[property];
        }
      }

      TodoList.prototype.saveContent = function(content) {
        this.content = content;
        this.url = "todolists/" + this.id;
        return this.save({
          content: this.content
        });
      };

      TodoList.createTodoList = function(data, callback) {
        return request("POST", "todolists", data, callback);
      };

      TodoList.updateTodoList = function(id, data, callback) {
        return request("PUT", "todolists/" + id, data, callback);
      };

      TodoList.getTodoList = function(id, callback) {
        var _this = this;
        return $.get("todolists/" + id, function(data) {
          var todolist;
          todolist = new TodoList(data);
          return callback(todolist);
        });
      };

      return TodoList;

    })(BaseModel);

  }).call(this);
  
}});

window.require.define({"routers/main_router": function(exports, require, module) {
  (function() {
    var __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    exports.MainRouter = (function(_super) {

      __extends(MainRouter, _super);

      function MainRouter() {
        MainRouter.__super__.constructor.apply(this, arguments);
      }

      MainRouter.prototype.routes = {
        '': 'home'
      };

      MainRouter.prototype.initialize = function() {
        return this.route(/^todolist\/(.*?)$/, 'list');
      };

      MainRouter.prototype.home = function() {
        $('body').html(app.homeView.render().el);
        app.homeView.setLayout();
        return app.homeView.loadData();
      };

      MainRouter.prototype.list = function(path) {
        var selectList;
        selectList = function() {
          return app.homeView.selectList(path);
        };
        if ($("#tree-create").length > 0) {
          return selectList();
        } else {
          return this.home(function() {
            return setTimeout((function() {
              return selectList();
            }), 100);
          });
        }
      };

      return MainRouter;

    })(Backbone.Router);

  }).call(this);
  
}});

window.require.define({"views/home_view": function(exports, require, module) {
  (function() {
    var TodoList, TodoListWidget, Tree, helpers,
      __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    Tree = require("./widgets/tree").Tree;

    TodoList = require("../models/todolist").TodoList;

    TodoListWidget = require("./todolist_view").TodoListWidget;

    helpers = require("../helpers");

    exports.HomeView = (function(_super) {

      __extends(HomeView, _super);

      HomeView.prototype.id = 'home-view';

      /*
          # Initializers
      */

      HomeView.prototype.initialize = function() {};

      function HomeView() {
        this.onTodoListDropped = __bind(this.onTodoListDropped, this);
        this.onTreeLoaded = __bind(this.onTreeLoaded, this);
        this.onTodoListSelected = __bind(this.onTodoListSelected, this);
        this.onTodoListRemoved = __bind(this.onTodoListRemoved, this);
        this.onTodoListRenamed = __bind(this.onTodoListRenamed, this);
        this.onTodoListCreated = __bind(this.onTodoListCreated, this);      HomeView.__super__.constructor.call(this);
      }

      HomeView.prototype.render = function() {
        $(this.el).html(require('./templates/home'));
        this.todolist = $("#todo-list");
        return this;
      };

      HomeView.prototype.setLayout = function() {
        return $(this.el).layout({
          size: "350",
          minSize: "350",
          resizable: true
        });
      };

      HomeView.prototype.loadData = function() {
        var _this = this;
        return $.get("tree/", function(data) {
          return _this.tree = new Tree(_this.$("#nav"), _this.$("#tree"), data, {
            onCreate: _this.onTodoListCreated,
            onRename: _this.onTodoListRenamed,
            onRemove: _this.onTodoListRemoved,
            onSelect: _this.onTodoListSelected,
            onLoaded: _this.onTreeLoaded,
            onDrop: _this.onTodoListDropped
          });
        });
      };

      /*
          # Listeners
      */

      HomeView.prototype.onTodoListCreated = function(path, newName, data) {
        var _this = this;
        path = path + "/" + helpers.slugify(newName);
        return TodoList.createTodoList({
          path: path,
          title: newName
        }, function(todolist) {
          data.rslt.obj.data("id", todolist.id);
          data.inst.deselect_all();
          return data.inst.select_node(data.rslt.obj);
        });
      };

      HomeView.prototype.onTodoListRenamed = function(path, newName, data) {
        var _this = this;
        if (newName != null) {
          return TodoList.updateTodoList(data.rslt.obj.data("id"), {
            title: newName
          }, function() {
            data.inst.deselect_all();
            return data.inst.select_node(data.rslt.obj);
          });
        }
      };

      HomeView.prototype.onTodoListRemoved = function(path) {
        $("#todo-list").html(null);
        return this.currentTodolist.destroy();
      };

      HomeView.prototype.onTodoListSelected = function(path, id) {
        var _this = this;
        if (path.indexOf("/")) path = "/" + path;
        app.router.navigate("todolist" + path, {
          trigger: false
        });
        if (id != null) {
          return TodoList.getTodoList(id, function(todolist) {
            _this.renderTodolist(todolist);
            return _this.todolist.show();
          });
        } else {
          return $("#todo-list").html(null);
        }
      };

      HomeView.prototype.onTreeLoaded = function() {
        if (this.treeCreationCallback != null) return this.treeCreationCallback();
      };

      HomeView.prototype.onTodoListDropped = function(newPath, oldPath, todolistTitle, data) {
        var _this = this;
        newPath = newPath + "/" + helpers.slugify(todolistTitle);
        alert(newPath);
        return TodoList.updateTodoList(data.rslt.o.data("id"), {
          path: newPath
        }, function() {
          data.inst.deselect_all();
          return data.inst.select_node(data.rslt.o);
        });
      };

      /*
          # Functions
      */

      HomeView.prototype.selectList = function(path) {
        return this.tree.selectNode(path);
      };

      HomeView.prototype.renderTodolist = function(todolist) {
        var todolistWidget, _ref;
        todolist.url = "todolists/" + todolist.id;
        if ((_ref = this.currentTodolist) != null) {
          _ref.view.blurAllTaskDescriptions();
        }
        this.currentTodolist = todolist;
        todolistWidget = new TodoListWidget(this.currentTodolist);
        todolistWidget.render();
        return todolistWidget.loadData();
      };

      return HomeView;

    })(Backbone.View);

  }).call(this);
  
}});

window.require.define({"views/task_view": function(exports, require, module) {
  (function() {
    var Task, helpers, template,
      __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    template = require("./templates/task");

    Task = require("../models/task").Task;

    helpers = require("../helpers");

    exports.TaskLine = (function(_super) {

      __extends(TaskLine, _super);

      TaskLine.prototype.className = "task clearfix";

      TaskLine.prototype.tagName = "div";

      TaskLine.prototype.events = {
        "click .todo-button": "onTodoButtonClicked",
        "click .del-task-button": "onDelButtonClicked",
        "click .up-task-button": "onUpButtonClicked",
        "click .down-task-button": "onDownButtonClicked"
      };

      /* 
      # Initializers
      */

      function TaskLine(model, list) {
        this.model = model;
        this.list = list;
        this.onDescriptionChanged = __bind(this.onDescriptionChanged, this);
        this.onDownButtonClicked = __bind(this.onDownButtonClicked, this);
        this.onUpButtonClicked = __bind(this.onUpButtonClicked, this);
        this.onDelButtonClicked = __bind(this.onDelButtonClicked, this);
        this.onTodoButtonClicked = __bind(this.onTodoButtonClicked, this);
        TaskLine.__super__.constructor.call(this);
        this.saving = false;
        this.id = this.model._id;
        this.model.view = this;
        this.firstDel = false;
        this.isDeleting = false;
        this.list;
      }

      TaskLine.prototype.render = function() {
        template = require('./templates/task');
        $(this.el).html(template({
          "model": this.model
        }));
        this.el.id = this.model.id;
        if (this.model.done) this.done();
        this.descriptionField = this.$(".description");
        this.buttons = this.$(".task-buttons");
        this.setListeners();
        this.$(".task-buttons").hide();
        this.descriptionField.data('before', this.descriptionField.val());
        return this.el;
      };

      TaskLine.prototype.setListeners = function() {
        var _this = this;
        this.descriptionField.keypress(function(event) {
          var keyCode;
          keyCode = event.which | event.keyCode;
          return keyCode !== 13 && keyCode !== 9;
        });
        this.descriptionField.keyup(function(event) {
          var keyCode;
          keyCode = event.which | event.keyCode;
          if (event.ctrlKey) {
            if (keyCode === 38) _this.onCtrlUpKeyup();
            if (keyCode === 40) _this.onCtrlDownKeyup();
            if (keyCode === 32) return _this.onTodoButtonClicked();
          } else {
            if (keyCode === 38) _this.onUpKeyup();
            if (keyCode === 40) _this.onDownKeyup();
            if (keyCode === 13) _this.onEnterKeyup();
            if (keyCode === 8) _this.onBackspaceKeyup();
            if (keyCode === 9 && !event.shiftKey) _this.onDownKeyup();
            if (keyCode === 9 && event.shiftKey) return _this.onUpKeyup();
          }
        });
        return this.descriptionField.bind('blur paste beforeunload', function(event) {
          var el;
          el = _this.descriptionField;
          if (el.data('before') !== el.val() && !_this.isDeleting) {
            el.data('before', el.val());
            _this.onDescriptionChanged(event, event.which | event.keyCode);
          }
          return el;
        });
      };

      /*
          # Listeners
      */

      TaskLine.prototype.onTodoButtonClicked = function(event) {
        if (this.model.done) {
          this.model.setUndone();
        } else {
          this.model.setDone();
        }
        return this.model.save({
          done: this.model.done
        }, {
          success: function() {},
          error: function() {
            return alert("An error occured, modifications were not saved.");
          }
        });
      };

      TaskLine.prototype.onDelButtonClicked = function(event) {
        return this.delTask();
      };

      TaskLine.prototype.onUpButtonClicked = function(event) {
        if (!this.model.done && this.model.collection.up(this.model)) {
          this.focusDescription();
          return this.model.save({
            success: function() {},
            error: function() {
              return alert("An error occured, modifications were not saved.");
            }
          });
        }
      };

      TaskLine.prototype.onDownButtonClicked = function(event) {
        if (!this.model.done && this.model.collection.down(this.model)) {
          return this.model.save({
            success: function() {},
            error: function() {
              return alert("An error occured, modifications were not saved.");
            }
          });
        }
      };

      TaskLine.prototype.onDescriptionChanged = function(event, keyCode) {
        if (!(keyCode === 8 || this.descriptionField.val().length === 0)) {
          this.saving = false;
          this.model.description = this.descriptionField.val();
          return this.model.save({
            description: this.model.description
          }, {
            success: function() {},
            error: function() {
              return alert("An error occured, modifications were not saved.");
            }
          });
        }
      };

      TaskLine.prototype.onUpKeyup = function() {
        return this.list.moveUpFocus(this);
      };

      TaskLine.prototype.onDownKeyup = function() {
        return this.list.moveDownFocus(this);
      };

      TaskLine.prototype.onCtrlUpKeyup = function() {
        return this.onUpButtonClicked();
      };

      TaskLine.prototype.onCtrlDownKeyup = function() {
        return this.onDownButtonClicked();
      };

      TaskLine.prototype.onEnterKeyup = function() {
        return this.model.collection.insertTask(this.model, new Task({
          description: "new task"
        }), {
          success: function(task) {
            return helpers.selectAll(task.view.descriptionField);
          },
          error: function() {
            return alert("Saving failed, an error occured.");
          }
        });
      };

      TaskLine.prototype.onBackspaceKeyup = function() {
        var description;
        description = this.descriptionField.val();
        if (description.length === 0 && this.firstDel) {
          this.isDeleting = true;
          if (this.model.previousTask != null) {
            this.list.moveUpFocus(this, {
              maxPosition: true
            });
          } else if (this.model.nextTask != null) {
            this.list.moveDownFocus(this, {
              maxPosition: true
            });
          }
          return this.delTask();
        } else if (description.length === 0 && !this.firstDel) {
          return this.firstDel = true;
        } else {
          return this.firstDel = false;
        }
      };

      /*
          # Functions
      */

      TaskLine.prototype.done = function() {
        this.$(".todo-button").html("done");
        this.$(".todo-button").addClass("disabled");
        this.$(".todo-button").removeClass("btn-info");
        return $(this.el).addClass("done");
      };

      TaskLine.prototype.undone = function() {
        this.$(".todo-button").html("todo");
        this.$(".todo-button").removeClass("disabled");
        this.$(".todo-button").addClass("btn-info");
        return $(this.el).removeClass("done");
      };

      TaskLine.prototype.up = function(previousLineId) {
        var cursorPosition;
        cursorPosition = this.descriptionField.getCursorPosition();
        $(this.el).insertBefore($("#" + previousLineId));
        return this.descriptionField.setCursorPosition(cursorPosition);
      };

      TaskLine.prototype.down = function(nextLineId) {
        var cursorPosition;
        cursorPosition = this.descriptionField.getCursorPosition();
        $(this.el).insertAfter($("#" + nextLineId));
        return this.descriptionField.setCursorPosition(cursorPosition);
      };

      TaskLine.prototype.remove = function() {
        this.unbind();
        return $(this.el).remove();
      };

      TaskLine.prototype.focusDescription = function() {
        this.descriptionField.focus();
        return helpers.selectAll(this.descriptionField);
      };

      TaskLine.prototype.delTask = function(callback) {
        return this.model.collection.removeTask(this.model, {
          success: function() {
            if (callback) return callback();
          },
          error: function() {
            return alert("An error occured, deletion was not saved.");
          }
        });
      };

      TaskLine.prototype.showButtons = function() {
        return this.buttons.show();
      };

      TaskLine.prototype.hideButtons = function() {
        return this.buttons.hide();
      };

      return TaskLine;

    })(Backbone.View);

  }).call(this);
  
}});

window.require.define({"views/tasks_view": function(exports, require, module) {
  (function() {
    var TaskCollection, TaskLine, helpers,
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    TaskCollection = require("../collections/tasks").TaskCollection;

    TaskLine = require("../views/task_view").TaskLine;

    helpers = require("../helpers");

    exports.TaskList = (function(_super) {

      __extends(TaskList, _super);

      TaskList.prototype.className = "task clearfix";

      TaskList.prototype.tagName = "div";

      function TaskList(todoListView, el) {
        this.todoListView = todoListView;
        this.el = el;
        TaskList.__super__.constructor.call(this);
        this.tasks = new TaskCollection(this, this.todoListView.model.id);
      }

      TaskList.prototype.addTaskLine = function(task) {
        var taskLine;
        taskLine = new TaskLine(task, this);
        return $(this.el).append(taskLine.render());
      };

      TaskList.prototype.addTaskLineAsFirstRow = function(task) {
        var taskLine;
        taskLine = new TaskLine(task, this);
        return $(this.el).prepend(taskLine.render());
      };

      TaskList.prototype.isArchive = function() {
        return $(this.el).attr("id") === "archive-list";
      };

      TaskList.prototype.moveToTaskList = function(task) {
        return this.todoListView.moveToTaskList(task);
      };

      TaskList.prototype.moveUpFocus = function(taskLine, options) {
        var nextDescription, selector;
        selector = "#" + taskLine.model.id;
        nextDescription = $(selector).prev().find(".description");
        if (nextDescription.length) {
          return this.moveFocus(taskLine.descriptionField, nextDescription, options);
        }
      };

      TaskList.prototype.moveDownFocus = function(taskLine, options) {
        var nextDescription, selector;
        selector = "#" + taskLine.model.id;
        nextDescription = $(selector).next().find(".description");
        if (nextDescription.length) {
          return this.moveFocus(taskLine.descriptionField, nextDescription, options);
        }
      };

      TaskList.prototype.moveFocus = function(previousField, nextField, options) {
        var cursorPosition;
        cursorPosition = previousField.getCursorPosition();
        nextField.focus();
        if (((options != null ? options.maxPosition : void 0) != null) && options.maxPosition) {
          return nextField.setCursorPosition(nextField.val().length);
        } else {
          return nextField.setCursorPosition(cursorPosition);
        }
      };

      TaskList.prototype.insertTask = function(previousTaskLine, task) {
        var taskLine, taskLineEl;
        taskLine = new TaskLine(task);
        taskLine.list = this;
        taskLineEl = $(taskLine.render());
        taskLineEl.insertAfter($(previousTaskLine.el));
        taskLine.focusDescription();
        if (this.todoListView.isEditMode) taskLine.showButtons();
        return taskLine;
      };

      return TaskList;

    })(Backbone.View);

  }).call(this);
  
}});

window.require.define({"views/templates/task": function(exports, require, module) {
  module.exports = function anonymous(locals, attrs, escape, rethrow) {
  var attrs = jade.attrs, escape = jade.escape, rethrow = jade.rethrow;
  var buf = [];
  with (locals || {}) {
  var interp;
  buf.push('<button');
  buf.push(attrs({ "class": ('btn') + ' ' + ('btn-info') + ' ' + ('todo-button') }));
  buf.push('>todo</button><input');
  buf.push(attrs({ 'type':("text"), 'contenteditable':("true"), 'value':("" + (model.description) + ""), "class": ('description') }));
  buf.push('/><div');
  buf.push(attrs({ "class": ('task-buttons') }));
  buf.push('><button');
  buf.push(attrs({ "class": ('up-task-button') + ' ' + ('btn') }));
  buf.push('>up</button><button');
  buf.push(attrs({ "class": ('down-task-button') + ' ' + ('btn') }));
  buf.push('>down</button><button');
  buf.push(attrs({ "class": ('del-task-button') + ' ' + ('btn') }));
  buf.push('>X</button></div>');
  }
  return buf.join("");
  };
}});

window.require.define({"views/todolist_view": function(exports, require, module) {
  (function() {
    var Task, TaskCollection, TaskList, helpers,
      __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
      __hasProp = Object.prototype.hasOwnProperty,
      __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

    TaskCollection = require("../collections/tasks").TaskCollection;

    Task = require("../models/task").Task;

    TaskList = require("./tasks_view").TaskList;

    helpers = require("../helpers");

    exports.TodoListWidget = (function(_super) {

      __extends(TodoListWidget, _super);

      TodoListWidget.prototype.id = "todo-list";

      TodoListWidget.prototype.tagName = "div";

      TodoListWidget.prototype.el = "#todo-list";

      TodoListWidget.prototype.isEditMode = false;

      /* Constructor
      */

      function TodoListWidget(model) {
        this.model = model;
        this.onEditClicked = __bind(this.onEditClicked, this);
        this.onAddClicked = __bind(this.onAddClicked, this);
        TodoListWidget.__super__.constructor.call(this);
        this.id = this.model.slug;
        this.model.view = this;
      }

      TodoListWidget.prototype.remove = function() {
        return $(this.el).remove();
      };

      /* configuration
      */

      TodoListWidget.prototype.render = function() {
        var breadcrumb;
        $(this.el).html(require('./templates/todolist'));
        this.title = this.$(".todo-list-title .description");
        this.breadcrumb = this.$(".todo-list-title .breadcrumb");
        this.taskList = new TaskList(this, this.$("#task-list"));
        this.archiveList = new TaskList(this, this.$("#archive-list"));
        this.tasks = this.taskList.tasks;
        this.archiveTasks = this.archiveList.tasks;
        this.newButton = $("#new-task-button");
        this.showButtonsButton = $("#edit-button");
        this.newButton.hide();
        this.newButton.unbind("click");
        this.newButton.click(this.onAddClicked);
        this.showButtonsButton.unbind("click");
        this.showButtonsButton.click(this.onEditClicked);
        breadcrumb = this.model.humanPath.split(",");
        breadcrumb.pop();
        this.breadcrumb.html(breadcrumb.join(" / "));
        this.title.html(this.model.title);
        return this.el;
      };

      /*
          # Listeners
      */

      TodoListWidget.prototype.onAddClicked = function(event) {
        var task,
          _this = this;
        task = new Task({
          done: false,
          description: "new task",
          list: this.model.id
        });
        return task.save(null, {
          success: function(data) {
            data.url = "tasks/" + data.id + "/";
            _this.tasks.add(data);
            $(".task:first .description").focus();
            helpers.selectAll($(".task:first .description"));
            if (!_this.isEditMode) {
              return $(".task:first .task-buttons").hide();
            } else {
              return $(".task:first .task-buttons").show();
            }
          },
          error: function() {
            return alert("An error occured while saving data");
          }
        });
      };

      TodoListWidget.prototype.onEditClicked = function(event) {
        if (!this.isEditMode) {
          this.$(".task:not(.done) .task-buttons").show();
          this.newButton.show();
          this.isEditMode = true;
          return this.showButtonsButton.html("hide buttons");
        } else {
          this.$(".task-buttons").hide();
          this.newButton.hide();
          this.isEditMode = false;
          return this.showButtonsButton.html("show buttons");
        }
      };

      /*
          # Functions
      */

      TodoListWidget.prototype.loadData = function() {
        var _this = this;
        this.archiveTasks.url += "/archives";
        this.archiveTasks.fetch();
        return this.tasks.fetch({
          success: function() {
            if ($(".task:not(.done)").length > 0) {
              return $(".task:first .description").focus();
            } else {
              return _this.onAddClicked();
            }
          }
        });
      };

      TodoListWidget.prototype.moveToTaskList = function(task) {
        return this.tasks.prependTask(task);
      };

      TodoListWidget.prototype.blurAllTaskDescriptions = function() {
        return this.$(".task .description").trigger("blur");
      };

      return TodoListWidget;

    })(Backbone.View);

  }).call(this);
  
}});

