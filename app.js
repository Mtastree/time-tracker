// 数据存储键名
const TASKS_STORAGE_KEY = 'time_tracker_tasks';
const RECORDS_STORAGE_KEY = 'time_tracker_records';

// 应用状态
let tasks = [];
let records = [];
let activeTaskId = null;
let timerInterval = null;
let startTime = null;
let isPaused = false;
let pausedTime = 0; // 记录暂停的累计时间

// DOM 元素
const taskListEl = document.getElementById('task-list');
const calendarViewEl = document.getElementById('calendar-view');
const dayRecordsEl = document.getElementById('day-records');
const dayTotalEl = document.getElementById('day-total');
const selectedDateDisplayEl = document.getElementById('selected-date-display');
const currentMonthDisplayEl = document.getElementById('current-month-display');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const newTaskInput = document.getElementById('new-task-input');
const addTaskBtn = document.getElementById('add-task-btn');

// 日历状态
let currentCalendarDate = new Date();
let selectedDate = new Date();

// 初始化应用
function initApp() {
  loadData();
  renderTasks();
  renderCalendar();
  setupEventListeners();
}

// 加载本地存储数据
function loadData() {
  const tasksData = localStorage.getItem(TASKS_STORAGE_KEY);
  const recordsData = localStorage.getItem(RECORDS_STORAGE_KEY);
  
  tasks = tasksData ? JSON.parse(tasksData) : [];
  records = recordsData ? JSON.parse(recordsData) : [];
}

// 保存数据到本地存储
function saveData() {
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
}

// 设置事件监听器
function setupEventListeners() {
  addTaskBtn.addEventListener('click', addNewTask);
  newTaskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addNewTask();
  });
  
  // 日历控件事件监听
  prevMonthBtn.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
    renderCalendar();
  });
  
  nextMonthBtn.addEventListener('click', () => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
    renderCalendar();
  });
}

// 添加新任务
function addNewTask() {
  const taskName = newTaskInput.value.trim();
  if (!taskName) return;
  
  const newTask = {
    id: Date.now().toString(),
    name: taskName,
    createdAt: new Date().toISOString()
  };
  
  tasks.push(newTask);
  saveData();
  renderTasks();
  
  newTaskInput.value = '';
  newTaskInput.focus();
}

// 渲染任务列表
function renderTasks() {
  taskListEl.innerHTML = '';
  
  if (tasks.length === 0) {
    taskListEl.innerHTML = '<div class="empty-message">暂无任务标签，请添加</div>';
    return;
  }
  
  tasks.forEach(task => {
    const taskEl = document.createElement('div');
    taskEl.className = `task-item ${task.id === activeTaskId ? 'active' : ''}`;
    taskEl.dataset.id = task.id;
    
    const isActive = task.id === activeTaskId;
    let timerDisplay = '00:00:00';
    
    if (isActive) {
      if (isPaused) {
        // 如果暂停中，显示暂停时的时间
        timerDisplay = formatTime((pausedTime) / 1000);
      } else {
        // 正在计时，显示当前时间减去开始时间
        timerDisplay = formatTime((Date.now() - startTime + pausedTime) / 1000);
      }
    }
    
    taskEl.innerHTML = `
      <div class="task-name">${task.name}</div>
      <div class="task-timer">${timerDisplay}</div>
      <div class="task-controls">
        ${isActive ? 
          `<button class="stop">结束</button>
           ${isPaused ? 
             `<button class="resume">继续</button>` : 
             `<button class="pause">暂停</button>`
           }` : 
          `<button class="start">开始</button>`
        }
        <button class="edit">编辑</button>
        <button class="delete">删除</button>
      </div>
    `;
    
    taskListEl.appendChild(taskEl);
    
    // 添加事件监听器
    const startBtn = taskEl.querySelector('.start');
    const stopBtn = taskEl.querySelector('.stop');
    const pauseBtn = taskEl.querySelector('.pause');
    const resumeBtn = taskEl.querySelector('.resume');
    const editBtn = taskEl.querySelector('.edit');
    const deleteBtn = taskEl.querySelector('.delete');
    
    // 使用命名函数来处理事件，便于调试
    function handleStart() {
      try {
        toggleTimer(task.id);
      } catch (error) {
        console.error('开始计时器时出错:', error);
      }
    }
    
    function handleStop() {
      try {
        stopTimer();
        renderTasks();
      } catch (error) {
        console.error('停止计时器时出错:', error);
      }
    }
    
    function handlePause() {
      try {
        pauseTimer();
        renderTasks();
      } catch (error) {
        console.error('暂停计时器时出错:', error);
      }
    }
    
    function handleResume() {
      try {
        resumeTimer();
        renderTasks();
      } catch (error) {
        console.error('继续计时器时出错:', error);
      }
    }
    
    function handleEdit() {
      try {
        editTask(task.id);
      } catch (error) {
        console.error('编辑任务时出错:', error);
      }
    }
    
    function handleDelete() {
      try {
        deleteTask(task.id);
      } catch (error) {
        console.error('删除任务时出错:', error);
      }
    }
    
    // 根据按钮是否存在添加事件监听器
    if (startBtn) startBtn.addEventListener('click', handleStart);
    if (stopBtn) stopBtn.addEventListener('click', handleStop);
    if (pauseBtn) pauseBtn.addEventListener('click', handlePause);
    if (resumeBtn) resumeBtn.addEventListener('click', handleResume);
    editBtn.addEventListener('click', handleEdit);
    deleteBtn.addEventListener('click', handleDelete);
  });
}

// 切换计时器状态
function toggleTimer(taskId) {
  // 如果点击的是当前正在计时的任务，则停止计时并记录
  if (taskId === activeTaskId) {
    stopTimer(); // 这会将activeTaskId设为null并记录时间
    renderTasks();
    return;
  }
  
  // 如果有其他正在计时的任务，先停止它
  if (activeTaskId) {
    stopTimer();
  }
  
  // 开始新任务的计时
  activeTaskId = taskId;
  startTime = Date.now();
  isPaused = false;
  pausedTime = 0;
  
  // 设置计时器更新显示
  timerInterval = setInterval(() => {
    if (!activeTaskId || isPaused) {
      return;
    }
    
    const activeTaskEl = document.querySelector(`.task-item[data-id="${activeTaskId}"]`);
    if (activeTaskEl) {
      const timerEl = activeTaskEl.querySelector('.task-timer');
      const elapsed = (Date.now() - startTime + pausedTime) / 1000;
      timerEl.textContent = formatTime(elapsed);
    }
  }, 1000);
  
  renderTasks();
}

// 暂停计时器
function pauseTimer() {
  if (!activeTaskId || isPaused) return;
  
  // 记录暂停时的累计时间
  pausedTime += (Date.now() - startTime);
  isPaused = true;
  
  // 不清除计时器，只是标记为暂停状态
  // 这样可以在恢复时继续使用同一个计时器
}

// 恢复计时器
function resumeTimer() {
  if (!activeTaskId || !isPaused) return;
  
  // 更新开始时间为当前时间
  startTime = Date.now();
  isPaused = false;
  
  // 计时器已经在运行，只需要更新状态
}

// 停止计时器并记录时间
function stopTimer() {
  if (!activeTaskId || !startTime) return;
  
  clearInterval(timerInterval);
  
  let totalDuration;
  
  if (isPaused) {
    // 如果是暂停状态，使用已经累计的暂停时间
    totalDuration = pausedTime / 1000; // 秒数
  } else {
    // 如果是正在计时状态，计算当前时间与开始时间的差值，再加上暂停累计时间
    const endTime = Date.now();
    totalDuration = ((endTime - startTime) + pausedTime) / 1000; // 秒数
  }
  
  // 只记录超过1秒的时间
  if (totalDuration > 1) {
    const task = tasks.find(t => t.id === activeTaskId);
    
    // 计算实际的开始和结束时间
    const actualStartTime = new Date(Date.now() - (totalDuration * 1000)).toISOString();
    const actualEndTime = new Date().toISOString();
    
    const record = {
      id: Date.now().toString(),
      taskId: activeTaskId,
      taskName: task.name,
      startTime: actualStartTime,
      endTime: actualEndTime,
      duration: totalDuration
    };
    
    records.push(record);
    saveData();
    renderCalendar();
  }
  
  // 重置所有计时相关状态
  activeTaskId = null;
  startTime = null;
  isPaused = false;
  pausedTime = 0;
}

// 显示模态对话框
function showModal(title, defaultValue, onConfirm, options = {}) {
  // 每次调用时重新获取DOM元素引用，确保它们存在
  const modalTitle = document.getElementById('modal-title');
  const modalInput = document.getElementById('modal-input');
  const modalMessage = document.getElementById('modal-message');
  const modalOverlay = document.getElementById('modal-overlay');
  const modalCancelBtn = document.getElementById('modal-cancel-btn');
  const modalConfirmBtn = document.getElementById('modal-confirm-btn');
  
  if (!modalTitle || !modalInput || !modalMessage || !modalOverlay || !modalCancelBtn || !modalConfirmBtn) {
    console.error('模态对话框元素不存在');
    return;
  }
  
  modalTitle.textContent = title;
  
  // 确认模式或输入模式
  const isConfirmMode = options.confirmMode || false;
  const message = options.message || '';
  
  if (isConfirmMode) {
    // 确认模式：隐藏输入框，显示消息
    modalInput.style.display = 'none';
    modalMessage.style.display = 'block';
    modalMessage.textContent = message;
  } else {
    // 输入模式：显示输入框，隐藏消息
    modalInput.style.display = 'block';
    modalMessage.style.display = 'none';
    modalInput.value = defaultValue || '';
    
    // 聚焦到输入框
    setTimeout(() => modalInput.focus(), 100);
  }
  
  modalOverlay.style.display = 'flex';
  
  // 移除现有的事件监听器
  const newCancelBtn = modalCancelBtn.cloneNode(true);
  const newConfirmBtn = modalConfirmBtn.cloneNode(true);
  
  if (modalCancelBtn.parentNode) {
    modalCancelBtn.parentNode.replaceChild(newCancelBtn, modalCancelBtn);
  }
  
  if (modalConfirmBtn.parentNode) {
    modalConfirmBtn.parentNode.replaceChild(newConfirmBtn, modalConfirmBtn);
  }
  
  // 重新获取引用
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const confirmBtn = document.getElementById('modal-confirm-btn');
  
  // 添加新的事件监听器
  cancelBtn.addEventListener('click', hideModal);
  confirmBtn.addEventListener('click', () => {
    if (isConfirmMode) {
      // 确认模式：直接调用回调
      hideModal();
      if (onConfirm) {
        onConfirm(true);
      }
    } else {
      // 输入模式：传递输入值
      const value = modalInput.value.trim();
      hideModal();
      if (onConfirm && value) {
        onConfirm(value);
      }
    }
  });
  
  // 添加键盘事件
  if (!isConfirmMode) {
    modalInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const value = modalInput.value.trim();
        hideModal();
        if (onConfirm && value) {
          onConfirm(value);
        }
      } else if (e.key === 'Escape') {
        hideModal();
      }
    });
  }
  
  // 为整个模态框添加Escape键事件
  modalOverlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideModal();
    }
  });
}

// 显示确认对话框
function showConfirm(title, message, onConfirm) {
  showModal(title, '', onConfirm, { confirmMode: true, message });
}

// 隐藏模态对话框
function hideModal() {
  // 重新获取DOM元素引用
  const modalOverlay = document.getElementById('modal-overlay');
  const modalInput = document.getElementById('modal-input');
  const modalMessage = document.getElementById('modal-message');
  
  if (modalOverlay) {
    modalOverlay.style.display = 'none';
  }
  
  if (modalInput) {
    modalInput.value = '';
  }
  
  if (modalMessage) {
    modalMessage.textContent = '';
  }
}

// 编辑任务
function editTask(taskId) {
  try {
    const task = tasks.find(t => t.id === taskId);
    if (!task) {
      console.error('未找到任务:', taskId);
      return;
    }
    
    showModal('编辑任务标签', task.name, (newName) => {
      const trimmedName = newName.trim();
      if (trimmedName && trimmedName !== task.name) {
        task.name = trimmedName;
        
        // 同时更新相关记录的任务名称
        records.forEach(record => {
          if (record.taskId === taskId) {
            record.taskName = trimmedName;
          }
        });
        
        saveData();
        renderTasks();
        renderCalendar();
      }
    });
  } catch (error) {
    console.error('编辑任务时出错:', error);
    alert('编辑任务时出错，请查看控制台获取详细信息。');
  }
}

// 删除任务
function deleteTask(taskId) {
  try {
    showConfirm('删除确认', '确定要删除这个任务标签吗？相关的时间记录将被保留。', (confirmed) => {
      if (!confirmed) return;
      
      // 如果正在计时，先停止
      if (activeTaskId === taskId) {
        stopTimer();
      }
      
      tasks = tasks.filter(t => t.id !== taskId);
      saveData();
      renderTasks();
      renderCalendar();
    });
  } catch (error) {
    console.error('删除任务时出错:', error);
    alert('删除任务时出错，请查看控制台获取详细信息。');
  }
}

// 渲染日历视图
function renderCalendar() {
  // 更新当前月份显示
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth() + 1;
  currentMonthDisplayEl.textContent = `${year}年${month}月`;
  
  // 清空日历视图
  calendarViewEl.innerHTML = '';
  
  // 获取当月第一天和最后一天
  const firstDay = new Date(year, currentCalendarDate.getMonth(), 1);
  const lastDay = new Date(year, currentCalendarDate.getMonth() + 1, 0);
  
  // 获取当月第一天是星期几（0-6，0是星期日）
  const firstDayOfWeek = firstDay.getDay();
  
  // 创建星期头部
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekdaysRow = document.createElement('div');
  weekdaysRow.className = 'calendar-grid';
  
  weekdays.forEach(day => {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-weekday';
    dayEl.textContent = day;
    weekdaysRow.appendChild(dayEl);
  });
  
  calendarViewEl.appendChild(weekdaysRow);
  
  // 创建日期网格
  const daysGrid = document.createElement('div');
  daysGrid.className = 'calendar-grid';
  
  // 按日期分组记录
  const recordsByDay = groupRecordsByDay(records);
  
  // 添加上个月的剩余天数
  for (let i = 0; i < firstDayOfWeek; i++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day empty';
    daysGrid.appendChild(dayEl);
  }
  
  // 添加当月的天数
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    
    // 检查是否是今天
    const currentDate = new Date(year, currentCalendarDate.getMonth(), i);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // 检查是否有记录
    let hasRecords = false;
    for (const day in recordsByDay) {
      const recordDate = new Date(day);
      if (isSameDay(recordDate, currentDate)) {
        hasRecords = true;
        break;
      }
    }
    
    // 检查是否是选中的日期
    const isSelected = isSameDay(currentDate, selectedDate);
    
    // 添加相应的类
    if (isSameDay(currentDate, new Date())) {
      dayEl.classList.add('today');
    }
    if (isSelected) {
      dayEl.classList.add('selected');
    }
    if (hasRecords) {
      dayEl.classList.add('has-records');
    }
    
    // 设置日期内容
    dayEl.innerHTML = `
      <span class="day-number">${i}</span>
      ${hasRecords ? '<span class="record-indicator"></span>' : ''}
    `;
    
    // 添加点击事件
    dayEl.addEventListener('click', () => {
      // 移除之前选中的日期
      const prevSelected = document.querySelector('.calendar-day.selected');
      if (prevSelected) {
        prevSelected.classList.remove('selected');
      }
      
      // 选中当前日期
      dayEl.classList.add('selected');
      selectedDate = new Date(currentDate);
      
      // 渲染选中日期的详细记录
      renderDayDetails(selectedDate);
    });
    
    daysGrid.appendChild(dayEl);
  }
  
  calendarViewEl.appendChild(daysGrid);
  
  // 初始渲染选中日期的详细记录
  renderDayDetails(selectedDate);
}

// 渲染选中日期的详细记录
function renderDayDetails(date) {
  // 更新选中日期显示
  selectedDateDisplayEl.textContent = formatDateForDisplay(date);
  
  // 获取选中日期的记录
  const dayRecords = getRecordsForDay(date);
  
  // 清空记录列表
  dayRecordsEl.innerHTML = '';
  
  if (dayRecords.length === 0) {
    dayRecordsEl.innerHTML = '<div class="empty-message">该日期暂无时间记录</div>';
    dayTotalEl.textContent = '总计: 00:00:00';
    return;
  }
  
  // 计算总时长
  const totalDuration = dayRecords.reduce((sum, record) => sum + record.duration, 0);
  dayTotalEl.textContent = `总计: ${formatTime(totalDuration)}`;
  
  // 按开始时间降序排列（最近的记录在前）
  dayRecords.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  
  // 渲染记录列表
  dayRecords.forEach(record => {
    const recordEl = document.createElement('div');
    recordEl.className = 'history-item';
    
    const startDate = new Date(record.startTime);
    const endDate = new Date(record.endTime);
    
    recordEl.innerHTML = `
      <div class="history-item-name">${record.taskName}</div>
      <div class="history-item-time">
        <div class="history-item-duration">${formatTime(record.duration)}</div>
        <div class="history-item-period">
          ${formatTimeForDisplay(startDate)} - ${formatTimeForDisplay(endDate)}
        </div>
      </div>
    `;
    
    dayRecordsEl.appendChild(recordEl);
  });
}

// 获取指定日期的记录
function getRecordsForDay(date) {
  return records.filter(record => {
    const recordDate = new Date(record.startTime);
    return isSameDay(recordDate, date);
  });
}

// 按日期分组记录
function groupRecordsByDay(records) {
  const groups = {};
  
  records.forEach(record => {
    const date = new Date(record.startTime);
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString();
    
    if (!groups[day]) {
      groups[day] = [];
    }
    
    groups[day].push(record);
  });
  
  return groups;
}

// 格式化时间（秒 -> HH:MM:SS）
function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return [
    hrs.toString().padStart(2, '0'),
    mins.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0')
  ].join(':');
}

// 格式化日期显示
function formatDateForDisplay(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (isSameDay(date, today)) {
    return '今天';
  } else if (isSameDay(date, yesterday)) {
    return '昨天';
  } else {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }
}

// 检查两个日期是否是同一天
function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// 格式化时间显示（HH:MM）
function formatTimeForDisplay(date) {
  return [
    date.getHours().toString().padStart(2, '0'),
    date.getMinutes().toString().padStart(2, '0')
  ].join(':');
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);

// 页面关闭或刷新前停止计时器
window.addEventListener('beforeunload', () => {
  if (activeTaskId) {
    stopTimer();
  }
});