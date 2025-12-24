const { useState, useEffect, useRef } = React;

// ==========================================
// 1. 核心配置与数据层
// ==========================================
const STORAGE_KEY = 'deonysus_anchor_data_v1';
const TIMER_STATE_KEY = 'deonysus_active_timer_v1';
const SETTINGS_KEY = 'deonysus_settings_v1';

const DEFAULT_HABITS = [
{ id: 'water', label: "💧 饮水守护", max: 8, desc: "≥300ml 对抗结石", type: "infinite", color: "bg-sky-100 text-sky-600" },
{ id: 'poop', label: "💩 顺畅守护", max: 1, desc: "身体净化完成", type: "count", color: "bg-amber-100 text-amber-700" },
{ id: 'spine', label: "🚶‍♀️ 脊柱活动", max: 2, desc: "上下午各一次拉伸", type: "count", color: "bg-sage-100 text-sage-600" },
{ id: 'sleep', label: "🌙 睡前锚点", max: 1, desc: "23:00 前开始仪式", type: "count", color: "bg-lavender-100 text-lavender-600" },
{ id: 'impulse', label: "🧠 冲动记录", max: 999, desc: "护甲：觉察与停顿", type: "infinite", color: "bg-berry-100 text-berry-600" }
];

const DEFAULT_TAGS = [
{ name: '工作', color: 'bg-warm-100 text-warm-600' },
{ name: '学习', color: 'bg-sky-100 text-sky-600' },
{ name: '阅读', color: 'bg-sage-100 text-sage-600' },
{ name: '运动', color: 'bg-berry-100 text-berry-600' },
{ name: '发呆', color: 'bg-lavender-100 text-lavender-600' }
];

const LocalDB = {
getAll: () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } },
saveAll: (data) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); },
getToday: (dateKey) => {
const all = LocalDB.getAll();
const day = all[dateKey] || { timeLogs: [] };
if (!day.timeLogs) day.timeLogs = [];
return day;
},
updateToday: (dateKey, newData) => {
const all = LocalDB.getAll();
all[dateKey] = { ...newData, lastUpdate: Date.now() };
LocalDB.saveAll(all);
},
getTimerState: () => { try { return JSON.parse(localStorage.getItem(TIMER_STATE_KEY)); } catch { return null; } },
saveTimerState: (state) => {
if (!state) localStorage.removeItem(TIMER_STATE_KEY);
else localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
},
getSettings: () => {
try {
const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
let tags = saved?.tags || DEFAULT_TAGS;
if (tags.length > 0 && typeof tags[0] === 'string') {
tags = tags.map(t => ({ name: t, color: 'bg-warm-100 text-warm-600' }));
}
return { tags: tags, habits: saved?.habits || DEFAULT_HABITS };
} catch { return { tags: DEFAULT_TAGS, habits: DEFAULT_HABITS }; }
},
saveSettings: (settings) => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); },
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
if (!seconds) return '0m';
const m = seconds / 60;
if (m < 60) return `${m.toFixed(1)}m`;
return `${(m / 60).toFixed(1)}h`;
};

// ==========================================
// 2. 图标组件 (必须在其他组件之前)
// ==========================================
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
Settings: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
Calendar: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
};

// ==========================================
// 3. 子组件 (严格放在 App 之前)
// ==========================================

const ColorPicker = ({ selected, onSelect }) => {
const colors = [
'bg-warm-100 text-warm-600', 'bg-sky-100 text-sky-600', 'bg-sage-100 text-sage-600',
'bg-berry-100 text-berry-600', 'bg-lavender-100 text-lavender-600'
];
return (
<div className="flex gap-2">
{colors.map(c => (
<div key={c} onClick={() => onSelect(c)} className={`color-swatch ${c.split(' ')[0]} ${selected === c ? 'selected ring-2 ring-ink ring-offset-1' : ''}`} />
))}
</div>
);
};

const HabitCard = ({ config, value, onIncrement }) => {
const isTargetReached = value >= config.max;
// 修复：对于 infinite 类型，即使到达 max 也不禁用点击
const isClickable = config.type === 'infinite' || !isTargetReached;
const percentage = Math.min((value / config.max) * 100, 100);
const bgClass = config.color ? config.color.split(' ')[0].replace('bg-', 'bg-') : 'bg-warm-100';
const textClass = config.color ? config.color.split(' ')[1] : 'text-warm-600';
const borderClass = bgClass.replace('bg-', 'border-').replace('100', '200');

return (
<div onClick={isClickable ? onIncrement : undefined} className={`relative overflow-hidden rounded-3xl p-4 transition-all duration-300 select-none border-2 ${isClickable ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'} ${isTargetReached ? 'bg-white border-warm-200 opacity-80' : 'bg-white border-white soft-shadow hover:border-warm-200'}`}>
<div className={`absolute bottom-0 left-0 h-1.5 transition-all duration-500 rounded-r-full ${bgClass.replace('100', '300')}`} style={{ width: `${percentage}%`, opacity: isTargetReached ? 0 : 0.5 }} />
<div className="flex justify-between items-center relative z-10">
<div className="flex items-center gap-3">
<div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${bgClass} ${textClass}`}>{config.label.split(' ')[0]}</div>
<div>
<h3 className={`font-bold text-lg flex items-center gap-2 ${isTargetReached ? 'text-warm-400 line-through' : 'text-ink'}`}>{config.label.split(' ')[1]} {isTargetReached && <span className="text-warm-500 no-underline"><Icons.Check /></span>}</h3>
<p className="text-xs text-ink/40 font-bold mt-0.5">{config.desc}</p>
</div>
</div>
<div className="flex items-center gap-3">
<div className="text-right"><span className={`text-2xl font-bold font-mono ${isTargetReached ? 'text-warm-300' : 'text-warm-600'}`}>{value}</span><span className="text-xs text-warm-300 font-bold">/{config.max}</span></div>
<div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all border-b-2 active:border-b-0 active:translate-y-0.5 ${isTargetReached ? (config.type === 'infinite' ? 'bg-warm-400 text-white border-warm-500' : 'bg-gray-100 text-gray-300 border-gray-200') : `${bgClass} ${textClass} ${borderClass}`}`}><Icons.Plus /></div>
</div>
</div>
</div>
);
};

const HabitEditor = ({ habits, onClose, onSave }) => {
const [localHabits, setLocalHabits] = useState(JSON.parse(JSON.stringify(habits)));

const handleEdit = (idx, field, value) => {
const newHabits = [...localHabits];
newHabits[idx][field] = value;
setLocalHabits(newHabits);
};

const handleDelete = (idx) => {
if(confirm('确定删除这个习惯吗？历史数据还会保留，但今天看不到了。')) {
const newHabits = localHabits.filter((_, i) => i !== idx);
setLocalHabits(newHabits);
}
};

const handleAdd = () => {
const id = 'custom_' + Date.now();
setLocalHabits([...localHabits, { id, label: "✨ 新习惯", max: 1, desc: "加油", type: "count", color: "bg-warm-100 text-warm-600" }]);
};

const handleSave = () => {
onSave(localHabits);
onClose();
};

return (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
<div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose}></div>
<div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 p-5 flex flex-col max-h-[85vh] border-4 border-paper">
<h3 className="text-lg font-bold text-ink mb-4">定制你的守护</h3>
<div className="overflow-y-auto flex-1 space-y-4 pr-1">
{localHabits.map((h, i) => (
<div key={h.id} className="p-3 bg-paper border border-warm-100 rounded-xl space-y-2">
<div className="flex gap-2">
<input className="flex-1 bg-white border border-warm-200 rounded px-2 py-1 text-sm font-bold" value={h.label} onChange={e => handleEdit(i, 'label', e.target.value)} />
<button onClick={() => handleDelete(i)} className="text-berry-500 p-1"><Icons.Trash /></button>
</div>
<input className="w-full bg-white border border-warm-200 rounded px-2 py-1 text-xs" value={h.desc} onChange={e => handleEdit(i, 'desc', e.target.value)} />
<div className="flex gap-2 items-center">
<span className="text-xs text-ink/50">目标:</span>
<input type="number" className="w-12 bg-white border border-warm-200 rounded px-1 py-1 text-xs" value={h.max} onChange={e => handleEdit(i, 'max', parseInt(e.target.value)||1)} />
<span className="text-xs text-ink/50">模式:</span>
<select className="bg-white border border-warm-200 rounded text-xs py-1" value={h.type} onChange={e => handleEdit(i, 'type', e.target.value)}>
<option value="count">计次</option>
<option value="infinite">无限</option>
</select>
</div>
<ColorPicker selected={h.color} onSelect={c => handleEdit(i, 'color', c)} />
</div>
))}
<button onClick={handleAdd} className="w-full py-3 bg-warm-50 text-warm-400 border border-dashed border-warm-300 rounded-xl font-bold text-sm">+ 添加新习惯</button>
</div>
<div className="mt-4 flex gap-3">
<button onClick={onClose} className="flex-1 py-3 text-ink/60 bg-white border border-warm-100 rounded-xl font-bold">取消</button>
<button onClick={handleSave} className="flex-1 py-3 text-white bg-warm-500 rounded-xl font-bold shadow-md">保存</button>
</div>
</div>
</div>
);
};

const TimeTracker = ({ logs, onSaveLog, onDeleteLog, tags, onSaveTags }) => {
const [status, setStatus] = useState('idle');
const [elapsed, setElapsed] = useState(0);
const [selectedTag, setSelectedTag] = useState(null);
const [isEditingTag, setIsEditingTag] = useState(false);
const timerRef = useRef(null);

const normalizedTags = Array.isArray(tags) && typeof tags[0] === 'string'
? tags.map(t => ({ name: t, color: 'bg-warm-100 text-warm-600' }))
: (tags || []);

useEffect(() => {
if (!selectedTag && normalizedTags.length > 0) {
setSelectedTag(normalizedTags[0]);
}
}, [normalizedTags]);

useEffect(() => {
const saved = LocalDB.getTimerState();
if (saved) {
const savedTag = typeof saved.tag === 'string' ? { name: saved.tag, color: 'bg-warm-100 text-warm-600' } : saved.tag;
setSelectedTag(savedTag || normalizedTags[0]);

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
name: selectedTag?.name || '专注',
tagColor: selectedTag?.color,
duration: elapsed,
timestamp: Date.now()
});
}
setStatus('idle');
setElapsed(0);
LocalDB.saveTimerState(null);
};

const TagEditor = () => {
const [localTags, setLocalTags] = useState([...normalizedTags]);
const handleColorChange = (idx, color) => {
const newTags = [...localTags];
newTags[idx].color = color;
setLocalTags(newTags);
};
const handleNameChange = (idx, name) => {
const newTags = [...localTags];
newTags[idx].name = name;
setLocalTags(newTags);
};
const save = () => {
onSaveTags(localTags);
const currentSelected = localTags.find(t => t.name === selectedTag?.name) || localTags[0];
setSelectedTag(currentSelected);
setIsEditingTag(false);
};
return (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
<div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={() => setIsEditingTag(false)}></div>
<div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 p-5 border-4 border-paper">
<h3 className="text-lg font-bold text-ink mb-4">多彩标签</h3>
<div className="space-y-3 mb-4">
{localTags.map((t, i) => (
<div key={i} className="flex flex-col gap-2 p-2 border border-warm-100 rounded-xl">
<input className="font-bold text-ink border-b border-warm-200 outline-none w-full" value={t.name} onChange={e => handleNameChange(i, e.target.value)} />
<ColorPicker selected={t.color} onSelect={c => handleColorChange(i, c)} />
</div>
))}
</div>
<button onClick={save} className="w-full py-3 bg-warm-500 text-white rounded-xl font-bold shadow-md">保存</button>
</div>
</div>
);
};

if (!selectedTag) return null;

return (
<div className="space-y-6 pt-4">
<div className="relative flex flex-col items-center justify-center py-8">
<div className={`absolute w-64 h-64 bg-warm-100 rounded-full blur-3xl opacity-50 transition-all duration-1000 ${status === 'running' ? 'scale-110 opacity-70' : 'scale-100'}`}></div>
<div className={`relative z-10 w-64 h-64 bg-white rounded-full soft-shadow border-8 flex flex-col items-center justify-center transition-all duration-500 ${status === 'running' ? 'border-warm-300 animate-breathe' : 'border-warm-100'}`}>
<div className="mb-4 relative z-20">
<div className="flex flex-wrap justify-center gap-1 max-w-[180px] px-2">
<span className="text-xs font-bold text-ink/40 mb-1 block w-full text-center">当前专注</span>
<div className={`flex items-center gap-2 border px-3 py-1 rounded-full cursor-pointer transition-colors ${selectedTag.color.replace('text-', 'border-').replace('bg-', 'hover:bg-')} bg-white`} onClick={() => document.getElementById('tag-select').showModal()}>
<span className={`text-sm font-bold ${selectedTag.color.split(' ')[1]}`}>{selectedTag.name}</span>
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

<dialog id="tag-select" className="p-0 rounded-2xl backdrop:bg-ink/20 border-0 shadow-xl">
<div className="bg-white p-5 w-72">
<div className="flex justify-between items-center mb-3">
<h3 className="text-lg font-bold text-ink">选择标签</h3>
<button onClick={() => { document.getElementById('tag-select').close(); setIsEditingTag(true); }} className="text-xs text-warm-400 font-bold border border-warm-200 px-2 py-1 rounded">编辑</button>
</div>
<div className="flex flex-wrap gap-2 mb-4">
{normalizedTags.map(t => (
<button
key={t.name}
onClick={() => { setSelectedTag(t); document.getElementById('tag-select').close(); }}
className={`px-3 py-1.5 rounded-lg text-sm font-bold border-2 transition-colors ${selectedTag.name === t.name ? `bg-white border-current ${t.color.split(' ')[1]}` : 'bg-white border-warm-50 text-ink/60'}`}
>
{t.name}
</button>
))}
</div>
<button onClick={() => document.getElementById('tag-select').close()} className="mt-2 w-full py-2 bg-warm-50 text-warm-400 rounded-xl font-bold text-sm">关闭</button>
</div>
</dialog>

{isEditingTag && <TagEditor />}

<div className="bg-white rounded-3xl p-5 soft-shadow border border-warm-50">
<div className="flex justify-between items-end px-2 mb-4 border-b border-dashed border-warm-100 pb-2">
<h3 className="font-bold text-ink">今日时间流</h3>
<span className="text-xs font-bold text-warm-400">共 {formatDuration(logs.reduce((acc, curr) => acc + curr.duration, 0))}</span>
</div>
<div className="space-y-0 relative timeline-container">
{logs.length === 0 ? <div className="text-center py-8 text-warm-300 font-bold text-sm -ml-5">还没有留下脚印哦</div> : logs.map((log, index) => (
<div key={log.id} className="relative pl-6 pb-6 last:pb-0">
<div className={`timeline-dot ${log.tagColor ? log.tagColor.split(' ')[0] : 'bg-warm-100'}`}></div>
<div className="bg-paper p-3 rounded-2xl border border-warm-100 flex justify-between items-center group hover:border-warm-300 transition-colors">
<div className="flex-1">
<div className="flex items-center gap-2">
<span className="font-bold text-ink/80">{log.name}</span>
</div>
<div className="text-[10px] font-bold text-warm-300 mt-1">{new Date(log.timestamp).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'})}</div>
</div>
<div className="flex items-center gap-3">
<span className={`font-mono font-bold px-2 py-1 rounded-lg text-xs ${log.tagColor || 'bg-warm-100 text-warm-600'}`}>{formatDuration(log.duration)}</span>
<button onClick={() => onDeleteLog(log.id)} className="text-warm-200 hover:text-berry-500 p-2 transition-colors"><Icons.Trash /></button>
</div>
</div>
</div>
))}
</div>
</div>
</div>
);
};

const ReportModal = ({ currentDate, onClose, setToastMsg, settings }) => {
const [viewMode, setViewMode] = useState('calendar');
const [selectedDateData, setSelectedDateData] = useState(null);
const [calendarMonth, setCalendarMonth] = useState(new Date());
const [range, setRange] = useState(7);
const [stats, setStats] = useState(null);
const fileInputRef = useRef(null);
const allData = LocalDB.getAll();

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
settings.habits.forEach(h => {
if (data[h.id] >= h.max) score += 0.5;
});
const focusMin = (data.timeLogs || []).reduce((a,c)=>a+c.duration,0) / 60;
if (focusMin >= 60) score++;
return Math.min(Math.floor(score), 4);
};
const handleMonthChange = (d) => { const n = new Date(calendarMonth); n.setMonth(n.getMonth()+d); setCalendarMonth(n); setSelectedDateData(null); };
const handleDayClick = (d) => { if (d) setSelectedDateData(d); };

useEffect(() => {
if (viewMode === 'stats') {
const reportDays = [];
for (let i = 0; i < range; i++) {
const d = new Date(); d.setDate(d.getDate() - i);
const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
const dateStr = formatter.format(d);
if (allData[dateStr]) reportDays.push(allData[dateStr]);
}
const newStats = { days: reportDays.length, totalFocusTime: 0, habits: {} };
settings.habits.forEach(h => newStats.habits[h.id] = { total: 0, target: range * h.max });
reportDays.forEach(d => {
settings.habits.forEach(h => newStats.habits[h.id].total += (d[h.id] || 0));
if(d.timeLogs) d.timeLogs.forEach(l => newStats.totalFocusTime += l.duration);
});
setStats(newStats);
}
}, [viewMode, range]);

const handleExportCSV = () => {
let csvContent = "\uFEFF日期,总专注(h),详情\n";
Object.keys(allData).sort().reverse().forEach(date => {
const d = allData[date];
const focus = (d.timeLogs||[]).reduce((a,c)=>a+c.duration,0)/3600;
const details = (d.timeLogs||[]).map(l=>`${l.name}`).join('; ');
csvContent += `${date},${focus.toFixed(2)},"${details}"\n`;
});
downloadFile(csvContent, `Deonysus_Report.csv`, 'text/csv;charset=utf-8;');
setToastMsg("报表已生成");
};
const handleBackup = () => { downloadFile(JSON.stringify({logs:LocalDB.getAll(), settings:LocalDB.getSettings()}), 'backup.json', 'application/json'); setToastMsg("已备份"); };
const handleRestore = (e) => {
const reader = new FileReader();
reader.onload = e => { if(LocalDB.importData(e.target.result).success) window.location.reload(); else alert('失败'); };
reader.readAsText(e.target.files[0]);
};
const downloadFile = (c,n,t) => { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([c],{type:t})); a.download=n; a.click(); };

const getRate = (id) => (!stats || !stats.habits[id] || stats.habits[id].target === 0) ? 0 : Math.min(Math.round((stats.habits[id].total / stats.habits[id].target) * 100), 100);
const StatBox = ({ label, percent }) => (
<div className="bg-paper rounded-2xl p-3 flex flex-col items-center justify-center border-2 border-warm-100"><span className="text-xs font-bold text-warm-400 mb-1">{label}</span><span className={`text-xl font-bold ${percent >= 80 ? 'text-sage-500' : 'text-ink'}`}>{percent}%</span></div>
);

return (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
<div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose}></div>
<div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-[float_4s_ease-in-out_infinite] border-4 border-paper">
<div className="p-4 border-b-2 border-dashed border-warm-100 flex justify-between items-center bg-paper">
<div className="flex bg-warm-50 p-1 rounded-lg">
<button onClick={() => setViewMode('calendar')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode==='calendar' ? 'bg-white text-warm-600 shadow-sm' : 'text-warm-300'}`}>月历</button>
<button onClick={() => setViewMode('stats')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${viewMode==='stats' ? 'bg-white text-warm-600 shadow-sm' : 'text-warm-300'}`}>统计</button>
</div>
<button onClick={onClose} className="p-2 bg-white rounded-full text-warm-300 hover:text-warm-500"><Icons.X /></button>
</div>
<div className="p-5 overflow-y-auto">
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
{settings.habits.map(h => (
<div key={h.id} className="flex justify-between"><span>{h.label.split(' ')[0]} {h.label.split(' ')[1]}:</span> <b>{selectedDateData.data[h.id]||0}</b></div>
))}
<div className="flex justify-between pt-1 border-t border-dashed border-warm-200 mt-1"><span>⏱️ 专注:</span> <b>{formatSmartDuration((selectedDateData.data.timeLogs||[]).reduce((a,c)=>a+c.duration,0))}</b></div>
</div>
) : <p className="text-xs text-warm-400 text-center py-2">这一天是空白的呢。</p>}
</div>
)}
</>
)}
{viewMode === 'stats' && (
<>
<div className="flex p-2 bg-paper mb-4 rounded-xl border border-warm-100">{[7, 30].map(r => (<button key={r} onClick={() => setRange(r)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${range === r ? 'bg-white text-warm-600 shadow-sm border border-warm-100' : 'text-warm-300'}`}>近{r}天</button>))}</div>
{!stats ? <div className="text-center py-8 text-warm-300 font-bold">计算中...</div> : (
<div className="space-y-3">
<div className="grid grid-cols-2 gap-3">
{settings.habits.map(h => <StatBox key={h.id} label={h.label} percent={getRate(h.id)} />)}
</div>
<div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100"><div className="flex justify-between items-center mb-1"><span className="font-bold text-indigo-600">⏱️ 专注时光</span><span className="text-2xl font-bold text-indigo-500">{formatSmartDuration(stats.totalFocusTime)}</span></div></div>
</div>
)}
</>
)}
<div className="pt-4 border-t-2 border-dashed border-warm-100 mt-4">
<div className="grid grid-cols-2 gap-2">
<button onClick={handleExportCSV} className="py-2 bg-paper text-warm-600 border border-warm-200 rounded-xl font-bold text-xs active:bg-warm-50 flex items-center justify-center gap-1"><Icons.Download /> 导出 Excel</button>
<button onClick={handleBackup} className="py-2 bg-warm-100 text-warm-600 border border-warm-200 rounded-xl font-bold text-xs active:bg-warm-200 flex items-center justify-center gap-1"><Icons.Download /> 备份数据</button>
<button onClick={() => fileInputRef.current.click()} className="col-span-2 py-3 bg-white text-sage-600 border-2 border-sage-100 rounded-xl font-bold text-sm active:bg-sage-50 flex items-center justify-center gap-2"><Icons.Upload /> 恢复备份</button>
<input type="file" ref={fileInputRef} onChange={handleRestore} className="hidden" accept=".json" />
</div>
</div>
</div>
</div>
</div>
);
};

// ==========================================
// 4. 挂载应用 (放在最后)
// ==========================================
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);