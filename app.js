const { useState, useEffect, useRef, useMemo } = React;

// --- 1. 全局配置与工具 ---
const STORAGE_KEY = 'deonysus_anchor_data_v1';
const TIMER_STATE_KEY = 'deonysus_active_timer_v1';
const SETTINGS_KEY = 'deonysus_settings_v1';

// 统一颜色定义 (CSS类 + SVG填充色)
const COLOR_PALETTE = {
'blue': { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', fill: '#DBEAFE', stroke: '#BFDBFE' },
'indigo': { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', fill: '#E0E7FF', stroke: '#C7D2FE' },
'emerald':{ bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', fill: '#D1FAE5', stroke: '#A7F3D0' },
'orange': { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', fill: '#FFEDD5', stroke: '#FED7AA' },
'stone': { bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-200', fill: '#F5F5F4', stroke: '#E7E5E4' },
'rose': { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', fill: '#FFE4E6', stroke: '#FECDD3' },
'purple': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', fill: '#F3E8FF', stroke: '#E9D5FF' },
'cyan': { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200', fill: '#CFFAFE', stroke: '#A5F3FC' },
'default':{ bg: 'bg-warm-100', text: 'text-warm-700', border: 'border-warm-200', fill: '#F3F4F6', stroke: '#E5E7EB' }
};

// 获取颜色的辅助函数 (增强版：防止找不到颜色时崩溃)
const getTheme = (colorName) => {
// 兼容旧数据或直接传入的颜色值
if (!colorName) return COLOR_PALETTE['default'];
// 尝试匹配，如果匹配不到就返回默认
return COLOR_PALETTE[colorName] || COLOR_PALETTE['default'];
};

// --- 2. 本地数据库 ---
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
const defaults = {
tags: [
{ name: '工作', color: 'blue' },
{ name: '学习', color: 'indigo' },
{ name: '阅读', color: 'emerald' },
{ name: '运动', color: 'orange' },
{ name: '发呆', color: 'stone' }
]
};
const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
// 简单合并默认值，防止旧数据缺少字段
return s ? { ...defaults, ...s } : defaults;
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
try { // CSV 兼容
const lines = fileContent.split('\n');
let successCount = 0;
const currentData = LocalDB.getAll();
for (let i = 1; i < lines.length; i++) {
const line = lines[i].trim(); if(!line) continue;
const cols = line.split(','); const date = cols[0]?.trim();
if(date && /^\d{4}-\d{2}-\d{2}$/.test(date)){
const water = parseInt(cols[1])||0; const poop = parseInt(cols[2])||0;
const spine = parseInt(cols[3])||0; const sleep = parseInt(cols[4])||0; const impulse = parseInt(cols[5])||0;
let timeLogs = currentData[date]?.timeLogs || [];
if(cols[6] && parseFloat(cols[6])>0) {
if(!timeLogs.some(l=>l.name==='历史导入数据')) timeLogs.push({id:Date.now()+i, name:'历史导入数据', duration:Math.floor(parseFloat(cols[6])*60), timestamp:new Date(date).getTime()+43200000});
}
currentData[date] = {water,poop,spine,sleep,impulse,timeLogs,lastUpdate:Date.now()};
successCount++;
}
}
if(successCount>0) { LocalDB.saveAll(currentData); return {success:true, type:'CSV', count:successCount}; }
} catch(e) {}
return { success: false };
}
};

const getShanghaiDate = () => {
const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
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
Tag: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
Left: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
Right: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
Clock: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
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

const saveNewTag = (name, color) => {
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

// --- V19 新增组件: 24小时时光罗盘 ---
const DailyClock = ({ logs, tags }) => {
const radius = 80;
const center = 100;

// 计算扇形路径
const getSectorPath = (startAngle, endAngle) => {
const startRad = (startAngle - 90) * Math.PI / 180;
const endRad = (endAngle - 90) * Math.PI / 180;
const x1 = center + radius * Math.cos(startRad);
const y1 = center + radius * Math.sin(startRad);
const x2 = center + radius * Math.cos(endRad);
const y2 = center + radius * Math.sin(endRad);
// 大于180度需要大弧标记，但我们的记录一般不会这么长，且跨天会切分
// 简单处理：如果角度差接近360 (全天)，画圆；否则画弧
if (Math.abs(endAngle - startAngle) >= 359.9) {
return `M${center},${center-radius} A${radius},${radius} 0 1,1 ${center},${center+radius} A${radius},${radius} 0 1,1 ${center},${center-radius} Z`;
}
return `M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${endAngle - startAngle > 180 ? 1 : 0},1 ${x2},${y2} Z`;
};

const sectors = useMemo(() => {
if (!logs || logs.length === 0) return [];
return logs.map(log => {
const date = new Date(log.timestamp);
const endMinutes = date.getHours() * 60 + date.getMinutes();
let startMinutes = endMinutes - (log.duration / 60);
if (startMinutes < 0) startMinutes = 0;

const startAngle = (startMinutes / 1440) * 360;
const endAngle = (endMinutes / 1440) * 360;

// 查找标签颜色，找不到则用默认
const tag = tags.find(t => t.name === log.name) || { color: 'default' };
const theme = getTheme(tag.color);

return { path: getSectorPath(startAngle, endAngle), color: theme.fill, stroke: theme.stroke, name: log.name };
});
}, [logs, tags]);

return (
<div className="relative w-64 h-64 mx-auto my-4">
<svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
<circle cx="100" cy="100" r="98" fill="#FFF" stroke="#E5E7EB" strokeWidth="1" />
<circle cx="100" cy="100" r="80" fill="#FFFDF5" stroke="#FEEAFA" strokeWidth="1" strokeDasharray="4 4" />
{[0, 6, 12, 18].map(h => {
const angle = (h / 24) * 360 - 90;
const rad = angle * Math.PI / 180;
const x = 100 + 88 * Math.cos(rad);
const y = 100 + 88 * Math.sin(rad);
return <text key={h} x={x} y={y} fontSize="10" textAnchor="middle" alignmentBaseline="middle" fill="#9CA3AF" fontWeight="bold">{h}</text>;
})}
{sectors.map((s, i) => (
<path key={i} d={s.path} fill={s.color} stroke={s.stroke} strokeWidth="0.5" className="grow-sector" />
))}
<circle cx="100" cy="100" r="15" fill="#FFF" stroke="#E5E7EB" strokeWidth="2" />
<text x="100" y="102" textAnchor="middle" alignmentBaseline="middle" fontSize="14">🕰️</text>
</svg>
</div>
);
};

// --- 专注计时器 (V19.1 修复标签显示) ---
const TimeTracker = ({ logs, onSaveLog, onDeleteLog, tags, onAddTag, onUpdateTag }) => {
const [status, setStatus] = useState('idle');
const [elapsed, setElapsed] = useState(0);
const [selectedTagName, setSelectedTagName] = useState(tags[0].name);
const [isTagModalOpen, setIsTagModalOpen] = useState(false);
const [newTagName, setNewTagName] = useState('');
const [newTagColor, setNewTagColor] = useState('blue');
const [editingTag, setEditingTag] = useState(null);
const timerRef = useRef(null);

// 查找当前标签，如果找不到（比如被删了），就用 tags[0] 或者做一个临时的
const currentTag = tags.find(t => t.name === selectedTagName) || tags[0] || { name: '默认', color: 'default' };
const theme = getTheme(currentTag.color);

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
} else { clearInterval(timerRef.current); }
return () => clearInterval(timerRef.current);
}, [status, selectedTagName]);
const handleStart = () => { setStatus('running'); LocalDB.saveTimerState({ status: 'running', elapsed, lastTick: Date.now(), tag: selectedTagName }); };
const handlePause = () => { setStatus('paused'); LocalDB.saveTimerState({ status: 'paused', elapsed, lastTick: Date.now(), tag: selectedTagName }); };
const handleStop = () => {
if (elapsed > 5) onSaveLog({ id: Date.now(), name: selectedTagName, duration: elapsed, timestamp: Date.now() });
setStatus('idle'); setElapsed(0); LocalDB.saveTimerState(null);
};
const handleSaveTag = () => {
if (!newTagName.trim()) return;
if (editingTag) onUpdateTag(editingTag.name, newTagName.trim(), newTagColor);
else onAddTag(newTagName.trim(), newTagColor);
setNewTagName(''); setNewTagColor('blue'); setEditingTag(null); setIsTagModalOpen(false);
};
const openEditTag = (tag) => { setEditingTag(tag); setNewTagName(tag.name); setNewTagColor(tag.color); setIsTagModalOpen(true); };
const colorOptions = Object.keys(COLOR_PALETTE).filter(k => k !== 'default');

// 动态边框色 (呼吸圈)
const getRingColor = (colorKey) => {
// 简单映射，或者直接使用 theme 对象里的 border
// 为了确保呼吸圈总是可见，我们根据 theme 里的 border 颜色类名推导
// 这里简化处理：直接使用 theme.border
return theme.border.replace('border-', 'border-');
};

return (
<div className="space-y-6 pt-4">
{/* Timer Display */}
<div className="relative flex flex-col items-center justify-center py-8">
<div className={`absolute w-64 h-64 bg-warm-100 rounded-full blur-3xl opacity-50 transition-all duration-1000 ${status === 'running' ? 'scale-110 opacity-70' : 'scale-100'}`}></div>
{/* 修复：呼吸圈颜色逻辑 */}
<div className={`relative z-10 w-64 h-64 bg-white rounded-full soft-shadow border-8 flex flex-col items-center justify-center transition-all duration-500 ${status === 'running' ? `${theme.border.replace('200','300')} animate-breathe` : 'border-warm-100'}`}>
<div onClick={() => status === 'idle' && setIsTagModalOpen(true)} className="mb-3 flex items-center gap-2 px-4 py-1.5 rounded-full cursor-pointer transition-transform hover:scale-105 active:scale-95 border-2 border-transparent hover:border-warm-100">
{/* 修复：直接使用 style 对象或者确保 theme 类名正确 */}
<span className={`text-sm font-bold px-2 py-0.5 rounded-md ${theme.text} ${theme.bg} ${theme.border}`}>
{selectedTagName}
</span>
{status === 'idle' && <Icons.Edit />}
</div>
<div className={`text-5xl font-bold font-mono tracking-widest tabular-nums ${status === 'running' ? theme.text : 'text-warm-600'}`}>{formatTimeHHMMSS(elapsed)}</div>
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

{/* Tag Modal */}
{isTagModalOpen && (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
<div className="absolute inset-0 bg-ink/20 backdrop-blur-sm" onClick={() => { setIsTagModalOpen(false); setEditingTag(null); }}></div>
<div className="bg-white w-full max-w-sm p-5 rounded-3xl shadow-2xl relative z-10 animate-fade-in">
<h3 className="text-lg font-bold text-ink mb-4">{editingTag ? '修改标签' : '选择标签'}</h3>
{!editingTag && (
<div className="flex flex-wrap gap-2 mb-6 max-h-40 overflow-y-auto">
{tags.map(t => {
const tTheme = getTheme(t.color);
return (
<div key={t.name} className="relative group">
<button onClick={() => { setSelectedTagName(t.name); setIsTagModalOpen(false); }} className={`px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all tag-capsule ${selectedTagName === t.name ? `ring-2 ring-offset-1 ring-warm-300 ${tTheme.bg} ${tTheme.text} ${tTheme.border}` : 'bg-white border-warm-100 text-ink/60'}`}>{t.name}</button>
<button onClick={(e) => { e.stopPropagation(); openEditTag(t); }} className="absolute -top-1 -right-1 w-4 h-4 bg-warm-200 rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-ink">🖊️</button>
</div>
);
})}
</div>
)}
<div className="border-t border-dashed border-warm-200 pt-4">
<input className="w-full bg-paper px-3 py-2 rounded-xl border border-warm-200 text-sm outline-none focus:border-warm-400 mb-3 font-bold text-ink" placeholder="标签名称" value={newTagName} onChange={e => setNewTagName(e.target.value)} />
<div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
{colorOptions.map(c => (
<button key={c} onClick={() => setNewTagColor(c)} className={`w-6 h-6 rounded-full flex-shrink-0 ${COLOR_PALETTE[c].bg} border-2 ${newTagColor === c ? 'border-ink' : 'border-transparent'}`} />
))}
</div>
<button onClick={handleSaveTag} className="w-full py-2 bg-warm-500 text-white rounded-xl font-bold text-sm shadow-md active:bg-warm-600">{editingTag ? '保存修改' : '添加新标签'}</button>
</div>
</div>
</div>
)}

{/* V19 新增: 时光罗盘 & 列表 */}
<div className="bg-white rounded-3xl p-5 soft-shadow border border-warm-50">
<div className="flex justify-between items-end px-2 mb-2 border-b border-dashed border-warm-100 pb-2">
<h3 className="font-bold text-ink">时光罗盘</h3>
<span className="text-xs font-bold text-warm-400">共 {formatDuration(logs.reduce((acc, curr) => acc + curr.duration, 0))}</span>
</div>

{/* 时钟组件 */}
{logs.length > 0 ? <DailyClock logs={logs} tags={tags} /> : <div className="text-center py-8 text-warm-300 font-bold text-sm">空白的一天</div>}

{/* 列表详情 */}
<div className="space-y-3 mt-4">
{[...logs].sort((a,b) => b.timestamp - a.timestamp).map(log => {
// 查找标签颜色，增加空值保护
const matchedTag = tags.find(t => t.name === log.name) || { color: 'default' };
const tTheme = getTheme(matchedTag.color);

return (
<div key={log.id} className="bg-paper p-3 rounded-2xl border border-warm-100 flex justify-between items-center">
<div className="flex-1">
<div className="flex items-center gap-2">
<span className={`text-xs font-bold px-2 py-0.5 rounded-md ${tTheme.bg} ${tTheme.text} ${tTheme.border}`}>{log.name}</span>
</div>
<div className="text-[10px] font-bold text-warm-300 mt-1">{new Date(log.timestamp - log.duration*1000).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'})} - {new Date(log.timestamp).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'})}</div>
</div>
<div className="flex items-center gap-2"><span className="font-mono text-ink/60 font-bold text-xs">{formatDuration(log.duration)}</span><button onClick={() => onDeleteLog(log.id)} className="text-warm-200 hover:text-berry-500 p-1 transition-colors"><Icons.Trash /></button></div>
</div>
);
})}
</div>
</div>
</div>
);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);