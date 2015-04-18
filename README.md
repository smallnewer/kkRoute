# kkRoute
一个简单的路由系统 for kk

## 约定
1. 路由地址是类似路径的字符串，必须以/开头，不能以/结尾。如`/`,`/a/b`合法；``,`/a/b/`不合法。
2. 一个路由地址只能对应一个处理器对象(handle)
3. 处理器对象必须提供三个方法：onPreload,onEnter,onLeave.
4. 路由切换时，会执行路过路径对应的处理器对象的对应方法。顺序是preload, enter, leave.
5. onPreload,onEnter,onLeave都视为异步，内部任务完成后，立马执行回调，交给Route继续下一步。
6. 全局同时只会有一个路由在切换。

一般情况下，处理器对象无需关心当前路由地址是何。只需要关心自己的三个方法逻辑。

onPreload: 进入自身时，需要预加载东西，就在本函数内实现。
onEnter: 初始化
onLeave: 要离开本处理器，把用到的东西都释放了。

## 公开API

### Route.bind(path, handle);
给一个路由地址绑定处理器对象handle。

````javascript
  Route.bind("/a",{
		onPreload: function (cb) {
			console.log("onPreloadCallback", '/a');
			cb();
		},
		onEnter : function (cb, param) {
			console.log("onEnterCallback", '/a', param);
			cb();
		},
		onLeave : function (cb) {
			console.log('onLeaveCallback', '/a');
			cb();
		}
	});
	
````

### Route.forward(path, param)
前往某个路由地址。param可选，但只能为字符串，会被传入每个处理器对象的onEnter方法。
如果当前有正在切换的路由，此方法会返回false。其他情况不返回任何东西。

### Route.back();
后退到上一个路由地址。
如果当前有正在切换的路由，此方法会返回false。其他情况不返回任何东西。

### Route.getNowPath();
获取当前的路由地址。

### Route.getPrevPath();
获取上一次的路由地址。

### Route.get(path)
获取指定路由地址的处理器

### Route.onPreload
预加载事件。当路由切换、开始执行预加载方法时，触发的事件。

### Route.onPreloadEnd
预加载完毕事件。当路由切换、所有处理器的预加载都执行完毕时，触发的事件。
