const { useState, useEffect, useRef, useLayoutEffect } = React;
// 从全局对象获取 Recharts 组件
const { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } = window.Recharts || {};

// --- 1. 本地记忆系统 ---
const STORAGE_KEY = 'deonysus_anchor_data_v1';
const TIMER_STATE_KEY = 'deonysus_active_timer_v1';
const SETTINGS_KEY = 'deonysus_settings_v1';

// 预设颜色盘
const COLOR_PALETTE = {
warm: 'bg-warm-100 text-warm-700 border-warm-300',
blue: 'bg-blue-100 text-blue-700 border-blue-300',
green: 'bg-sage-100 text-sage-700 border-sage-300',
rose: 'bg-berry-100 text-berry-700 border-berry-300',
purple: 'bg-purple-100 text-purple-700 border-purple-300',
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
getSettings: () => {
try {
const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
let tags = settings.tags || ['工作', '学习', '阅读', '运动', '发呆'];
tags = tags.map(t => typeof t === 'string' ? { name: t, color: 'warm' } : t);
return { tags };
} catch { return { tags: [{name:'工作',color:'blue'}, {name:'阅读',color:'warm'}] }; }
},
saveSettings: (settings) => {
localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
},
importData: (content, type) => {
try {
let logsToSave = {};
if (type === 'json') {
const jsonData = JSON.parse(content);
if (jsonData.logs) logsToSave = jsonData.logs;
else if (typeof jsonData === 'object') logsToSave = jsonData;
if (jsonData.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(jsonData.settings));
} else if (type === 'csv') {
const lines = content.split('\n');
const currentLogs = LocalDB.getAll();
for (let i = 1; i < lines.length; i++) {
const line = lines[i].trim();
if (!line) continue;
const cols = line.split(',');
const date = cols[0];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
logsToSave[date] = {
...(currentLogs[date] || {}),
water: parseInt(cols[1]) || 0,
poop: parseInt(cols[2]) || 0,
spine: parseInt(cols[3]) || 0,
sleep: parseInt(cols[4]) || 0,
impulse: parseInt(cols[5]) || 0,
lastUpdate: Date.now()
};
}
logsToSave = { ...currentLogs, ...logsToSave };
}
if (Object.keys(logsToSave).length > 0) {
localStorage.setItem(STORAGE_KEY, JSON.stringify(logsToSave));
return true;
}
return false;
} catch (e) {
console.error("Import Error:", e);
return false;
}
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
if (m > 60) {
const h = (m/60).toFixed(1);
return `${h}h`;
}
return `${m}m`;
};

const HABIT_CONFIG = {
water: { label: "💧 饮水守护", max: 8, desc: "≥300ml 对抗结石", type: "infinite", color: "bg-blue-100 text-blue-600" },
poop: { label: "💩 顺畅守护", max: 1, desc: "身体净化完成", type: "count", color: "bg-amber-100 text-amber-700" },
spine: { label: "🚶‍♀️ 脊柱活动", max: 2, desc: "上下午各一次拉伸", type: "count", color: "bg-green-100 text-green-700" },
sleep: { label: "🌙 睡前锚点", max: 1, desc: "23:00 前开始仪式", type: "count", color: "bg-indigo-100 text-indigo-600" },
impulse: { label: "🧠 冲动记录", max: 999, desc: "护甲：觉察与停顿", type: "infinite", color: "bg-rose-100 text-rose-600" }
};

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
Tag: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
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

const saveNewTag = (newTagName, color) => {
const newTag = { name: newTagName, color: color };
const newTags = [...settings.tags, newTag];
const newSettings = { ...settings, tags: newTags };
setSettings(newSettings);
LocalDB.saveSettings(newSettings);
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

{showReport && <ReportModal currentDate={currentDateStr} todayData={todayData} onClose={() => setShowReport(false)} setToastMsg={setToastMsg} />}

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

// --- TimeTracker ---
const TimeTracker = ({ logs, onSaveLog, onDeleteLog, tags, onAddTag }) => {
const [status, setStatus] = useState('idle');
const [elapsed, setElapsed] = useState(0);
const [selectedTag, setSelectedTag] = useState(tags[0]);
const [customTagInput, setCustomTagInput] = useState('');
const [selectedColor, setSelectedColor] = useState('warm');
const [isAddingTag, setIsAddingTag] = useState(false);
const timerRef = useRef(null);

// 初始化
useEffect(() => {
const saved = LocalDB.getTimerState();
if (saved) {
setSelectedTag(saved.tag || tags[0]);
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

// 唤醒校准
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

// 计时逻辑
useEffect(() => {
if (status === 'running') {
timerRef.current = setInterval(() => {
setElapsed(prev => {
const next = prev + 1;
LocalDB.saveTimerState({ status: 'running', elapsed: next, lastTick: Date.now(), tag: selectedTag });
return next;
});
}, 1000);
} else {
clearInterval(timerRef.current);
}
return () => clearInterval(timerRef.current);
}, [status, selectedTag]);

const handleStart = () => {
setStatus('running');
LocalDB.saveTimerState({ status: 'running', elapsed, lastTick: Date.now(), tag: selectedTag });
};
const handlePause = () => {
setStatus('paused');
LocalDB.saveTimerState({ status: 'paused', elapsed, lastTick: Date.now(), tag: selectedTag });
};
const handleStop = () => {
if (elapsed > 5) {
onSaveLog({
id: Date.now(),
name: selectedTag.name,
color: selectedTag.color,
duration: elapsed,
timestamp: Date.now()
});
}
setStatus('idle');
setElapsed(0);
LocalDB.saveTimerState(null);
};

const handleAddNewTag = () => {
if (customTagInput.trim()) {
onAddTag(customTagInput.trim(), selectedColor);
setSelectedTag({ name: customTagInput.trim(), color: selectedColor });
setCustomTagInput('');
document.getElementById('tag-dialog').close();
}
};

return (
<div className="space-y-6 pt-4">
<div className="relative flex flex-col items-center justify-center py-8">
<div className={`absolute w-64 h-64 bg-warm-100 rounded-full blur-3xl opacity-50 transition-all duration-1000 ${status === 'running' ? 'scale-110 opacity-70' : 'scale-100'}`}></div>
<div className={`relative z-10 w-64 h-64 bg-white rounded-full soft-shadow border-8 flex flex-col items-center justify-center transition-all duration-500 ${status === 'running' ? 'border-warm-300 animate-breathe' : 'border-warm-100'}`}>

<div className="mb-4 relative">
<div
onClick={() => status === 'idle' && document.getElementById('tag-dialog').showModal()}
className="flex flex-col items-center justify-center gap-1 cursor-pointer group"
>
<span className="text-xs font-bold text-ink/40 mb-1">当前专注</span>
<div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border-2 transition-all ${COLOR_PALETTE[selectedTag.color || 'warm']}`}>
<span className="text-sm font-bold">{selectedTag.name}</span>
<Icons.Tag />
</div>
</div>
</div>

<div className="text-5xl font-bold font-mono tracking-widest tabular-nums text-warm-600">
{formatTimeHHMMSS(elapsed)}
</div>
<div className="text-xs font-bold text-warm-300 mt-2 uppercase tracking-widest">{status === 'running' ? 'Focusing...' : 'Ready'}</div>
</div>

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

<dialog id="tag-dialog" className="p-0 rounded-2xl backdrop:bg-ink/20 border-0 shadow-xl m-auto">
<div className="bg-white p-5 w-80">
<div className="flex justify-between items-center mb-4">
<h3 className="text-lg font-bold text-ink">选择标签</h3>
<button onClick={() => document.getElementById('tag-dialog').close()}><Icons.X /></button>
</div>

<div className="flex flex-wrap gap-2 mb-6 max-h-40 overflow-y-auto">
{tags.map(t => (
<button
key={t.name}
onClick={() => { setSelectedTag(t); document.getElementById('tag-dialog').close(); }}
className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-all ${selectedTag.name === t.name ? COLOR_PALETTE[t.color] + ' ring-2 ring-offset-1 ring-warm-200' : 'bg-white border-gray-100 text-ink/60'}`}
>
{t.name}
</button>
))}
</div>

<div className="border-t-2 border-dashed border-warm-100 pt-4">
<div className="text-xs font-bold text-ink/40 mb-2">新建标签</div>
<input
className="w-full bg-paper px-3 py-2 rounded-xl border-2 border-warm-100 text-sm outline-none focus:border-warm-300 mb-3 font-bold text-ink"
placeholder="标签名称 (如: 运动)"
value={customTagInput}
onChange={(e) => setCustomTagInput(e.target.value)}
/>
<div className="flex justify-between items-center">
<div className="flex gap-2">
{Object.keys(COLOR_PALETTE).map(c => (
<button
key={c}
onClick={() => setSelectedColor(c)}
className={`w-6 h-6 rounded-full border-2 ${selectedColor === c ? 'scale-125 border-ink/20 shadow-sm' : 'border-transparent opacity-50'} ${COLOR_PALETTE[c].split(' ')[0]}`}
></button>
))}
</div>
<button
onClick={handleAddNewTag}
className="px-4 py-2 bg-warm-500 text-white rounded-xl font-bold text-xs disabled:opacity-50"
disabled={!customTagInput.trim()}
>
添加
</button>
</div>
</div>
</div>
</dialog>

<div className="bg-white rounded-3xl p-5 soft-shadow border border-warm-50">
<div className="flex justify-between items-end px-2 mb-4 border-b border-dashed border-warm-100 pb-2">
<h3 className="font-bold text-ink">今天的足迹</h3>
<span className="text-xs font-bold text-warm-400">共 {formatDuration(logs.reduce((acc, curr) => acc + curr.duration, 0))}</span>
</div>
<div className="space-y-3">
{logs.length === 0 ? <div className="text-center py-8 text-warm-300 font-bold text-sm">还没有留下脚印哦</div> : logs.map(log => (
<div key={log.id} className="bg-paper p-3 rounded-2xl border border-warm-100 flex justify-between items-center">
<div className="flex-1">
<div className="flex items-center gap-2">
<div className={`w-2 h-2 rounded-full ${COLOR_PALETTE[log.color || 'warm'].split(' ')[0]}`}></div>
<span className="font-bold text-ink/80">{log.name}</span>
</div>
<div className="text-[10px] font-bold text-warm-300 mt-1">{new Date(log.timestamp).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'})}</div>
</div>
<div className="flex items-center gap-3"><span className="font-mono text-warm-600 font-bold bg-warm-100 px-2 py-1 rounded-lg text-xs">{formatDuration(log.duration)}</span><button onClick={() => onDeleteLog(log.id)} className="text-warm-200 hover:text-berry-500 p-2 transition-colors"><Icons.Trash /></button></div>
</div>
))}
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

const ReportModal = ({ currentDate, todayData, onClose, setToastMsg }) => {
const [range, setRange] = useState(7);
const [mode, setMode] = useState('data');
const [stats, setStats] = useState(null);
const [chartData, setChartData] = useState([]);
const fileInputRef = useRef(null);
const chartContainerRef = useRef(null);

useEffect(() => {
const allData = LocalDB.getAll();
allData[currentDate] = todayData;

const reportDays = [];
const cData = [];

for (let i = range - 1; i >= 0; i--) {
const d = new Date(); d.setDate(d.getDate() - i);
const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
const dateStr = formatter.format(d);
const dayData = allData[dateStr] || {};
reportDays.push({date: dateStr, ...dayData});

const focusMin = (dayData.timeLogs || []).reduce((a,c)=>a+c.duration,0)/60;

// 优化评分逻辑：每项满分1，总分满分100
const waterScore = Math.min((dayData.water||0)/8, 1);
const poopScore = Math.min((dayData.poop||0)/1, 1);
const spineScore = Math.min((dayData.spine||0)/2, 1);
const sleepScore = Math.min((dayData.sleep||0)/1, 1);
const habitScore = (waterScore + poopScore + spineScore + sleepScore) / 4 * 100;

cData.push({
date: dateStr.slice(5),
focus: focusMin,
habit: habitScore
});
}

const newStats = { days: reportDays.length, water: {total:0,target:range*8}, poop:{total:0,target:range}, spine:{total:0,target:range*2}, sleep:{total:0,target:range}, impulse:{total:0,avg:0}, totalFocusTime:0 };
reportDays.forEach(d => {
newStats.water.total += (d.water||0); newStats.poop.total += (d.poop||0); newStats.spine.total += (d.spine||0); newStats.sleep.total += (d.sleep||0); newStats.impulse.total += (d.impulse||0);
if(d.timeLogs) d.timeLogs.forEach(l => newStats.totalFocusTime += l.duration);
});
newStats.impulse.avg = reportDays.length > 0 ? (newStats.impulse.total / range).toFixed(1) : 0;
setStats(newStats);
setChartData(cData);
}, [range, todayData]);

useLayoutEffect(() => {
if (mode === 'chart' && chartContainerRef.current) {
chartContainerRef.current.scrollLeft = chartContainerRef.current.scrollWidth;
}
}, [mode, chartData]);

const handleExportCSV = () => {
const allData = LocalDB.getAll();
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
const fileType = file.name.endsWith('.csv') ? 'csv' : 'json';
const reader = new FileReader();
reader.onload = (event) => {
if (LocalDB.importData(event.target.result, fileType)) { alert("恢复成功！"); window.location.reload(); }
else { alert("文件格式错误"); }
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
<div className="p-4 border-b-2 border-dashed border-warm-100 flex justify-between items-center bg-paper">
<div className="flex gap-4">
<button onClick={() => setMode('data')} className={`text-lg font-bold transition-colors ${mode === 'data' ? 'text-ink' : 'text-warm-300'}`}>数据</button>
<button onClick={() => setMode('chart')} className={`text-lg font-bold transition-colors ${mode === 'chart' ? 'text-ink' : 'text-warm-300'}`}>趋势</button>
</div>
<button onClick={onClose} className="p-2 bg-white rounded-full text-warm-300 hover:text-warm-500"><Icons.X /></button>
</div>

<div className="flex p-2 bg-paper mx-4 mt-4 rounded-xl border border-warm-100">
{[7, 30].map(r => (
<button key={r} onClick={() => setRange(r)} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${range === r ? 'bg-white text-warm-600 shadow-sm border border-warm-100' : 'text-warm-300'}`}>近{r}天</button>
))}
</div>

<div className="p-6 overflow-y-auto space-y-4">
{!stats ? <div className="text-center py-8 text-warm-300 font-bold">翻阅记忆中...</div> : (
mode === 'data' ? (
<>
<div className="grid grid-cols-2 gap-3"><StatBox label="💧 饮水" percent={getRate('water')} /><StatBox label="💩 顺畅" percent={getRate('poop')} /><StatBox label="🚶‍♀️ 脊柱" percent={getRate('spine')} /><StatBox label="🌙 睡眠" percent={getRate('sleep')} /></div>
<div className="bg-warm-100 rounded-2xl p-4 border border-warm-200"><div className="flex justify-between items-center mb-1"><span className="font-bold text-warm-600">🛡️ 日均觉察</span><span className="text-2xl font-bold text-warm-500">{stats.impulse.avg}</span></div></div>
<div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100"><div className="flex justify-between items-center mb-1"><span className="font-bold text-indigo-600">⏱️ 专注时光</span><span className="text-2xl font-bold text-indigo-500">{(stats.totalFocusTime / 3600).toFixed(1)}h</span></div></div>
<div className="pt-4 border-t-2 border-dashed border-warm-100">
<div className="grid grid-cols-2 gap-2">
<button onClick={handleExportCSV} className="py-2 bg-paper text-warm-600 border border-warm-200 rounded-xl font-bold text-xs active:bg-warm-50 flex items-center justify-center gap-1"><Icons.Download /> 导出 Excel</button>
<button onClick={handleBackup} className="py-2 bg-warm-100 text-warm-600 border border-warm-200 rounded-xl font-bold text-xs active:bg-warm-200 flex items-center justify-center gap-1"><Icons.Download /> 备份数据</button>
<button onClick={() => fileInputRef.current.click()} className="col-span-2 py-3 bg-white text-sage-600 border-2 border-sage-100 rounded-xl font-bold text-sm active:bg-sage-50 flex items-center justify-center gap-2"><Icons.Upload /> 恢复备份</button>
<input type="file" ref={fileInputRef} onChange={handleRestore} className="hidden" accept=".json,.csv" />
</div>
</div>
</>
) : (
<div className="space-y-6">
{/* Use Recharts if available, else fallback to CSS Chart */}
{window.Recharts ? (
<div className="space-y-6">
<div style={{ width: '100%', height: 200 }}>
<h3 className="text-xs font-bold text-warm-400 mb-2">⏱️ 专注时长 (小时)</h3>
<ResponsiveContainer>
<BarChart data={chartData.map(d => ({...d, focus: parseFloat((d.focus/60).toFixed(1))}))}>
<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0D8C0" />
<XAxis dataKey="date" tick={{fontSize: 10, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
<YAxis hide />
<Tooltip
cursor={{fill: '#FDF6E3'}}
contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
/>
<Bar dataKey="focus" fill="#818CF8" radius={[4, 4, 0, 0]} barSize={20} />
</BarChart>
</ResponsiveContainer>
</div>
<div style={{ width: '100%', height: 200 }}>
<h3 className="text-xs font-bold text-warm-400 mb-2">✨ 习惯完成度 (%)</h3>
<ResponsiveContainer>
<BarChart data={chartData}>
<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E0D8C0" />
<XAxis dataKey="date" tick={{fontSize: 10, fill: '#9CA3AF'}} axisLine={false} tickLine={false} />
<YAxis hide domain={[0, 100]} />
<Tooltip
cursor={{fill: '#FDF6E3'}}
contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
/>
<Bar dataKey="habit" fill="#81C784" radius={[4, 4, 0, 0]} barSize={20} />
</BarChart>
</ResponsiveContainer>
</div>
</div>
) : (
// Fallback to CSS Chart if Recharts fails
<div className="space-y-6">
<div>
<h3 className="text-xs font-bold text-warm-400 mb-3">⏱️ 专注时长 (小时)</h3>
<div ref={chartContainerRef} className="overflow-x-auto pb-2 scrollbar-hide">
<div className="flex items-end h-32 gap-3" style={{width: `${Math.max(100, chartData.length * 10)}%`}}>
{chartData.map((d, i) => {
const h = (d.focus / 60);
const maxH = Math.max(...chartData.map(c => c.focus/60), 1);
const height = Math.max((h / maxH) * 100, 5);
return (
<div key={i} className="flex-1 flex flex-col items-center gap-1 group min-w-[30px]">
<div className="w-full bg-indigo-100 rounded-t-md relative hover:bg-indigo-200 transition-all" style={{height: `${height}%`}}>
<div className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-indigo-600 text-white px-1 rounded whitespace-nowrap z-10">{h.toFixed(1)}h</div>
</div>
<span className="text-[10px] text-warm-300 font-bold -rotate-45 origin-top-left translate-y-2 whitespace-nowrap">{d.date}</span>
</div>
)
})}
</div>
</div>
</div>
<div className="mt-8">
<h3 className="text-xs font-bold text-warm-400 mb-3">✨ 习惯完成度 (%)</h3>
<div className="overflow-x-auto pb-2 scrollbar-hide">
<div className="flex items-end h-32 gap-3" style={{width: `${Math.max(100, chartData.length * 10)}%`}}>
{chartData.map((d, i) => (
<div key={i} className="flex-1 flex flex-col items-center gap-1 group min-w-[30px]">
<div className="w-full bg-sage-100 rounded-t-md relative hover:bg-sage-200 transition-all" style={{height: `${Math.max(d.habit, 5)}%`}}>
<div className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] bg-sage-600 text-white px-1 rounded z-10">{Math.round(d.habit)}%</div>
</div>
<span className="text-[10px] text-warm-300 font-bold -rotate-45 origin-top-left translate-y-2 whitespace-nowrap">{d.date}</span>
</div>
))}
</div>
</div>
</div>
</div>
)}
</div>
)
)}
</div>
</div>
</div>
);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);