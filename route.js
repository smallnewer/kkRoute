var Route = {};

Route.dispatching = false;
Route.route = {};
Route.history = [
	{
		path: '/',
		param: ''
	}
];

// ========================================
// ========================================
// =======    公开API
// ========================================
// ========================================

Route.bind = function (path, handle) {
	path = path.toLowerCase();

	if (!this.route[path]) {
		this.route[path] = {};
	};
	// 该路径是否激活。如果子路径激活，则祖辈路径都处于激活态
	this.route[path].active = false;
	this.route[path].handle = handle;
}


Route.forward = function (path, param) {
	if (this.dispatching) {
		return false;
	};

	var param_type = typeof param;
	param = param_type === 'undefined' ? '' : param;
	if (typeof param !== 'string') {
		throw new Error('typeof param must be string');
	};

	path = path.toLowerCase();
	path = path.replace(/\/+/g, "/");

	var now_path = this.getNowPath();

	if (path === now_path) {
		return;
	};

	this.history.push({
		path: path,
		param: param
	});

	this.dispatch(now_path, path, param);

}



Route.back = function () {
	if (this.dispatching) {
		return false;
	};
	
	var from = this.history[this.history.length - 1];
	var to_path = this.getPrevPath();

	this.history.pop();

	this.dispatch(from.path, to_path, from.param);
}

Route.getNowPath = function () {
	return this.history[this.history.length - 1].path;
}

Route.getPrevPath = function () {
	return this.history[this.history.length - 1].path;
}

Route.onPreload = function () {
	
}

Route.onPreloadEnd = function () {
	
}








// ========================================
// ========================================
// =======    执行队列
// ========================================
// ========================================

Route.dispatch = function (from, to, param) {
	if (this.dispatching) {
		return false;
	};
	
	this.dispatching = true;

	var cross_paths = this.getCrossPath(from, to);

	var _this = this;

	_this.onPreload();

	_this.execPreload(cross_paths.enter, param, function (err) {
		_this.onPreloadEnd();
		if (err) {
			_this.dispatching = false;
			console && console.error('route dispatch error!', err);
			return;
		};

		_this.execEnter(cross_paths.enter, param, function (err) {
			if (err) {
				_this.dispatching = false;
				console && console.error('route dispatch error!', err);
				return;
			};
			
			_this.execLeave(cross_paths.leave, function (err) {
				if (err) {
					_this.dispatching = false;
					console && console.error('route dispatch error!', err);
					return;
				};

				_this.dispatching = false;
			});

		});
	})
		
	


}


// 执行队列
// when_active  当active激活态是true/false 时，才执行
Route.execQueue = function (paths, handle_name, when_active, callback, param) {
	var progress = 0;
	var exec_queue = [];

	// 获取要执行的队列
	for (var i = 0; i < paths.length; i++) {
		var route = this.route[paths[i]];

		// 激活态匹配才执行离开回调
		if (route && 
			route.handle &&
			route.handle[handle_name] && 
			route.active === when_active ) {

			exec_queue.push(i);
			// this.try(route.handle[handle_name],
			// 		 route.handle,
			// 		 this.queueCallback, param);

			// route.active = !when_active;

		};
		
	};

	// 没有需要执行的回调
	if (exec_queue.length <= 0) {
		return callback();
	};

	// 执行各个回调队列
	for (var i = 0; i < exec_queue.length; i++) {
		var route = this.route[paths[exec_queue[i]]];
		
		this.try(route.handle[handle_name],
				 route.handle,
				 queueCallback, param);

		if (handle_name !== 'onPreload') {
			route.active = !when_active;
		};
	};


	function queueCallback (err) {
		if (err) {
			callback(err);
			return;
		};

		progress++;

		if (progress >= exec_queue.length) {
			callback();
		};

	}
}



Route.execLeave = function (leave_queue, callback) {
	this.execQueue(leave_queue, 'onLeave', true, callback);
}

Route.execEnter = function (enter_queue, param, callback) {
	this.execQueue(enter_queue, 'onEnter', false, callback, param);
}

Route.execPreload = function (enter_queue, param, callback) {
	this.execQueue(enter_queue, 'onPreload', false, callback, param);
}


// 尝试执行一个函数，可以捕获错误
Route.try = function (fn, host, callback, param) {
	try{
		fn.call(host, callback, param);
	}catch(err){
		console && console.warn('route.try get a error', err);
		callback(err);
	}
}



// ========================================
// ========================================
// =======    路径层级
// ========================================
// ========================================



// 返回上一级路径，如果到达顶级，返回false
Route.getParentPath = function (path) {
	if (path === '/') {
		return false;
	};

	var path_arr = path.split("/");

	if (path_arr.length <= 1) {
		return "/";
	};

	path_arr.pop();
	
	return "/" + path_arr.join("/");
}


Route.getParentPathArray = function (path) {
	var arr = [];
	var parent_path = this.getParentPath(path);

	// 已经是顶级目录
	if (parent_path === false) {
		return arr;
	};

	arr.push(parent_path);

	var _ind = 0;

	while(parent_path !== '/') {
		parent_path = this.getParentPath(path);
		arr.push(parent_path);

		_ind++;
		if (_ind > 20) {
			break;
		};
	}

	return arr;
}


// 获取两个路径间的离开队列和进入队列

Route.getSplitPath = function (path) {
	var arr = [ '/' ];

	if (path === '/') {
		return arr;
	};

	var sind = 0;
	var eind = path.indexOf('/', sind);

	while(eind >= 0){
		var str = path.slice(0, eind);

		if (str.length > 0) {
			arr.push(str);
		};

		sind = eind;
		eind = path.indexOf('/', sind + 1);
	}

	arr.push(path.slice(0))
	
	return arr;
}


Route.getCrossPath = function (from, to) {

	var ret = {
		leave: [],
		enter: []
	};


	// 路径相等
	if (from === to) {
		return ret;
	};

	from = this.getSplitPath(from);
	to = this.getSplitPath(to);


	for (var i = 0; i < from.length; ) {
		if (from[i] === to[i]) {
			from.splice(i, 1);
			to.splice(i, 1);
			continue;
		}else{
			break;
		}
	};


	ret.leave = from.reverse();
	ret.enter = to;
	
	
	return ret;
}