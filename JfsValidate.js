JfsValidate = (function() {
	"use strict";
	var phoneRe = /^1[0-9]{10}$/,
		emailRe = /^[a-zA-Z0-9]+@[a-zA-Z0-9]+\.com$/,
		/** 
		 *任务方法，代理的任务，执行报错和通知成功`
		 * 代理执行任务对象，
		 * 如果任务是对象类型 （task）{error:'',handler:function(){}}则执行handler，
		 * 返回false，则报错，都返回true，则输出成功
		 * 如果任务不是对象，而是函数类型（task）function(){},
		 * 那么执行完函数就会直接 停止执行 后续任务，不报错也不返回成功
		 **/
		Tasks = {
			tasks: function(options) {
				var handlerList = Tasks.taskOption.handlerList,
					successText = Tasks.taskOption.successText,
					taskDef,
					taskList = [],
					successState = 0,
					worksIndex = 0,
					//执行 如果函数返回true则没有报错
					works = function() {
						var args = arguments,
							context = args[0],
							value = args[1],
							errorText = '';
						//初始化 将状态默认为success
						successState = 1;
						for(; worksIndex < taskList.length; worksIndex++) {
							var taskPack = taskList[worksIndex];
							if(typeof taskPack === 'function') {
								taskPack();
								worksIndex++;
								return;
							}
							if(!taskPack['handler'](value)) {
								successState = 0;
								value = typeof taskPack['error'] !== 'function' ?
									taskPack['error'] : taskPack['error']();
								break;
							}
						}
						worksIndex = 0;
						successState ?
							handlerList.length > 0 && handlerList[0].call(context, successText) :
							handlerList[handlerList.length - 1].call(context, value);
					},
					api = {
						// 返回任务对象队列
						taskList: taskList,
						// 设定成功提示信息
						setSuccMsg: function(text) {
							successText = text;
							return this;
						},
						// 返回状态 0 ，1 成功还是失败
						state: function() {
							return successState;
						},
						// 清空任务对象队列
						emptyTask: function() {
							taskList = [];
							return this;
						},
						// 添加错误时的函数
						error: function(fn) {
							handlerList.push(fn);
							return this
						},
						// 添加成功时的函数
						success: function(fn) {
							handlerList.unshift(fn);
							return this;
						},
						// 设置状态 0 ，1
						setState: function(state) {
							successState = state;
						},
						worksIndex: function() {
							return worksIndex;
						},
						//
						// 参数可以是 [{error:'',handler:fn},....]
						// 只要对象存在error和handler就可以了
						// 传入error结果文本和handler执行函数
						// 参数也可以直接是函数 [function(){}]
						// 不过都必须用数组包裹
						adds: function(fn) {
							var args = arguments[0],
								task;
							if(taskDef) {
								worksIndex = taskList.length - 1;
							}
							//taskList = []; 
							while(args.length > 0) {
								task = args.shift();
								taskList.push(task);
							}
							return this
						},
						// 执行任务对象队列
						workWith: function(context, value) {
							// context: 上下文 value: taskFn所传入的value
							works(context, value)
							return this;
						}
					}
				return api;
			},
			// 默认配置 成功提示信息 ，成功函数，错误函数
			taskOption: {
				//handlerList的函数队列全是对象冒充调用的，具体见tasks的workWith方法
				handlerList: [function(success) {
					//alert(success + this.id)
				}, function(error) {
					alert(error + this.id)
				}],
				successText: '输入无误'
			},
			// 设置配置 
			settings: function(obj) {
				var taskOption = this.taskOption;
				for(var key in taskOption) {
					taskOption[key] = obj[key] || taskOption[key];
				}
			}
		},
		// 主方法
		JfValidate = {
			// format('字数在{0}和{1}之间',this.max,this.min)
			format: function() {
				var args = [].slice.call(arguments),
					str = args.shift();
				return str.replace(/\{([^{}]*?)\}/gi, function(k, i) {
					return args[i];
				});
			},
			// 规则默认对象
			ruleSettings: {
				require: {
					error: '输入内容不能为空',
					handler: function(val) {
						return !!val.trim();
					}
				},
				phone: {
					error: '必须为1开头的11位手机号码',
					handler: function(val) {
						return !!phoneRe.exec(val);
					}
				},
				maxLength: {
					templateStr: '字符不能超过{0}个字',
					error: function() {
						return JfValidate.format(this.templateStr, this.max)
					},
					handler: function(val) {
						return !!(val.length < this.max);
					},
					max: 10
				},
				email: {
					error: '必须是xx@xx.com的邮箱地址',
					handler: function(val) {
						return !!emailRe.exec(val);
					}
				},
				range: {
					templateStr: '字符长度在{0}到{1}个字之间',
					error: function() {
						return JfValidate.format(this.templateStr, this.min, this.max)
					},
					handler: function(val) {
						var length = val.length;
						return this.min <= length && this.max >= length;
					},
					min: 2,
					max: 10
				},
				romote: {
					error: '该内容已存在，不得重复',
					handler: function(val) {
						return val;
					}
				},
				equal: {
					error: '密码输入与之前不相同',
					equalDom: '',
					handler: function(val, Dom) {
						//var that = ruleSettings.equal;
						return val === this.equalDom.value;
					}
				}
			},
			//全局设置
			ruleSetup: function(settings) {
				var ruleSetting = this.ruleSettings,
					errorMsg = settings.errorMsg || 0,
					handlers = settings.handlers || 0;
				//通配方法--!!就这样吧不改了	
				if(errorMsg) {
					for(var key in errorMsg) {
						ruleSetting[key]['templateStr'] ? ruleSetting[key].templateStr = errorMsg[key] :
							ruleSetting[key].error = errorMsg[key];
					}
				}
				handlers && Tasks.settings(handlers)
				return this;
			},
			// 传入任何类型的参数 返回参数类型 'String' 'Number' 'Object' 'Array'......
			type: function(obj) {
				if(obj === null) return "Null";
				if(obj === undefined) return "Undefined";
				return Object.prototype.toString.call(obj).slice(8, -1);
			},
			// 懒得写了...添加规则
			/**
			 *  function('name',{
			 * error:'hhhh'	
			 * handler:function(){
			 * 	reuturn true/false
			 * }
			 * })
			 * 
			 * */
			addRules: function(name, obj) {
				this.ruleSettings[name] = obj;
			},
			// 深度拷贝
			copy: function(sObj, copyObj) {
				var copy = copyObj || {};
				for(var key in sObj) {
					if(this.type(sObj[key]) === 'Object') {
						copy[key] = {};
						this.copy(sObj[key], copy[key]);
					} else {
						copy[key] = sObj[key];
					}
				}
				return copy;
			},
			// 等待验证的dom元素规则的包装
			doRulePack: function(el, rules) {
				var ruleSettings = this.copy(this.ruleSettings),
					DEFAULT_VALI = {
						// dom元素
						node: el,
						// 默认为未被检测验证，0状态表示不受保护，会被Tasks任务管理检测
						protect: 0,
						// 默认的状态，0表示表示验证默认不通过
						state: 0,
						// 默认的规则
						defaultRules: 'require',
						rules: ['require']
					},
					tasks = Tasks.tasks(),
					// 转化obj为内部可以使用的规则
					// 'phone' / undefined / [{}]
					parseRuleMake = function(rules) {
						console.log(rules, 'rules')
						var parseRules = [],
							dRules = DEFAULT_VALI.rules;
						parseRules.push(ruleSettings[DEFAULT_VALI.defaultRules]);
						if(rules) {
							/****/
							//当rules是字符串类型时
							if(typeof rules === 'string') {
								parseRules.push(ruleSettings[rules])
							} else {
								for(var key in rules) {
									var rule = rules[key];
									// 当rules的key是默认的时候{ruquire:xx} ps:如果require是对象或者false就直接移除默认
									if(key === DEFAULT_VALI.defaultRules &&
										(rule === true || parseRules.shift())) {
										typeof rule === 'object' && extend(ruleSettings[key], rule) && parseRules.push(ruleSettings[key]);
										typeof rule === 'boolean' && !rule && dRules.shift();
									}
									//当rules不是默认并且为布尔类型，值又是tue
									else if(typeof rule === 'boolean' && rule) {
										parseRules.push(ruleSettings[key]);
										dRules.push(key);
									}
									//否则 (key不是默认，值是对象类型)
									else {
										//如果要异步请求就添加异步
										key === 'romote' && parseRules.push(function() {
											xhrTransport.call(el, tasks, rule);
										})
										extend(ruleSettings[key], rule);
										parseRules.push(ruleSettings[key]);
										dRules.push(key);
									}
								}
							}
							/****/
						}
						console.log(parseRules, 'parseRules')
						return parseRules;
					},
					parseRules = parseRuleMake(rules);
				// 添加任务函数
				tasks.adds(parseRules);
				//设置DEFAULT_VALI；默认验证
				extend(DEFAULT_VALI, {
					// work函数，执行它则Tasks会开始执行检测
					//传入参数是el.value
					work: function() {
						tasks.workWith(el, el.value);
					},
					// 改写状态，来自于tasks的state方法，会从Tasks里面检查状态，返回状态
					state: tasks.state,
					// 向tasks里面插入需要检查的tasks对象，这里是交检规则对象
					adds: tasks.adds,
					// 可以像tasks里面插入报错函数，一般不需要被用到，单独报错函数时才需要
					error: tasks.error,
					//可以像tasks里面插入成功函数，一般不需要被用到，单独成功函数时才需要
					success: tasks.success,
					//可以像tasks里面插入成功时的提示文本，一般不需要被用到，单独成功函数时才需要
					setSuccMsg: tasks.setSuccMsg,
					//可以设置tasks的默认状态 0 ，1 表示默认是成功还是失败
					setState: tasks.setState
				}, true);
				return DEFAULT_VALI;
			},
			// 包装form生成验证
			form: function(el, rulesObj, submit) {
				var valiArrs = new Complier(el).vali,
					workList = [];
				for(var i = 0; i < valiArrs.length; i++) {
					var vali = valiArrs[i];
					rulesObj[vali.id] === undefined ? workList.push(this.doRulePack(vali)) :
						workList.push(this.doRulePack(vali, rulesObj[vali.id]));
				};
				//console.log('workList', workList)
				this.Events(valiArrs, workList, submit);
				//return this;
				return {
					get: function(id) {
						var i = 0;
						for(; i < workList.length; i++) {
							if(workList[i].node === document.getElementById(id))
								return workList[i]
						}
					}
				}
				//return workList;
			},
			// 验证事件 制定检查规则的 ，这个的规则由后面的兄弟input去检查前面的input是否符合规则
			Events: function(domArr, list, submit) {
				var dataHandler = function(index) {
					var self = this,
						triggerHandler = function(e) {
							list[index].protect = 0;
							var i = index - 1;
							//检查保护状态
							for(; i >= 0; i--) {
								!list[i].protect && list[i].work && list[i].work() || (list[i].protect = 1);
								//list[i].protect = 1;
							}
						};
					return triggerHandler;
				};
				for(var i = 0; i < domArr.length; i++) {
					domArr[i].addEventListener('focus', dataHandler(i))
				};
				// 任务检查器，基于validate的任务检查
				function inspectTasks(list, way) {

				}
				// 以下是瞎写；
				function submits() {
					var success = true;
					for(var i = 0; i < list.length; i++) {
						list[i].work() || list[i].state() || (success = false)
					}
					return success;
				}
				//				submit.addEventListener('click', function(e) {
				//						//return false;
				//						e.preventDefault ? e.preventDefault() : (window.event.returnValue = false)
				//					})
				submit.onclick = function() {
					return submits()
				}

				//以上是瞎写；
			}

		},
		//合并两个对象,不导致深层克隆,直接改变对象
		extend = function(a, b, flag) {
			//!flag === true  a对象不会扩展，只会重写 否则将扩展
			for(var key in b) {
				!flag && a[key] === undefined || (a[key] = b[key])
			}
			return a;
		};

	function xhrTransport(tasks, options) {
		var xhr = new XMLHttpRequest(),
			defalut = {
				type: 'get',
				url: location.href,
				async: true
			},
			self = this;
		extend(defalut, options);
		xhr.open(defalut.type, defalut.url, defalut.async);
		xhr.onreadystatechange = function() {
			if(xhr.status == 200 && xhr.readyState == 4) {
				// 这里没有用到服务器的缘故 这么写是为了模拟，返回的users表是否和用户相重复
				var exit = xhr.responseText,
				tasks.workWith(self, exit)
			}
		};
		xhr.send()
	}
	// 节点筛选方法
	function Complier(el) {
		this.vali = [];
		this.Complie(el);
	}
	Complier.prototype = {
		Complie: function(el) {
			var child = [].slice.call(el.children, 0),
				nodeNum = child.length,
				that = this;
			if(nodeNum > 0) {
				child.map(function(ele, index) {
					that.isVailNode(ele) && that.vali.push(ele);
					that.Complie(ele);
				})
			}
		},
		isVailNode: function(node) {
			var nodeName = node.nodeName,
				type = node.type;
			return nodeName === "INPUT" && (type === 'text' || type === 'password' || type === 'checkbox');
		},
		isInput: function(node) {
			var nodeName = node.nodeName;
			return nodeName == "INPUT";
		}
	};
	return JfValidate;
}(undefined, window))