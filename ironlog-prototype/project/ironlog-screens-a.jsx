// IronLog — Screens A: Dashboard, ExerciseLibrary, ExerciseCard, WorkoutBuilder

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function ScreenDashboard({ navigate, t, dark }) {
  const nextWorkout = WORKOUT_TEMPLATES[0];
  const maxT = Math.max(...WEEKLY_DATA.map(d => d.t));

  return (
    <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: t.bg }}>
        <div>
          <div style={{ fontSize: 13, color: t.text3, marginBottom: 2 }}>Доброе утро,</div>
          <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', color: t.text }}>
            Алексей <span style={{ color: t.accent }}>•</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20, background: t.goldBg, border: `1px solid ${t.goldBorder}` }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.gold }}>14 дней</span>
        </div>
      </div>

      {/* Quick stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '0 16px 14px' }}>
        {[
          { val: '3/4', lbl: 'Неделя', delta: '↑ отлично' },
          { val: '47', lbl: 'Тренировок', delta: '+3 в мес.' },
          { val: '18.4т', lbl: 'Тоннаж/нед.', delta: '↑ +12%' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '12px 10px', borderRadius: 14, background: t.bg2, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: t.text, letterSpacing: '-0.3px' }}>{s.val}</div>
            <div style={{ fontSize: 10, color: t.text3, marginTop: 1 }}>{s.lbl}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: t.green, marginTop: 3 }}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Next workout */}
      <SectionLabel label="Следующая тренировка" t={t} />
      <div onClick={() => navigate('workout-builder', { template: nextWorkout })} style={{
        margin: '0 16px 14px', padding: '16px', borderRadius: 16,
        background: `linear-gradient(135deg, ${dark ? '#1d1630' : '#ede9fb'} 0%, ${dark ? '#1a1a2e' : '#e4e0f8'} 100%)`,
        border: `1px solid ${t.accentBorder}`, cursor: 'pointer'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: t.accent, marginBottom: 4 }}>Сегодня · Понедельник</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: t.text }}>{nextWorkout.name}</div>
          </div>
          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: t.accentBg, color: t.accent, border: `1px solid ${t.accentBorder}` }}>{nextWorkout.tag}</span>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          {[
            `${nextWorkout.exercises.length} упр.`,
            `${nextWorkout.exercises.reduce((a, e) => a + e.sets.length, 0)} сетов`,
            '~55 мин',
          ].map((s, i) => (
            <span key={i} style={{ fontSize: 12, color: t.text2 }}>{s}</span>
          ))}
        </div>
        <div style={{
          padding: '12px 16px', borderRadius: 12, background: t.accent,
          textAlign: 'center', fontSize: 15, fontWeight: 700, color: '#fff'
        }}>Начать тренировку →</div>
      </div>

      {/* Weekly chart */}
      <SectionLabel label="Активность — 7 дней" t={t} />
      <div style={{ margin: '0 16px 14px', padding: 16, borderRadius: 16, background: t.bg2, border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 14 }}>Тоннаж по дням (кг)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 70, gap: 6 }}>
          {WEEKLY_DATA.map((d, i) => {
            const h = maxT > 0 ? Math.round((d.t / maxT) * 64) : 0;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ width: '100%', height: h || 3, borderRadius: '4px 4px 0 0', background: d.today ? t.green : d.active ? t.accent : t.bg3 }}/>
                <span style={{ fontSize: 10, fontWeight: 600, color: d.today ? t.green : d.active ? t.accent : t.text4 }}>{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent workout */}
      <SectionLabel label="Последняя тренировка" action="История →" onAction={() => navigate('log')} t={t} />
      {RECENT_WORKOUTS.slice(0, 1).map(w => (
        <div key={w.id} onClick={() => navigate('log')} style={{ margin: '0 16px 14px', padding: 14, borderRadius: 16, background: t.bg2, border: `1px solid ${t.border}`, cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{w.name}</div>
            <div style={{ fontSize: 12, color: t.text3 }}>{w.date}</div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            {[
              { v: w.duration, l: 'время' },
              { v: w.sets, l: 'сетов' },
              { v: `${w.tonnage.toLocaleString('ru')} кг`, l: 'тоннаж' },
            ].map((s, i) => (
              <div key={i}>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.accent }}>{s.v}</div>
                <div style={{ fontSize: 11, color: t.text3 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Program quick link */}
      <SectionLabel label="Программа" action="Открыть →" onAction={() => navigate('program')} t={t} />
      <div style={{ display: 'flex', gap: 10, padding: '0 16px 24px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {WORKOUT_TEMPLATES.map((wt, i) => (
          <div key={wt.id} onClick={() => navigate('workout-builder', { template: wt })} style={{
            flexShrink: 0, padding: '12px 14px', borderRadius: 14, background: t.bg2, border: `1px solid ${t.border}`,
            minWidth: 140, cursor: 'pointer'
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: t.accent, marginBottom: 4 }}>{['Пн · Ср · Пт','Вт · Чт','Сб'][i] || 'Пн'}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: t.text, lineHeight: 1.3 }}>{wt.name.split(' — ')[1] || wt.name}</div>
            <div style={{ fontSize: 11, color: t.text3, marginTop: 4 }}>{wt.exercises.length} упр.</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── EXERCISE LIBRARY ─────────────────────────────────────────────────────────
function ScreenExercises({ navigate, t, dark }) {
  const [search, setSearch] = React.useState('');
  const [filterGroup, setFilterGroup] = React.useState('Все');

  const filtered = EXERCISES.filter(ex => {
    const matchGroup = filterGroup === 'Все' || ex.group === filterGroup;
    const matchSearch = !search || ex.name.toLowerCase().includes(search.toLowerCase());
    return matchGroup && matchSearch;
  });

  const diffColor = { 'Начальный': t.green, 'Средний': t.gold, 'Сложный': t.red };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px 10px', background: t.bg, flexShrink: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: t.text, marginBottom: 10 }}>Упражнения</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: t.bg3 }}>
          <svg width="16" height="16" fill="none" stroke={t.text3} strokeWidth="2"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск упражнений..." style={{
            background: 'none', border: 'none', outline: 'none', fontSize: 14, color: t.text, width: '100%',
          }}/>
        </div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 16px 12px', flexShrink: 0, background: t.bg }}>
        {MUSCLE_GROUPS.map(g => {
          const active = filterGroup === g;
          return (
            <span key={g} onClick={() => setFilterGroup(g)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: active ? 600 : 400,
              cursor: 'pointer', transition: 'all .15s',
              background: active ? t.accent : t.bg3,
              color: active ? '#fff' : t.text2,
            }}>{g}</span>
          );
        })}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: 16 }}>
        {filtered.map((ex, i) => (
          <div key={ex.id} onClick={() => navigate('exercise-card', { exercise: ex })} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 20px', cursor: 'pointer',
            borderBottom: `1px solid ${t.border2}`,
            transition: 'background .1s',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: t.bg2, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ExerciseIcon group={ex.group} color={t.accent} size={22} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.text, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ex.name}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: t.blueText }}>{ex.group}</span>
                <span style={{ fontSize: 11, color: t.text3 }}>·</span>
                <span style={{ fontSize: 11, color: t.text3 }}>{ex.equipment}</span>
                <span style={{ fontSize: 11, color: t.text3 }}>·</span>
                <span style={{ fontSize: 11, color: diffColor[ex.difficulty] || t.text3 }}>{ex.difficulty}</span>
              </div>
            </div>
            <svg width="16" height="16" fill="none" stroke={t.text4} strokeWidth="1.8"><polyline points="6,4 10,8 6,12"/></svg>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: t.text3, fontSize: 14 }}>Ничего не найдено</div>
        )}
      </div>
    </div>
  );
}

function ExerciseIcon({ group, color, size }) {
  const s = size || 22;
  if (group === 'Грудь') return <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5"><rect x="4" y={s*0.45|0} width={s-8} height={s*0.4|0} rx="2"/><line x1="1" y1={s*0.6|0} x2="4" y2={s*0.6|0}/><line x1={s-4} y1={s*0.6|0} x2={s-1} y2={s*0.6|0}/></svg>;
  if (group === 'Спина') return <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5"><path d={`M3 ${s-4} L${s/2} 4 L${s-3} ${s-4}`}/><line x1={s*0.3|0} y1={s*0.6|0} x2={s*0.7|0} y2={s*0.6|0}/></svg>;
  if (group === 'Плечи') return <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5"><ellipse cx={s/2} cy={s/2} rx={s*0.35} ry={s*0.4}/><line x1="2" y1={s/2} x2={s-2} y2={s/2}/></svg>;
  if (group === 'Руки') return <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5"><path d={`M4 ${s-4} Q4 4 ${s/2} 4 Q${s-4} 4 ${s-4} ${s-4}`}/></svg>;
  if (group === 'Ноги') return <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5"><rect x={s*0.2|0} y="2" width={s*0.25|0} height={s-4} rx="4"/><rect x={s*0.55|0} y="2" width={s*0.25|0} height={s-4} rx="4"/></svg>;
  if (group === 'Пресс') return <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5"><rect x={s*0.3|0} y="2" width={s*0.4|0} height={s-4} rx="3"/><line x1={s*0.3|0} y1={s/2} x2={s*0.7|0} y2={s/2}/></svg>;
  return <svg width={s} height={s} fill="none" stroke={color} strokeWidth="1.5"><circle cx={s/2} cy={s/2} r={s*0.35}/><line x1={s/2} y1="2" x2={s/2} y2={s-2}/></svg>;
}

// ─── EXERCISE CARD ────────────────────────────────────────────────────────────
function ScreenExerciseCard({ navigate, goBack, params, t, dark }) {
  const ex = params.exercise || EXERCISES[0];

  return (
    <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
      {/* Hero */}
      <div style={{ position: 'relative', minHeight: 240, background: t.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div onClick={goBack} style={{
          position: 'absolute', top: 14, left: 16, width: 36, height: 36, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          background: dark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.7)', zIndex: 2
        }}>
          <svg width="18" height="18" fill="none" stroke={dark ? '#fff' : '#333'} strokeWidth="2"><polyline points="12,4 6,9 12,14"/></svg>
        </div>
        <div onClick={() => navigate('workout-builder', { template: null, addExercise: ex })} style={{
          position: 'absolute', top: 14, right: 16, padding: '6px 14px', borderRadius: 20,
          background: t.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', zIndex: 2
        }}>+ В тренировку</div>
        <MuscleFigure muscleGroup={ex.muscleGroup} dark={dark} t={t} />
      </div>

      {/* Content */}
      <div style={{ padding: '20px 20px 0', background: t.bg }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.3px', color: t.text, marginBottom: 10 }}>{ex.name}</div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
          <Tag label={ex.group} type="muscle" t={t} />
          <Tag label={ex.equipment} type="equipment" t={t} />
          <Tag label={ex.difficulty} type="difficulty" t={t} />
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[{ v: ex.sets, l: 'подходов' }, { v: ex.sessions, l: 'тренировок' }, { v: ex.tonnage > 0 ? ex.tonnage.toLocaleString('ru') : '—', l: 'кг тоннаж' }].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: 12, borderRadius: 12, background: t.bg2, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: t.accent, marginBottom: 2 }}>{s.v}</div>
              <div style={{ fontSize: 11, color: t.text3 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <Divider t={t} />

        {/* PR */}
        <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: t.text3, marginBottom: 10 }}>Личный рекорд</div>
        <div style={{ borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, background: t.bg2, border: `1px solid ${t.border}` }}>
          <div>
            <div style={{ fontSize: 12, color: t.text3, marginBottom: 2 }}>Лучший результат</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: t.text }}>{ex.pr}</div>
            <div style={{ fontSize: 12, color: t.text4, marginTop: 1 }}>{ex.prDate}</div>
          </div>
          <div style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: t.goldBg, color: t.gold, border: `1px solid ${t.goldBorder}` }}>🏆 PR</div>
        </div>

        <Divider t={t} />

        {/* Muscles */}
        <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: t.text3, marginBottom: 10 }}>Мышцы</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {ex.primary.map(m => (
            <span key={m} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500, border: `1.5px solid ${t.accentBorder}`, background: t.accentBg, color: t.accent }}>{m} (осн.)</span>
          ))}
          {ex.secondary.map(m => (
            <span key={m} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500, border: `1.5px solid ${t.border}`, background: t.bg3, color: t.text2 }}>{m}</span>
          ))}
        </div>

        <Divider t={t} />

        {/* Technique */}
        <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: t.text3, marginBottom: 10 }}>Техника выполнения</div>
        <div style={{ marginBottom: 20 }}>
          {ex.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: t.accent, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i+1}</div>
              <div style={{ fontSize: 14, lineHeight: 1.5, color: t.text2 }}>{step}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div onClick={() => navigate('workout-builder', { template: null, addExercise: ex })} style={{
          marginBottom: 28, padding: 16, borderRadius: 16, background: t.accent,
          fontSize: 16, fontWeight: 700, textAlign: 'center', cursor: 'pointer', color: '#fff'
        }}>Добавить в тренировку</div>
      </div>
    </div>
  );
}

// ─── WORKOUT BUILDER ──────────────────────────────────────────────────────────
function ScreenWorkoutBuilder({ navigate, goBack, params, t, dark, onStartWorkout }) {
  const tpl = params.template || WORKOUT_TEMPLATES[0];
  const [name, setName] = React.useState(tpl ? tpl.name : 'Новая тренировка');

  // items: {type:'single', ex, sets:[{w,r}], rest} | {type:'superset', ssId, items:[{ex,sets}], rest}
  const [items, setItems] = React.useState(() => {
    if (!tpl) return [];
    return tpl.exercises.map(e => {
      const ex = EXERCISES.find(x => x.id === e.exerciseId) || EXERCISES[0];
      return { type: 'single', ex, sets: e.sets.map(s => ({ w: s.w, r: s.r })), rest: e.rest };
    });
  });

  const allExCount = items.reduce((a, it) => a + (it.type === 'superset' ? it.items.length : 1), 0);
  const allSetCount = items.reduce((a, it) => it.type === 'single'
    ? a + it.sets.length
    : a + it.items[0].sets.length, 0);
  const estTonnage = items.reduce((a, it) => {
    if (it.type === 'single') return a + it.sets.reduce((b, s) => b + (s.w||0)*(s.r||0), 0);
    return a + it.items.reduce((b, si) => b + si.sets.reduce((c, s) => c + (s.w||0)*(s.r||0), 0), 0);
  }, 0);
  const estMin = Math.round(allSetCount * 2.5);

  const ssColor  = dark ? '#e8903b' : '#c06018';
  const ssBg     = dark ? 'rgba(232,144,59,0.10)' : 'rgba(192,96,24,0.07)';
  const ssBorder = dark ? 'rgba(232,144,59,0.28)' : 'rgba(192,96,24,0.22)';

  // ── mutations ──────────────────────────────────────────────────────────────
  const mergeSuperset = (i) => {
    setItems(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const a = copy[i], b = copy[i+1];
      const maxS = Math.max(
        a.type==='single' ? a.sets.length : a.items[0].sets.length,
        b.type==='single' ? b.sets.length : b.items[0].sets.length
      );
      const pad = (sets) => { const s=[...sets]; while(s.length<maxS) s.push({...s[s.length-1]||{w:0,r:8}}); return s; };
      const aItems = a.type==='single' ? [{ex:a.ex, sets:pad(a.sets)}] : a.items.map(si=>({...si, sets:pad(si.sets)}));
      const bItems = b.type==='single' ? [{ex:b.ex, sets:pad(b.sets)}] : b.items.map(si=>({...si, sets:pad(si.sets)}));
      const ss = { type:'superset', ssId: Date.now(), items:[...aItems,...bItems], rest: Math.max(a.rest||90, b.rest||90) };
      copy.splice(i, 2, ss);
      return copy;
    });
  };

  const ungroupSuperset = (i) => {
    setItems(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const ss = copy[i];
      const singles = ss.items.map(si => ({ type:'single', ex:si.ex, sets:si.sets, rest:ss.rest }));
      copy.splice(i, 1, ...singles);
      return copy;
    });
  };

  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));

  const removeSSItem = (i, si) => {
    setItems(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      const ss = copy[i];
      if (ss.items.length <= 2) {
        const keep = ss.items.filter((_,idx)=>idx!==si);
        copy.splice(i, 1, { type:'single', ex:keep[0].ex, sets:keep[0].sets, rest:ss.rest });
      } else {
        ss.items = ss.items.filter((_,idx)=>idx!==si);
      }
      return copy;
    });
  };

  const addSet = (i, isSS) => {
    setItems(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!isSS) {
        const last = copy[i].sets.slice(-1)[0] || {w:0,r:8};
        copy[i].sets.push({...last});
      } else {
        // add to ALL ss exercises (keep rounds equal)
        copy[i].items.forEach(si => {
          const last = si.sets.slice(-1)[0] || {w:0,r:8};
          si.sets.push({...last});
        });
      }
      return copy;
    });
  };

  const removeSet = (i, sIdx, siIdx) => {
    setItems(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (siIdx === undefined) {
        if (copy[i].sets.length <= 1) return prev;
        copy[i].sets.splice(sIdx, 1);
      } else {
        if (copy[i].items[0].sets.length <= 1) return prev;
        copy[i].items.forEach(si => si.sets.splice(sIdx, 1));
      }
      return copy;
    });
  };

  const updateSet = (i, sIdx, field, val, siIdx) => {
    setItems(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (siIdx === undefined) copy[i].sets[sIdx][field] = parseFloat(val)||0;
      else copy[i].items[siIdx].sets[sIdx][field] = parseFloat(val)||0;
      return copy;
    });
  };

  const setRest = (i, r) => setItems(prev => { const c=JSON.parse(JSON.stringify(prev)); c[i].rest=r; return c; });

  // ── sub-renderers ──────────────────────────────────────────────────────────
  const SetsTable = ({ sets, onUpdate, onRemove, showAddSet, onAddSet }) => (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'28px 1fr 1fr 32px', gap:6, padding:'4px 14px 3px' }}>
        {['#','Вес (кг)','Повторы',''].map((h,i)=>(
          <span key={i} style={{ fontSize:11, fontWeight:600, color:t.text4, textAlign:'center' }}>{h}</span>
        ))}
      </div>
      {sets.map((set, sIdx) => (
        <div key={sIdx} style={{ display:'grid', gridTemplateColumns:'28px 1fr 1fr 32px', gap:6, padding:'5px 14px', background: sIdx%2===0 ? t.bg4 : 'transparent', alignItems:'center' }}>
          <span style={{ fontSize:13, fontWeight:600, textAlign:'center', color:t.text3 }}>{sIdx+1}</span>
          <input value={set.w} onChange={e=>onUpdate(sIdx,'w',e.target.value)} style={{ textAlign:'center', padding:'6px 4px', borderRadius:8, fontSize:14, fontWeight:600, border:'none', outline:'none', background:t.bg3, color:t.text, width:'100%' }}/>
          <input value={set.r} onChange={e=>onUpdate(sIdx,'r',e.target.value)} style={{ textAlign:'center', padding:'6px 4px', borderRadius:8, fontSize:14, fontWeight:600, border:'none', outline:'none', background:t.bg3, color:t.text, width:'100%' }}/>
          <div onClick={()=>onRemove(sIdx)} style={{ display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', opacity:0.45 }}>
            <svg width="14" height="14" fill="none" stroke={t.text2} strokeWidth="2"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>
          </div>
        </div>
      ))}
      {showAddSet && (
        <div style={{ padding:'8px 14px 8px' }}>
          <div onClick={onAddSet} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:8, borderRadius:10, cursor:'pointer', fontSize:12, fontWeight:500, color:t.text3, border:`1.5px dashed ${t.border}` }}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/></svg>
            Добавить сет
          </div>
        </div>
      )}
    </>
  );

  const RestRow = ({ rest, onSet, label, color, bg }) => (
    <div style={{ padding:'8px 14px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', background: bg||'transparent' }}>
      <span style={{ fontSize:12, color: color||t.text3 }}>{label||'Отдых'}</span>
      <div style={{ display:'flex', gap:6 }}>
        {[60,90,120].map(r => {
          const active = rest===r;
          return (
            <span key={r} onClick={()=>onSet(r)} style={{ padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:500, cursor:'pointer',
              background: active ? (color||t.accent) : t.bg3,
              color: active ? '#fff' : t.text3,
            }}>{r}с</span>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'14px 20px 10px', display:'flex', alignItems:'center', justifyContent:'space-between', background:t.bg, borderBottom:`1px solid ${t.border2}`, flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <BackBtn onBack={goBack} t={t} />
          <span style={{ fontSize:17, fontWeight:700, color:t.text }}>Конструктор</span>
        </div>
        <div style={{ padding:'7px 16px', borderRadius:20, background:t.accent, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' }}>Сохранить</div>
      </div>

      <div style={{ flex:1, overflowY:'auto', scrollbarWidth:'none' }}>
        {/* Name */}
        <div style={{ padding:'14px 20px 0' }}>
          <input value={name} onChange={e=>setName(e.target.value)} style={{ width:'100%', padding:'12px 14px', borderRadius:12, fontSize:18, fontWeight:600, border:'none', outline:'none', background:t.bg2, color:t.text, caretColor:t.accent }}/>
        </div>

        <div style={{ padding:'18px 20px 6px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.8px', color:t.text3 }}>Упражнения</span>
          <span style={{ fontSize:12, color:t.text4 }}>{allExCount} упр · {allSetCount} раундов</span>
        </div>

        {items.map((item, itemIdx) => (
          <React.Fragment key={item.ssId || itemIdx}>

            {/* ── SINGLE ── */}
            {item.type === 'single' && (
              <div style={{ margin:'0 16px 4px', borderRadius:16, overflow:'hidden', background:t.bg2, border:`1px solid ${t.border}` }}>
                <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:40, height:40, borderRadius:10, background:t.bg3, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <ExerciseIcon group={item.ex.group} color={t.accent} size={20}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, fontWeight:600, color:t.text }}>{item.ex.name}</div>
                    <div style={{ fontSize:12, color:t.text3, marginTop:2 }}>{item.ex.group} · {item.ex.equipment}</div>
                  </div>
                  <div onClick={()=>removeItem(itemIdx)} style={{ cursor:'pointer', padding:6, opacity:0.5 }}>
                    <svg width="14" height="14" fill="none" stroke={t.text2} strokeWidth="2"><line x1="2" y1="2" x2="12" y2="12"/><line x1="12" y1="2" x2="2" y2="12"/></svg>
                  </div>
                </div>
                <SetsTable
                  sets={item.sets}
                  onUpdate={(sIdx,f,v) => updateSet(itemIdx,sIdx,f,v)}
                  onRemove={(sIdx) => removeSet(itemIdx,sIdx)}
                  showAddSet={true}
                  onAddSet={() => addSet(itemIdx, false)}
                />
                <RestRow rest={item.rest} onSet={r=>setRest(itemIdx,r)} label="Отдых между сетами"/>
              </div>
            )}

            {/* ── SUPERSET ── */}
            {item.type === 'superset' && (
              <div style={{ margin:'0 16px 4px', borderRadius:16, overflow:'hidden', border:`1.5px solid ${ssBorder}`, background:t.bg2 }}>
                {/* SS badge header */}
                <div style={{ padding:'10px 14px', background:ssBg, display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:`1px solid ${ssBorder}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:24, height:24, borderRadius:7, background:ssColor, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M2 2 Q2 7 7 7 Q12 7 12 2"/>
                        <path d="M2 12 Q2 7 7 7 Q12 7 12 12"/>
                      </svg>
                    </div>
                    <span style={{ fontSize:13, fontWeight:700, color:ssColor }}>Суперсет</span>
                    <span style={{ fontSize:11, color:ssBorder, fontWeight:500 }}>{item.items.length} упр · {item.items[0].sets.length} раундов</span>
                  </div>
                  <span onClick={()=>ungroupSuperset(itemIdx)} style={{ fontSize:11, fontWeight:600, color:ssColor, cursor:'pointer', padding:'3px 10px', borderRadius:20, border:`1px solid ${ssBorder}` }}>Разделить</span>
                </div>

                {/* Each exercise in superset */}
                {item.items.map((si, siIdx) => (
                  <div key={siIdx} style={{ borderBottom: siIdx < item.items.length-1 ? `1px solid ${ssBorder}` : 'none' }}>
                    {/* Exercise row header */}
                    <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:22, height:22, borderRadius:6, background:ssColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'#fff', flexShrink:0 }}>
                        {String.fromCharCode(65+siIdx)}
                      </div>
                      <div style={{ width:34, height:34, borderRadius:9, background:t.bg3, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <ExerciseIcon group={si.ex.group} color={t.accent} size={17}/>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:t.text }}>{si.ex.name}</div>
                        <div style={{ fontSize:11, color:t.text3, marginTop:1 }}>{si.ex.group} · {si.ex.equipment}</div>
                      </div>
                      <div onClick={()=>removeSSItem(itemIdx,siIdx)} style={{ cursor:'pointer', padding:5, opacity:0.5 }}>
                        <svg width="13" height="13" fill="none" stroke={t.text2} strokeWidth="2"><line x1="2" y1="2" x2="11" y2="11"/><line x1="11" y1="2" x2="2" y2="11"/></svg>
                      </div>
                    </div>
                    <SetsTable
                      sets={si.sets}
                      onUpdate={(sIdx,f,v) => updateSet(itemIdx,sIdx,f,v,siIdx)}
                      onRemove={(sIdx) => removeSet(itemIdx,sIdx,siIdx)}
                      showAddSet={siIdx === item.items.length-1}
                      onAddSet={() => addSet(itemIdx, true)}
                    />
                  </div>
                ))}

                {/* SS rest */}
                <RestRow rest={item.rest} onSet={r=>setRest(itemIdx,r)} label="Отдых после раунда" color={ssColor} bg={ssBg}/>
              </div>
            )}

            {/* ── Merge button between items ── */}
            {itemIdx < items.length - 1 && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:30 }}>
                <div onClick={()=>mergeSuperset(itemIdx)} style={{
                  display:'flex', alignItems:'center', gap:5, padding:'4px 14px', borderRadius:20,
                  cursor:'pointer', fontSize:11, fontWeight:700,
                  background:ssBg, color:ssColor, border:`1px solid ${ssBorder}`,
                  transition:'all .15s',
                }}>
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M2 2 Q2 7 7 7 Q12 7 12 2"/>
                    <path d="M2 12 Q2 7 7 7 Q12 7 12 12"/>
                  </svg>
                  Объединить в суперсет
                </div>
              </div>
            )}

          </React.Fragment>
        ))}

        {/* Add exercise */}
        <div style={{ padding:'8px 16px 16px' }}>
          <div onClick={()=>navigate('exercises')} style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:14, borderRadius:14, cursor:'pointer', fontSize:15, fontWeight:600, color:t.text3, border:`2px dashed ${t.border}` }}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><line x1="9" y1="2" x2="9" y2="16"/><line x1="2" y1="9" x2="16" y2="9"/></svg>
            Добавить упражнение
          </div>
        </div>

        {/* Summary */}
        <SectionLabel label="Итого" t={t} />
        <div style={{ margin:'0 16px 20px', padding:'12px 16px', borderRadius:14, background:t.bg2, display:'flex', justifyContent:'space-around' }}>
          {[{v:allExCount,l:'упражнения'},{v:allSetCount,l:'раундов'},{v:`~${estMin}`,l:'мин'},{v:`~${Math.round(estTonnage/100)*100}`,l:'кг тонн.'}].map((s,i)=>(
            <div key={i} style={{ textAlign:'center' }}>
              <div style={{ fontSize:16, fontWeight:700, color:t.accent }}>{s.v}</div>
              <div style={{ fontSize:11, color:t.text3, marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div onClick={()=>onStartWorkout({ name, exercises: items })} style={{ margin:'0 16px 28px', padding:16, borderRadius:16, background:t.accent, fontSize:16, fontWeight:700, textAlign:'center', cursor:'pointer', color:'#fff' }}>
          Начать тренировку
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScreenDashboard, ScreenExercises, ScreenExerciseCard, ScreenWorkoutBuilder, ExerciseIcon });
