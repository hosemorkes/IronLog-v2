// IronLog — Common Components & Theme

function getTheme(dark, accent) {
  const acc = accent || (dark ? '#7c6ef2' : '#5b4ff0');
  const accDark = dark ? '#7c6ef2' : '#5b4ff0';
  return {
    bg: dark ? '#111' : '#f2f2f2',
    bg2: dark ? '#1a1a1a' : '#fff',
    bg3: dark ? '#252525' : '#efefef',
    bg4: dark ? '#1e1e1e' : '#fafafa',
    border: dark ? '#232323' : '#e8e8e8',
    border2: dark ? '#1a1a1a' : '#f0f0f0',
    text: dark ? '#fff' : '#111',
    text2: dark ? '#888' : '#666',
    text3: dark ? '#555' : '#aaa',
    text4: dark ? '#444' : '#bbb',
    accent: acc,
    accentDark: accDark,
    accentBg: dark ? '#261f3d' : '#ebe8fb',
    accentBorder: dark ? '#3a2a6a' : '#c0b8f0',
    blue: '#5ba3d9',
    blueBg: dark ? '#1a2f40' : '#ddeef8',
    blueText: dark ? '#5ba3d9' : '#1a6fa8',
    green: dark ? '#5dcaa5' : '#1d9e75',
    greenBg: dark ? '#1e2e1e' : '#e6f4e6',
    greenBorder: dark ? '#2a3e2a' : '#b0d8b0',
    gold: dark ? '#e8a020' : '#b87010',
    goldBg: dark ? '#2a1f0d' : '#fef3e0',
    goldBorder: dark ? '#3d2e12' : '#f5d890',
    red: dark ? '#e06060' : '#c03030',
    redBg: dark ? '#2d1a1a' : '#fce8e8',
    redBorder: dark ? '#3d2020' : '#f0c0c0',
  };
}

function StatusBar({ dark, t }) {
  return (
    <div style={{
      height: 44, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 24px',
      background: t.bg, flexShrink: 0
    }}>
      <span style={{ color: t.text, fontSize: 15, fontWeight: 600 }}>9:41</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <svg width="16" height="12" viewBox="0 0 16 12" fill={t.text}><rect x="0" y="4" width="3" height="8" rx="0.5" opacity="0.4"/><rect x="4" y="2.5" width="3" height="9.5" rx="0.5" opacity="0.6"/><rect x="8" y="1" width="3" height="11" rx="0.5" opacity="0.8"/><rect x="12" y="0" width="3" height="12" rx="0.5"/></svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke={t.text} strokeWidth="1.2"><path d="M1 6 Q8 -1 15 6"/><path d="M3 8 Q8 3 13 8"/><circle cx="8" cy="11" r="1.2" fill={t.text}/></svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none"><rect x="0.5" y="0.5" width="21" height="11" rx="2.5" stroke={t.text} strokeOpacity="0.4"/><rect x="2" y="2" width="16" height="8" rx="1.5" fill={t.text}/><path d="M22.5 4.5 Q24 5.5 24 6 Q24 6.5 22.5 7.5" stroke={t.text} strokeOpacity="0.4" strokeWidth="1.2" strokeLinecap="round"/></svg>
      </div>
    </div>
  );
}

function BottomNav({ tab, setTab, hasActiveWorkout, t, dark }) {
  const tabs = [
    { id: 'exercises', label: 'Упражнения', icon: (active) => (
      <svg width="22" height="22" fill="none" stroke={active ? t.accent : t.text3} strokeWidth="1.8">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="12" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="12" width="7" height="7" rx="1.5"/><rect x="12" y="12" width="7" height="7" rx="1.5"/>
      </svg>
    )},
    { id: 'workout', label: 'Тренировка', icon: (active) => (
      <svg width="22" height="22" fill="none" stroke={active ? t.accent : t.text3} strokeWidth="1.8">
        <rect x="4" y="4" width="14" height="14" rx="2"/>
        <line x1="8" y1="4" x2="8" y2="18"/><line x1="4" y1="10" x2="18" y2="10"/>
      </svg>
    )},
    { id: 'progress', label: 'Прогресс', icon: (active) => (
      <svg width="22" height="22" fill="none" stroke={active ? t.accent : t.text3} strokeWidth="1.8">
        <polyline points="3,16 8,10 13,13 19,6"/>
      </svg>
    )},
    { id: 'profile', label: 'Профиль', icon: (active) => (
      <svg width="22" height="22" fill="none" stroke={active ? t.accent : t.text3} strokeWidth="1.8">
        <circle cx="11" cy="8" r="4"/><path d="M4 20 Q4 14 11 14 Q18 14 18 20"/>
      </svg>
    )},
  ];
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-around',
      padding: '10px 0 24px', flexShrink: 0,
      background: t.bg, borderTop: `1px solid ${t.border2}`,
    }}>
      {tabs.map(tb => {
        const active = tab === tb.id;
        return (
          <div key={tb.id} onClick={() => setTab(tb.id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer',
          }}>
            <div style={{ position: 'relative' }}>
              {tb.icon(active)}
              {tb.id === 'workout' && hasActiveWorkout && (
                <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: t.green, border: `1.5px solid ${t.bg}` }}/>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400, color: active ? t.accent : t.text3 }}>{tb.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function BackBtn({ onBack, t }) {
  return (
    <div onClick={onBack} style={{
      width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', background: t.bg3, flexShrink: 0
    }}>
      <svg width="16" height="16" fill="none" stroke={t.text2} strokeWidth="2"><polyline points="10,3 5,8 10,13"/></svg>
    </div>
  );
}

function Tag({ label, type, t }) {
  const styles = {
    muscle: { background: t.blueBg, color: t.blueText },
    equipment: { background: t.accentBg, color: t.accent },
    difficulty: { background: t.greenBg, color: t.green },
  };
  const s = styles[type] || styles.muscle;
  return (
    <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 500, ...s }}>{label}</span>
  );
}

function MuscleFigure({ muscleGroup, dark, t }) {
  const acc = t.accent;
  const blue = t.blue;
  const bodyFill = dark ? '#2a2a2a' : '#d8d8d8';
  const bodyStroke = dark ? '#444' : '#bbb';
  const bodyFill2 = dark ? '#222' : '#ccc';
  const isChest = muscleGroup === 'chest';
  const isBack = muscleGroup === 'back';
  const isShoulders = muscleGroup === 'shoulders';
  const isArms = muscleGroup === 'arms';
  const isLegs = muscleGroup === 'legs';
  const isCore = muscleGroup === 'core';

  return (
    <svg width="150" height="210" viewBox="0 0 150 210" fill="none">
      <ellipse cx="75" cy="22" rx="16" ry="18" fill={bodyFill} stroke={bodyStroke} strokeWidth="1"/>
      <rect x="69" y="38" width="12" height="10" rx="3" fill={bodyFill}/>
      <path d="M45 48 L35 100 L40 130 L110 130 L115 100 L105 48 Z" fill={isBack ? blue : bodyFill} stroke={bodyStroke} strokeWidth="1" opacity={isBack ? 0.45 : 1}/>
      <path d="M45 48 L35 100 L40 130 L110 130 L115 100 L105 48 Z" fill="none" stroke={bodyStroke} strokeWidth="1"/>
      <path d="M48 52 L75 62 L102 52 L105 78 L75 84 L45 78 Z" fill={isChest ? acc : 'transparent'} opacity={isChest ? 0.75 : 0}/>
      <rect x="60" y="88" width="30" height="38" rx="4" fill={isCore ? acc : bodyFill2} opacity={isCore ? 0.7 : 0.9}/>
      <path d="M55 48 L75 54 L95 48 L88 40 L75 42 L62 40 Z" fill={isBack ? acc : isShoulders ? blue : 'transparent'} opacity={isBack ? 0.6 : isShoulders ? 0.4 : 0}/>
      <ellipse cx="35" cy="58" rx="12" ry="16" fill={isShoulders ? acc : bodyFill} stroke={bodyStroke} strokeWidth="1" opacity={isShoulders ? 0.75 : 1}/>
      <ellipse cx="115" cy="58" rx="12" ry="16" fill={isShoulders ? acc : bodyFill} stroke={bodyStroke} strokeWidth="1" opacity={isShoulders ? 0.75 : 1}/>
      <rect x="24" y="72" width="14" height="28" rx="7" fill={isArms ? acc : bodyFill} stroke={bodyStroke} strokeWidth="1" opacity={isArms ? 0.8 : 1}/>
      <rect x="112" y="72" width="14" height="28" rx="7" fill={isArms ? acc : bodyFill} stroke={bodyStroke} strokeWidth="1" opacity={isArms ? 0.8 : 1}/>
      <rect x="22" y="100" width="12" height="24" rx="6" fill={isArms ? blue : bodyFill2} stroke={dark ? '#383838' : '#bbb'} strokeWidth="1" opacity={isArms ? 0.6 : 1}/>
      <rect x="116" y="100" width="12" height="24" rx="6" fill={isArms ? blue : bodyFill2} stroke={dark ? '#383838' : '#bbb'} strokeWidth="1" opacity={isArms ? 0.6 : 1}/>
      <rect x="46" y="130" width="24" height="48" rx="8" fill={isLegs ? acc : bodyFill} stroke={bodyStroke} strokeWidth="1" opacity={isLegs ? 0.75 : 1}/>
      <rect x="80" y="130" width="24" height="48" rx="8" fill={isLegs ? acc : bodyFill} stroke={bodyStroke} strokeWidth="1" opacity={isLegs ? 0.75 : 1}/>
      <rect x="48" y="178" width="18" height="28" rx="6" fill={isLegs ? blue : bodyFill2} stroke={dark ? '#383838' : '#bbb'} strokeWidth="1" opacity={isLegs ? 0.5 : 1}/>
      <rect x="84" y="178" width="18" height="28" rx="6" fill={isLegs ? blue : bodyFill2} stroke={dark ? '#383838' : '#bbb'} strokeWidth="1" opacity={isLegs ? 0.5 : 1}/>
      <rect x="4" y="185" width="10" height="10" rx="2" fill={acc} opacity="0.85"/>
      <text x="17" y="194" fontSize="9" fill={t.text3} fontFamily="sans-serif">основная</text>
      <rect x="4" y="200" width="10" height="10" rx="2" fill={blue} opacity="0.55"/>
      <text x="17" y="209" fontSize="9" fill={t.text3} fontFamily="sans-serif">вторичная</text>
    </svg>
  );
}

function Divider({ t }) {
  return <div style={{ height: 1, background: t.border2, margin: '0 0 18px' }}/>;
}

function SectionLabel({ label, action, onAction, t }) {
  return (
    <div style={{ padding: '4px 20px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: t.text3 }}>{label}</span>
      {action && <span onClick={onAction} style={{ fontSize: 12, fontWeight: 500, color: t.accent, cursor: 'pointer' }}>{action}</span>}
    </div>
  );
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2,'0');
  const s = (sec % 60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

Object.assign(window, { getTheme, StatusBar, BottomNav, BackBtn, Tag, MuscleFigure, Divider, SectionLabel, formatTime });
