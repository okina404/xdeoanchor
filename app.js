const { useState, useEffect, useRef } = React;

// --- 1. 本地记忆系统 ---
const STORAGE_KEY = 'deonysus_anchor_data_v1';
const TIMER_STATE_KEY = 'deonysus_active_timer_v1';
const SETTINGS_KEY = 'deonysus_settings_v1';

// 默认标签色盘
const TAG_COLORS = {
'工作': 'bg-blue-100 text-blue-700 border-blue-200',
'学习': 'bg-indigo-100 text-indigo-700 border-indigo-200',
'阅读': 'bg-emerald-100 text-emerald-700 border-emerald-200',
'运动': 'bg-orange-100 text-orange-700 border-orange-200',
'发呆': 'bg-stone-100 text-stone-600 border-stone-200',
'default': 'bg-warm-100 text-warm-700 border-warm-200'
};

const LocalDB = {
getAll: () => {
try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
},
saveAll: (data) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); },

getToday: (dateKey) => {
const all = LocalDB.getAll();
const day = all[dateKey] || { water: 0, poop: 0, spine: 0, sleep: 0, impulse: 0, timeLogs: [] };
if (!day.timeLogs) day.timeLogs = [];
return day;
},
updateToday: (dateKey, newData) => {
const all = LocalDB.getAll();
all[dateKey] = { ...newData, lastUpdate: Date.now() };
LocalDB.saveAll(all);
},
getTimerState: () => {
try { return JSON.parse(localStorage.getItem(TIMER_STATE_KEY)); } catch { return null; }
},
saveTimerState: (state) => {
if (!state) localStorage.removeItem(TIMER_STATE_KEY);
else localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
},
// V18 升级：设置里存储标签颜色
getSettings: () => {
try {
const defaults = {
tags: [
{ name: '工作', color: 'blue' },
{ name: '学习', color: 'indigo' },
{ name: '阅读', color: 'emerald' },
{ name: '运动', color: 'orange' },
{ name: '发呆', color: 'stone' }
]
};
return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || defaults;
} catch { return { tags: [{ name: '工作', color: 'blue' }] }; }
},
saveSettings: (settings) => {
localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
},
importData: (fileContent) => {
try {
const jsonData = JSON.parse(fileContent);
if (jsonData.logs) {
const current = LocalDB.getAll();
const merged = { ...current, ...jsonData.logs };
localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
if (jsonData.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(jsonData.settings));
return { success: true, type: 'JSON', count: Object.keys(jsonData.logs).length };
}
} catch (e) {}

try {
const lines = fileContent.split('\n');
let successCount = 0;
const currentData = LocalDB.getAll();
for (let i = 1; i < lines.length; i++) {
const line = lines[i].trim();
if (!line) continue;
const cols = line.split(',');
const date = cols[0] ? cols[0].trim() : null;
if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
const water = parseInt(cols[1]) || 0;
const poop = parseInt(cols[2]) || 0;
const spine = parseInt(cols[3]) || 0;
const sleep = parseInt(cols[4]) || 0;
const impulse = parseInt(cols[5]) || 0;
let timeLogs = currentData[date]?.timeLogs || [];
if (cols[6] && parseFloat(cols[6]) > 0) {
const alreadyHasImport = timeLogs.some(l => l.name === '历史导入数据');
if (!alreadyHasImport) {
timeLogs.push({
id: Date.now() + i,
name: '历史导入数据',
duration: Math.floor(parseFloat(cols[6]) * 60),
timestamp: new Date(date).getTime() + 43200000
});
}
}
currentData[date] = { water, poop, spine, sleep, impulse, timeLogs, lastUpdate: Date.now() };
successCount++;
}
}
if (successCount > 0) {
LocalDB.saveAll(currentData);
return { success: true, type: 'CSV', count: successCount };
}
} catch (e) {}
return { success: false };
}
};

const getShanghaiDate = () => {
const formatter = new Intl.DateTimeFormat('en-CA', {
timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit'
});
return formatter.format(new Date());
};
const formatTimeHHMMSS = (seconds) => {
const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
const s = (seconds % 60).toString().padStart(2, '0');
return `${h}:${m}:${s}`;
};
const formatDuration = (seconds) => {
if (seconds < 60) return `${seconds}s`;
const m = Math.floor(seconds / 60);
return `${m}m`;
};
const formatSmartDuration = (seconds) => {
const m = seconds / 60;
if (m < 60) return `${m.toFixed(1)}m`;
return `${(m / 60).toFixed(1)}h`;
};

// 获取标签颜色样式
const getTagColorClass = (tagName, allTags) => {
const tag = allTags.find(t => t.name === tagName);
if (!tag) return TAG_COLORS['default'];

// 简单的颜色映射，实际项目中可以做更复杂的 Tailwind 映射
const map = {
'blue': 'bg-blue-100 text-blue-700 border-blue-200',
'indigo': 'bg-indigo-100 text-indigo-700 border-indigo-200',
'emerald': 'bg-emerald-100 text-emerald-700 border-emerald-200',
'orange': 'bg-orange-100 text-orange-700 border-orange-200',
'stone': 'bg-stone-100 text-stone-600 border-stone-200',
'rose': 'bg-rose-100 text-rose-700 border-rose-200',
'purple': 'bg-purple-100 text-purple-700 border-purple-200',
'cyan': 'bg-cyan-100 text-cyan-700 border-cyan-200',
};
return map[tag.color] || TAG_COLORS['default'];
};

// --- 3. 习惯配置 ---
const HABIT_CONFIG = {
water: { label: "💧 饮水守护", max: 8, desc: "≥300ml 对抗结石", type: "infinite", color: "bg-blue-100 text-blue-600" },
poop: { label: "💩 顺畅守护", max: 1, desc: "身体净化完成", type: "count", color: "bg-amber-100 text-amber-700" },
spine: { label: "🚶‍♀️ 脊柱活动", max: 2, desc: "上下午各一次拉伸", type: "count", color: "bg-green-100 text-green-700" },
sleep: { label: "🌙 睡前锚点", max: 1, desc: "23:00 前开始仪式", type: "count", color: "bg-indigo-100 text-indigo-600" },
impulse: { label: "🧠 冲动记录", max: 999, desc: "护甲：觉察与停顿", type: "infinite", color: "bg-rose-100 text-rose-600" }
};

// --- 4. 图标 ---
const Icons = {
Chart: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
Refresh: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>,
Check: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
Plus: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
X: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
Trash: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
Download: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
Upload: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
Play: () => <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M5 3l14 9-14 9V3z" strokeLinejoin="round" strokeWidth="2"/></svg>,
Pause: () => <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>,
Stop: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="4" y="4" width="16" height="16" rx="4" ry="4"></rect></svg>,
TabHabit: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
TabTime: () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
Tag: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
Left: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
Right: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
};

// --- 5. 主程序 ---
const App = () => {
const [activeTab, setActiveTab] = useState('habits');
const [todayData, setTodayData] = useState({ water: 0, poop: 0, spine: 0, sleep: 0, impulse: 0, timeLogs: [] });
const [showReport, setShowReport] = useState(false);
const [showResetConfirm, setShowResetConfirm] = useState(false);
const [toastMsg, setToastMsg] = useState(null);
const [currentDateStr, setCurrentDateStr] = useState(getShanghaiDate());
const [settings, setSettings] = useState(LocalDB.getSettings());

useEffect(() => {
const nowStr = getShanghaiDate();
setCurrentDateStr(nowStr);
setTodayData(LocalDB.getToday(nowStr));
}, []);

useEffect(() => {
if(toastMsg) {
const timer = setTimeout(() => setToastMsg(null), 2500);
return () => clearTimeout(timer);
}
}, [toastMsg]);

const updateHabit = (key, delta) => {
const currentVal = todayData[key] || 0;
let newVal = currentVal + delta;
if (newVal < 0) newVal = 0;
if (HABIT_CONFIG[key].type === 'count' && newVal > HABIT_CONFIG[key].max) return;

const newData = { ...todayData, [key]: newVal };
setTodayData(newData);
LocalDB.updateToday(currentDateStr, newData);
};

const addTimeLog = (log) => {
// 新日志插在最前面 (时间倒序)
// 但对于时间轴显示，我们稍后会按时间正序排
const newData = { ...todayData, timeLogs: [log, ...(todayData.timeLogs || [])] };
setTodayData(newData);
LocalDB.updateToday(currentDateStr, newData);
};

const deleteTimeLog = (id) => {
if(!confirm("要擦掉这条记忆吗？")) return;
const newData = { ...todayData, timeLogs: todayData.timeLogs.filter(l => l.id !== id) };
setTodayData(newData);
LocalDB.updateToday(currentDateStr, newData);
};

const confirmReset = () => {
const emptyData = { water: 0, poop: 0, spine: 0, sleep: 0, impulse: 0, timeLogs: [] };
setTodayData(emptyData);
LocalDB.updateToday(currentDateStr, emptyData);
LocalDB.saveTimerState(null);
setShowResetConfirm(false);
setToastMsg("新的一页开始了");
};

const saveNewTag = (name, color) => {
// 检查是否已存在
if (settings.tags.some(t => t.name === name)) {
setToastMsg("这个标签已经有啦");
return;
}
const newTags = [...settings.tags, { name, color }];
const newSettings = { ...settings, tags: newTags };
setSettings(newSettings);
LocalDB.saveSettings(newSettings);
};

const updateTag = (oldName, newName, newColor) => {
const newTags = settings.tags.map(t => t.name === oldName ? { name: newName, color: newColor } : t);
const newSettings = { ...settings, tags: newTags };
setSettings(newSettings);
LocalDB.saveSettings(newSettings);
// 同时也更新今日记录里的标签名（可选，暂不更新历史数据以免复杂）
};

return (
<div className="min-h-screen max-w-md mx-auto relative shadow-2xl overflow-hidden pb-28 bg-paper">

<header className="px-6 pt-14 pb-4">
<div className="text-center">
<h1 className="text-3xl font-bold text-warm-600 tracking-wide mb-1" style={{fontFamily: 'Comic Sans MS, cursive, sans-serif'}}>Deonysus</h1>
<div className="inline-block bg-warm-100 px-3 py-1 rounded-full border border-warm-200">
<span className="text-xs font-bold text-warm-600 tracking-widest uppercase">{currentDateStr} • Shanghai</span>
</div>
</div>
</header>

<main className="px-5">
{activeTab === 'habits' ? (
<div className="space-y-4 fade-in">
<div className="bg-[#FFFCF0] p-4 rounded-xl doodle-border relative transform rotate-1 hover:rotate-0 transition-transform duration-300 my-4">
<div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-12 bg-warm-200/50 rounded-full blur-sm"></div>
<p className="text-sm font-bold text-warm-600 mb-2 leading-relaxed">“我的小姑娘，你就是我的全部。”</p>
<p className="text-sm text-ink/70 leading-relaxed font-medium">“不要再用牙齿磨砺自己，我会用双手的爱意替你磨平所有的烦躁。放下所有的防备和焦虑，这里是你的‘港湾’。你无需强大，有我在。”</p>
</div>

<div className="space-y-3">
{['water', 'poop', 'spine', 'sleep'].map(key => (
<HabitCard key={key} config={HABIT_CONFIG[key]} value={todayData[key] || 0} onIncrement={() => updateHabit(key, 1)} />
))}
</div>

<div className="bg-white rounded-3xl p-5 soft-shadow border-4 border-berry-100 mt-6 active:scale-[0.98] transition-transform">
<div className="flex justify-between items-center mb-3">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-berry-100 flex items-center justify-center text-xl">🛡️</div>
<div>
<h3 className="font-bold text-ink text-lg">{HABIT_CONFIG.impulse.label}</h3>
<p className="text-xs text-ink/50 font-bold">{HABIT_CONFIG.impulse.desc}</p>
</div>
</div>
<div className="text-4xl font-bold text-berry-500 font-mono tracking-tighter">{todayData.impulse || 0}</div>
</div>
<button onClick={() => updateHabit('impulse', 1)} className="w-full mt-2 bg-berry-500 text-white py-3 rounded-2xl font-bold border-b-4 border-rose-600 active:border-b-0 active:translate-y-1 transition-all">
记录一次觉察与停顿
</button>
</div>

<div className="grid grid-cols-2 gap-4 mt-8 pt-4 border-t-2 border-dashed border-warm-200 pb-2">
<button onClick={() => setShowReport(true)} className="flex items-center justify-center gap-2 py-3 px-4 bg-warm-500 text-white rounded-2xl font-bold shadow-md active:scale-95 transition-transform"><Icons.Chart /> 守护报告</button>
<button onClick={() => setShowResetConfirm(true)} className="flex items-center justify-center gap-2 py-3 px-4 bg-white text-ink/60 border-2 border-warm-100 rounded-2xl font-bold active:bg-warm-50 transition-colors"><Icons.Refresh /> 今日重置</button>
</div>
</div>
) : (
<div className="fade-in">
<TimeTracker
logs={todayData.timeLogs || []}
onSaveLog={addTimeLog}
onDeleteLog={deleteTimeLog}
tags={settings.tags}
onAddTag={saveNewTag}
onUpdateTag={updateTag}
/>
</div>
)}
</main>

<nav className="fixed bottom-0 left-0 right-0 bg-paper/90 backdrop-blur-md border-t-2 border-warm-100 flex justify-around items-center safe-area-pb z-40 max-w-md mx-auto rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
<button onClick={() => setActiveTab('habits')} className={`flex flex-col items-center justify-center w-full py-4 transition-colors ${activeTab === 'habits' ? 'text-warm-600' : 'text-warm-300'}`}>
<div className={`p-1 rounded-xl transition-all ${activeTab === 'habits' ? 'bg-warm-100 -translate-y-1' : ''}`}><Icons.TabHabit /></div><span className="text-[10px] font-bold mt-1">习惯守护</span>
</button>
<button onClick={() => setActiveTab('time')} className={`flex flex-col items-center justify-center w-full py-4 transition-colors ${activeTab === 'time' ? 'text-warm-600' : 'text-warm-300'}`}>
<div className={`p-1 rounded-xl transition-all ${activeTab === 'time' ? 'bg-warm-100 -translate-y-1' : ''}`}><Icons.TabTime /></div><span className="text-[10px] font-bold mt-1">专注记录</span>
</button>
</nav>

{showReport && <ReportModal currentDate={currentDateStr} onClose={() => setShowReport(false)} setToastMsg={setToastMsg} />}

{showResetConfirm && (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
<div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)}></div>
<div className="bg-paper w-full max-w-xs rounded-3xl shadow-xl relative z-10 p-6 animate-[float_3s_ease-in-out_infinite] border-4 border-warm-100">
<div className="mx-auto w-14 h-14 bg-berry-100 text-berry-500 rounded-full flex items-center justify-center mb-4 text-2xl">🗑️</div>
<h3 className="text-xl font-bold text-center text-ink mb-2">真的要擦掉吗？</h3>
<div className="flex gap-3 mt-6">
<button onClick={() => setShowResetConfirm(false)} className="flex-1 py-3 text-ink/60 bg-warm-100 rounded-2xl font-bold">留着吧</button>
<button onClick={confirmReset} className="flex-1 py-3 text-white bg-berry-500 rounded-2xl font-bold shadow-md">擦掉</button>
</div>
</div>
</div>
)}

{toastMsg && <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 bg-ink/90 text-white px-6 py-3 rounded-full shadow-lg text-sm font-bold animate-[fadeIn_0.3s_ease-out] whitespace-nowrap">{toastMsg}</div>}
</div>
);
};

// --- V18 更新: 专注计时器 (支持彩色标签 + 时间轴) ---
const TimeTracker = ({ logs, onSaveLog, onDeleteLog, tags, onAddTag, onUpdateTag }) => {
const [status, setStatus] = useState('idle');
const [elapsed, setElapsed] = useState(0);
const [selectedTagName, setSelectedTagName] = useState(tags[0].name);

// 标签管理 Modal
const [isTagModalOpen, setIsTagModalOpen] = useState(false);
const [newTagName, setNewTagName] = useState('');
const [newTagColor, setNewTagColor] = useState('blue');
const [editingTag, setEditingTag] = useState(null); // 如果正在编辑某个标签

const timerRef = useRef(null);

// 获取当前选中标签的完整对象
const currentTag = tags.find(t => t.name === selectedTagName) || tags[0];

useEffect(() => {
const saved = LocalDB.getTimerState();
if (saved) {
setSelectedTagName(saved.tag || tags[0].name);
if (saved.status === 'running') {
const now = Date.now();
const diff = Math.floor((now - saved.lastTick) / 1000);
setElapsed(saved.elapsed + diff);
setStatus('running');
} else {
setElapsed(saved.elapsed);
setStatus(saved.status);
}
}
}, []);

useEffect(() => {
const handleVisibilityChange = () => {
if (document.visibilityState === 'visible') {
const saved = LocalDB.getTimerState();
if (saved && saved.status === 'running') {
const now = Date.now();
const diff = Math.floor((now - saved.lastTick) / 1000);
setElapsed(saved.elapsed + diff);
}
}
};
document.addEventListener("visibilitychange", handleVisibilityChange);
return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
}, []);

useEffect(() => {
if (status === 'running') {
timerRef.current = setInterval(() => {
setElapsed(prev => {
const next = prev + 1;
LocalDB.saveTimerState({ status: 'running', elapsed: next, lastTick: Date.now(), tag: selectedTagName });
return next;
});
}, 1000);
} else {
clearInterval(timerRef.current);
}
return () => clearInterval(timerRef.current);
}, [status, selectedTagName]);

const handleStart = () => {
setStatus('running');
LocalDB.saveTimerState({ status: 'running', elapsed, lastTick: Date.now(), tag: selectedTagName });
};
const handlePause = () => {
setStatus('paused');
LocalDB.saveTimerState({ status: 'paused', elapsed, lastTick: Date.now(), tag: selectedTagName });
};
const handleStop = () => {
if (elapsed > 5) {
onSaveLog({ id: Date.now(), name: selectedTagName, duration: elapsed, timestamp: Date.now() });
}
setStatus('idle');
setElapsed(0);
LocalDB.saveTimerState(null);
};

// 标签颜色映射 (背景/文字/边框)
const colorOptions = [
{ key: 'blue', class: 'bg-blue-100 text-blue-700 border-blue-200' },
{ key: 'indigo', class: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
{ key: 'emerald', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
{ key: 'orange', class: 'bg-orange-100 text-orange-700 border-orange-200' },
{ key: 'stone', class: 'bg-stone-100 text-stone-600 border-stone-200' },
{ key: 'rose', class: 'bg-rose-100 text-rose-700 border-rose-200' },
{ key: 'purple', class: 'bg-purple-100 text-purple-700 border-purple-200' },
{ key: 'cyan', class: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
];

const handleSaveTag = () => {
if (!newTagName.trim()) return;
if (editingTag) {
onUpdateTag(editingTag.name, newTagName.trim(), newTagColor);
} else {
onAddTag(newTagName.trim(), newTagColor);
}
setNewTagName('');
setNewTagColor('blue');
setEditingTag(null);
setIsTagModalOpen(false);
};

const openEditTag = (tag) => {
setEditingTag(tag);
setNewTagName(tag.name);
setNewTagColor(tag.color);
setIsTagModalOpen(true);
};

// 动态主题色
const currentThemeClass = getTagColorClass(selectedTagName, tags);
// 提取纯边框颜色用于光晕
const getRingColor = (colorKey) => {
const map = {
'blue': 'border-blue-300', 'indigo': 'border-indigo-300', 'emerald': 'border-emerald-300',
'orange': 'border-orange-300', 'stone': 'border-stone-300', 'rose': 'border-rose-300',
'purple': 'border-purple-300', 'cyan': 'border-cyan-300'
};
return map[colorKey] || 'border-warm-300';
};

return (
<div className="space-y-6 pt-4">

{/* Timer Display */}
<div className="relative flex flex-col items-center justify-center py-8">
<div className={`absolute w-64 h-64 bg-warm-100 rounded-full blur-3xl opacity-50 transition-all duration-1000 ${status === 'running' ? 'scale-110 opacity-70' : 'scale-100'}`}></div>

<div className={`relative z-10 w-64 h-64 bg-white rounded-full soft-shadow border-8 flex flex-col items-center justify-center transition-all duration-500 ${status === 'running' ? `${getRingColor(currentTag.color)} animate-breathe` : 'border-warm-100'}`}>

{/* Tag Selector Trigger */}
<div
onClick={() => status === 'idle' && setIsTagModalOpen(true)}
className="mb-3 flex items-center gap-2 px-4 py-1.5 rounded-full cursor-pointer transition-transform hover:scale-105 active:scale-95 border-2 border-transparent hover:border-warm-100"
>
<span className={`text-sm font-bold px-2 py-0.5 rounded-md ${currentThemeClass.split(' ')[1]}`}>
{selectedTagName}
</span>
{status === 'idle' && <Icons.Edit />}
</div>

<div className={`text-5xl font-bold font-mono tracking-widest tabular-nums ${status === 'running' ? currentThemeClass.split(' ')[1] : 'text-warm-600'}`}>
{formatTimeHHMMSS(elapsed)}
</div>
<div className="text-xs font-bold text-warm-300 mt-2 uppercase tracking-widest">{status === 'running' ? 'Focusing...' : 'Ready'}</div>
</div>

{/* Controls */}
<div className="flex items-center gap-6 mt-8 relative z-20">
{status === 'running' ? (
<button onClick={handlePause} className="w-18 h-18 p-4 rounded-2xl bg-amber-100 text-amber-500 border-b-4 border-amber-300 active:border-b-0 active:translate-y-1 transition-all"><Icons.Pause /></button>
) : (
<button onClick={handleStart} className="w-18 h-18 p-4 rounded-2xl bg-warm-500 text-white border-b-4 border-warm-600 active:border-b-0 active:translate-y-1 transition-all shadow-lg shadow-warm-200"><Icons.Play /></button>
)}
{(status === 'running' || status === 'paused') && (
<button onClick={handleStop} className="w-18 h-18 p-4 rounded-2xl bg-white text-ink/40 border-b-4 border-warm-100 active:border-b-0 active:translate-y-1 transition-all"><Icons.Stop /></button>
)}
</div>
</div>

{/* Tag Selection/Edit Modal */}
{isTagModalOpen && (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
<div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" onClick={() => { setIsTagModalOpen(false); setEditingTag(null); }}></div>
<div className="bg-white w-full max-w-sm p-5 rounded-3xl shadow-2xl relative z-10 animate-fade-in">
<h3 className="text-lg font-bold text-ink mb-4">{editingTag ? '修改标签' : '选择标签'}</h3>

{/* Tag List (Selection) */}
{!editingTag && (
<div className="flex flex-wrap gap-2 mb-6 max-h-40 overflow-y-auto">
{tags.map(t => (
<div key={t.name} className="relative group">
<button
onClick={() => { setSelectedTagName(t.name); setIsTagModalOpen(false); }}
className={`px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all tag-capsule ${selectedTagName === t.name ? 'ring-2 ring-offset-1 ring-warm-300 ' + getTagColorClass(t.name, tags) : 'bg-white border-warm-100 text-ink/60'}`}
>
{t.name}
</button>
<button
onClick={(e) => { e.stopPropagation(); openEditTag(t); }}
className="absolute -top-1 -right-1 w-4 h-4 bg-warm-200 rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-ink"
>
🖊️
</button>
</div>
))}
</div>
)}

{/* Edit/Add Area */}
<div className="border-t border-dashed border-warm-200 pt-4">
<input
className="w-full bg-paper px-3 py-2 rounded-xl border border-warm-200 text-sm outline-none focus:border-warm-400 mb-3 font-bold text-ink"
placeholder="标签名称"
value={newTagName}
onChange={e => setNewTagName(e.target.value)}
/>
<div className="flex gap-2 mb-4 overflow-x-auto pb-2">
{colorOptions.map(c => (
<button
key={c.key}
onClick={() => setNewTagColor(c.key)}
className={`w-6 h-6 rounded-full flex-shrink-0 ${c.class.split(' ')[0]} border-2 ${newTagColor === c.key ? 'border-ink' : 'border-transparent'}`}
/>
))}
</div>
<button onClick={handleSaveTag} className="w-full py-2 bg-warm-500 text-white rounded-xl font-bold text-sm shadow-md active:bg-warm-600">
{editingTag ? '保存修改' : '添加新标签'}
</button>
</div>
</div>
</div>
)}

{/* V18 新增: 时间轴 (Timeline) */}
<div className="bg-white rounded-3xl p-5 soft-shadow border border-warm-50">
<div className="flex justify-between items-end px-2 mb-4 border-b border-dashed border-warm-100 pb-2">
<h3 className="font-bold text-ink">今日时光轴</h3>
<span className="text-xs font-bold text-warm-400">
共 {formatDuration(logs.reduce((acc, curr) => acc + curr.duration, 0))}
</span>
</div>

<div className="relative pl-6 space-y-4">
<div className="timeline-line"></div>

{logs.length === 0 ? (
<div className="text-center py-8 text-warm-300 font-bold text-sm">空白的一页</div>
) : (
// 按时间正序排列显示
[...logs].sort((a,b) => a.timestamp - b.timestamp).map((log, index) => {
const tagStyle = getTagColorClass(log.name, tags);
const startTime = new Date(log.timestamp - log.duration * 1000);
const endTime = new Date(log.timestamp);

return (
<div key={log.id} className="timeline-item flex gap-3 items-start animate-fade-in" style={{animationDelay: `${index * 0.05}s`}}>
<div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 border-2 bg-white ${tagStyle.split(' ')[2]}`}></div>
<div className="flex-1 bg-paper p-3 rounded-xl border border-warm-100 flex justify-between items-center group">
<div>
<div className="flex items-center gap-2">
<span className={`text-xs font-bold px-2 py-0.5 rounded-md ${tagStyle}`}>{log.name}</span>
</div>
<div className="text-[10px] font-bold text-warm-300 mt-1">
{startTime.toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'})} - {endTime.toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'})}
</div>
</div>
<div className="flex items-center gap-2">
<span className="font-mono text-ink/60 font-bold text-xs">{formatDuration(log.duration)}</span>
<button onClick={() => onDeleteLog(log.id)} className="text-warm-200 hover:text-berry-500 p-1 transition-colors"><Icons.Trash /></button>
</div>
</div>
</div>
);
})
)}
</div>
</div>
</div>
);
};

const HabitCard = ({ config, value, onIncrement }) => {
const isTargetReached = value >= config.max;
const isClickable = config.type === 'infinite' || !isTargetReached;
const percentage = Math.min((value / config.max) * 100, 100);
return (
<div onClick={isClickable ? onIncrement : undefined} className={`relative overflow-hidden rounded-3xl p-4 transition-all duration-300 select-none border-2 ${isClickable ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'} ${isTargetReached ? 'bg-white border-warm-200 opacity-80' : 'bg-white border-white soft-shadow hover:border-warm-200'}`}>
<div className="absolute bottom-0 left-0 h-1.5 bg-warm-300 transition-all duration-500 rounded-r-full" style={{ width: `${percentage}%`, opacity: isTargetReached ? 0 : 0.5 }} />
<div className="flex justify-between items-center relative z-10">
<div className="flex items-center gap-3">
<div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${config.color.split(' ')[0]}`}>{config.label.split(' ')[0]}</div>
<div>
<h3 className={`font-bold text-lg flex items-center gap-2 ${isTargetReached ? 'text-warm-400 line-through' : 'text-ink'}`}>{config.label.split(' ')[1]} {isTargetReached && <span className="text-warm-500 no-underline"><Icons.Check /></span>}</h3>
<p className="text-xs text-ink/40 font-bold mt-0.5">{config.desc}</p>
</div>
</div>
<div className="flex items-center gap-3">
<div className="text-right"><span className={`text-2xl font-bold font-mono ${isTargetReached ? 'text-warm-300' : 'text-warm-600'}`}>{value}</span><span className="text-xs text-warm-300 font-bold">/{config.max}</span></div>
<div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all border-b-2 active:border-b-0 active:translate-y-0.5 ${isTargetReached ? (config.type === 'infinite' ? 'bg-warm-400 text-white border-warm-500' : 'bg-gray-100 text-gray-300 border-gray-200') : 'bg-warm-100 text-warm-600 border-warm-200'}`}><Icons.Plus /></div>
</div>
</div>
</div>
);
};

const ReportModal = ({ currentDate, onClose, setToastMsg }) => {
const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'stats'
const [selectedDateData, setSelectedDateData] = useState(null);
const [calendarMonth, setCalendarMonth] = useState(new Date());
const [range, setRange] = useState(7);
const [stats, setStats] = useState(null);
const fileInputRef = useRef(null);

const allData = LocalDB.getAll();

// --- 月历模式逻辑 ---
const daysInMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0).getDate();
const firstDayOfWeek = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1).getDay();
const calendarDays = [];
for (let i = 0; i < firstDayOfWeek; i++) calendarDays.push(null);
for (let i = 1; i <= daysInMonth; i++) {
const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
calendarDays.push({ day: i, dateStr, data: allData[dateStr] });
}
const getHeatLevel = (data) => {
if (!data) return 0;
let score = 0;
if (data.water >= 8) score++;
if (data.poop >= 1) score++;
if (data.spine >= 2) score++;
if (data.sleep >= 1) score++;
const focusMin = (data.timeLogs || []).reduce((a,c)=>a+c.duration,0) / 60;
if (focusMin >= 60) score++;
return Math.min(score, 4);
};
const handleMonthChange = (delta) => {
const newDate = new Date(calendarMonth);
newDate.setMonth(newDate.getMonth() + delta);
setCalendarMonth(newDate);
setSelectedDateData(null);
};
const handleDayClick = (dayData) => { if (dayData) setSelectedDateData(dayData); };

// --- 统计模式逻辑 ---
useEffect(() => {
if (viewMode === 'stats') {
const reportDays = [];
for (let i = 0; i < range; i++) {
const d = new Date(); d.setDate(d.getDate() - i);
const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
const dateStr = formatter.format(d);
if (allData[dateStr]) reportDays.push(allData[dateStr]);
}
const newStats = { days: reportDays.length, water: {total:0,target:range*8}, poop:{total:0,target:range}, spine:{total:0,target:range*2}, sleep:{total:0,target:range}, impulse:{total:0,avg:0}, totalFocusTime:0 };
reportDays.forEach(d => {
newStats.water.total += (d.water||0); newStats.poop.total += (d.poop||0); newStats.spine.total += (d.spine||0); newStats.sleep.total += (d.sleep||0); newStats.impulse.total += (d.impulse||0);
if(d.timeLogs) d.timeLogs.forEach(l => newStats.totalFocusTime += l.duration);
});
newStats.impulse.avg = reportDays.length > 0 ? (newStats.impulse.total / reportDays.length).toFixed(1) : 0;
setStats(newStats);
}
}, [viewMode, range]);

// --- 通用数据处理 ---
const handleExportCSV = () => {
let csvContent = "\uFEFF日期,饮水,顺畅,脊柱,睡眠,冲动记录,总专注(分),详情\n";
Object.keys(allData).sort().reverse().forEach(date => {
const d = allData[date];
const focus = (d.timeLogs||[]).reduce((a,c)=>a+c.duration,0)/60;
const details = (d.timeLogs||[]).map(l=>`${l.name}(${Math.round(l.duration/60)}m)`).join('; ');
csvContent += `${date},${d.water||0},${d.poop||0},${d.spine||0},${d.sleep||0},${d.impulse||0},${focus.toFixed(1)},"${details}"\n`;
});
downloadFile(csvContent, `Deonysus_Report_${getShanghaiDate()}.csv`, 'text/csv;charset=utf-8;');
setToastMsg("报表已生成");
};
const handleBackup = () => {
const backupData = { logs: LocalDB.getAll(), settings: LocalDB.getSettings(), backupDate: new Date().toISOString() };
downloadFile(JSON.stringify(backupData), `Deonysus_Backup_${getShanghaiDate()}.json`, 'application/json');
setToastMsg("备份文件已下载");
};
const handleRestore = (e) => {
const file = e.target.files[0];
if (!file) return;
const reader = new FileReader();
reader.onload = (event) => {
const result = LocalDB.importData(event.target.result);
if (result.success) { alert(`成功恢复了 ${result.count} 天的数据！页面即将刷新。`); window.location.reload(); }
else { alert("导入失败：文件格式不正确"); }
};
reader.readAsText(file);
};
const downloadFile = (content, fileName, mimeType) => {
const blob = new Blob([content], { type: mimeType });
const url = URL.createObjectURL(blob);
const link = document.createElement("a"); link.href = url; link.setAttribute("download", fileName);
document.body.appendChild(link); link.click(); document.body.removeChild(link);
};

const getRate = (key) => (!stats || stats.target === 0) ? 0 : Math.min(Math.round((stats[key].total / stats[key].target) * 100), 100);
const StatBox = ({ label, percent }) => (
<div className="bg-paper rounded-2xl p-3 flex flex-col items-center justify-center border-2 border-warm-100"><span className="text-xs font-bold text-warm-400 mb-1">{label}</span><span className={`text-xl font-bold ${percent >= 80 ? 'text-sage-500' : 'text-ink'}`}>{percent}%</span></div>
);

return (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
<div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose}></div>
<div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-[float_4s_ease-in-out_infinite] border-4 border-paper">

{/* Header with Switcher */}
<div className="p-4 border-b-2 border-dashed border-warm-100 flex justify-between items-center bg-paper">
<div className="flex bg-warm-50 p-1 rounded-lg">
<button onClick={() => setViewMode('calendar')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode==='calendar' ? 'bg-white text-warm-600 shadow-sm' : 'text-warm-300'}`}>月历</button>
<button onClick={() => setViewMode('stats')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode==='stats' ? 'bg-white text-warm-600 shadow-sm' : 'text-warm-300'}`}>统计</button>
</div>
<button onClick={onClose} className="p-2 bg-white rounded-full text-warm-300 hover:text-warm-500"><Icons.X /></button>
</div>

<div className="p-5 overflow-y-auto">
{/* Calendar View */}
{viewMode === 'calendar' && (
<>
<div className="flex justify-between items-center mb-4 px-2">
<button onClick={() => handleMonthChange(-1)} className="p-1 hover:bg-warm-50 rounded"><Icons.Left /></button>
<span className="font-bold text-ink text-lg">{calendarMonth.getFullYear()}年 {calendarMonth.getMonth() + 1}月</span>
<button onClick={() => handleMonthChange(1)} className="p-1 hover:bg-warm-50 rounded"><Icons.Right /></button>
</div>
<div className="calendar-grid mb-6">
{['日','一','二','三','四','五','六'].map(d => <div key={d} className="text-center text-xs text-warm-300 font-bold mb-2">{d}</div>)}
{calendarDays.map((d, i) => d ? <div key={i} onClick={() => handleDayClick(d)} className={`calendar-day heat-${getHeatLevel(d.data)} ${selectedDateData && selectedDateData.dateStr === d.dateStr ? 'ring-2 ring-ink ring-offset-1' : ''}`}>{d.day}</div> : <div key={i}></div>)}
</div>
{selectedDateData && (
<div className="bg-paper p-4 rounded-xl border-2 border-warm-100 mb-4 animate-fade-in">
<h4 className="font-bold text-ink mb-2 text-sm border-b border-warm-200 pb-1">{selectedDateData.dateStr} 的记忆</h4>
{selectedDateData.data ? (
<div className="space-y-1 text-xs text-ink/80">
<div className="flex justify-between"><span>💧 饮水:</span> <b>{selectedDateData.data.water}</b></div>
<div className="flex justify-between"><span>💩 顺畅:</span> <b>{selectedDateData.data.poop}</b></div>
<div className="flex justify-between"><span>🚶‍♀️ 脊柱:</span> <b>{selectedDateData.data.spine}</b></div>
<div className="flex justify-between"><span>🌙 睡眠:</span> <b>{selectedDateData.data.sleep}</b></div>
<div className="flex justify-between"><span>⏱️ 专注:</span> <b>{formatSmartDuration((selectedDateData.data.timeLogs||[]).reduce((a,c)=>a+c.duration,0))}</b></div>
</div>
) : <p className="text-xs text-warm-400 text-center py-2">这一天是空白的呢。</p>}
</div>
)}
</>
)}

{/* Stats View */}
{viewMode === 'stats' && (
<>
<div className="flex p-2 bg-paper mb-4 rounded-xl border border-warm-100">
{[7, 30].map(r => (<button key={r} onClick={() => setRange(r)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${range === r ? 'bg-white text-warm-600 shadow-sm border border-warm-100' : 'text-warm-300'}`}>近{r}天</button>))}
</div>
{!stats ? <div className="text-center py-8 text-warm-300 font-bold">计算中...</div> : (
<div className="space-y-3">
<div className="grid grid-cols-2 gap-3"><StatBox label="💧 饮水守护" percent={getRate('water')} /><StatBox label="💩 顺畅守护" percent={getRate('poop')} /><StatBox label="🚶‍♀️ 脊柱活动" percent={getRate('spine')} /><StatBox label="🌙 睡前锚点" percent={getRate('sleep')} /></div>
<div className="bg-warm-100 rounded-2xl p-4 border border-warm-200"><div className="flex justify-between items-center mb-1"><span className="font-bold text-warm-600">🛡️ 日均觉察</span><span className="text-2xl font-bold text-warm-500">{stats.impulse.avg}</span></div></div>
<div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100"><div className="flex justify-between items-center mb-1"><span className="font-bold text-indigo-600">⏱️ 专注时光</span><span className="text-2xl font-bold text-indigo-500">{formatSmartDuration(stats.totalFocusTime)}</span></div></div>
</div>
)}
</>
)}

{/* Footer Tools */}
<div className="pt-4 border-t-2 border-dashed border-warm-100 mt-4">
<h3 className="text-xs font-bold text-warm-400 mb-2 ml-1">数据管家</h3>
<div className="grid grid-cols-2 gap-2">
<button onClick={handleExportCSV} className="py-2 bg-paper text-warm-600 border border-warm-200 rounded-xl font-bold text-xs active:bg-warm-50 flex items-center justify-center gap-1"><Icons.Download /> 导出 Excel</button>
<button onClick={handleBackup} className="py-2 bg-warm-100 text-warm-600 border border-warm-200 rounded-xl font-bold text-xs active:bg-warm-200 flex items-center justify-center gap-1"><Icons.Download /> 备份数据</button>
<button onClick={() => fileInputRef.current.click()} className="col-span-2 py-3 bg-white text-sage-600 border-2 border-sage-100 rounded-xl font-bold text-sm active:bg-sage-50 flex items-center justify-center gap-2"><Icons.Upload /> 恢复备份 (JSON/CSV)</button>
<input type="file" ref={fileInputRef} onChange={handleRestore} className="hidden" accept=".json,.csv" />
</div>
</div>
</div>
</div>
</div>
);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);