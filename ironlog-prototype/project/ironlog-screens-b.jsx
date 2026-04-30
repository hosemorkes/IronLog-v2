// IronLog — Screens B: ActiveWorkout, Progress, Profile, WorkoutLog, Program

// ─── ACTIVE WORKOUT ───────────────────────────────────────────────────────────
function ScreenActiveWorkout({ navigate, goBack, params, t, dark, onFinishWorkout, showToast }) {
  const workout = params.workout;
  const ssColor  = dark ? '#e8903b' : '#c06018';
  const ssBg     = dark ? 'rgba(232,144,59,0.10)' : 'rgba(192,96,24,0.07)';
  const ssBorder = dark ? 'rgba(232,144,59,0.28)' : 'rgba(192,96,24,0.22)';

  // Flatten workout items into steps
  const steps = React.useMemo(() => {
    const result = [];
    (workout.exercises || []).forEach(item => {
      if (item.type === 'single') {
        item.sets.forEach((set, sIdx) => {
          result.push({ type: 'single', item, sIdx, w: set.w, r: set.r });
        });
      } else if (item.type === 'superset') {
        const rounds = item.items[0].sets.length;
        for (let round = 0; round < rounds; round++) {
          item.items.forEach((si, siIdx) => {
            result.push({
              type: 'ss',
              item,
              si,
              siIdx,
              round,
              rounds,
              isLastInRound: siIdx === item.items.length - 1,
              w: si.sets[round].w,
              r: si.sets[round].r,
            });
          });
        }
      }
    });
    return result;
  }, [workout]);

  const totalSteps = steps.length;

  const [elapsed, setElapsed] = React.useState(0);
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [completedIdx, setCompletedIdx] = React.useState([]);
  const [restActive, setRestActive] = React.useState(false);
  const [restRemaining, setRestRemaining] = React.useState(0);
  const [finished, setFinished] = React.useState(false);

  React.useEffect(() => {
    const iv = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(iv);
  }, []);

  React.useEffect(() => {
    if (!restActive || restRemaining <= 0) { if (restActive && restRemaining <= 0) setRestActive(false); return; }
    const iv = setInterval(() => setRestRemaining(r => { if (r <= 1) { setRestActive(false); return 0; } return r - 1; }), 1000);
    return () => clearInterval(iv);
  }, [restActive, restRemaining]);

  const curStep = steps[currentIdx];
  const restGoal = curStep?.item?.rest || 90;

  const tonnageDone = completedIdx.reduce((a, idx) => {
    const s = steps[idx];
    if (!s) return a;
    return a + (s.w || 0) * (s.r || 0);
  }, 0);

  const handleDone = () => {
    if (currentIdx >= totalSteps) return;
    const newCompleted = [...completedIdx, currentIdx];
    setCompletedIdx(newCompleted);

    const next = currentIdx + 1;
    if (next >= totalSteps) { setFinished(true); return; }

    const cur = steps[currentIdx];
    const showRest = cur.type === 'single' || (cur.type === 'ss' && cur.isLastInRound);

    setCurrentIdx(next);
    if (showRest) {
      const rest = cur.item.rest || 90;
      setRestRemaining(rest);
      setRestActive(true);
    }
  };

  const skipRest = () => { setRestActive(false); setRestRemaining(0); };

  // Completion screen
  if (finished) {
    const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

    const buildExportText = () => {
      const lines = [];
      lines.push(`💪 IronLog — ${workout.name}`);
      lines.push(`📅 ${today} · ⏱ ${formatTime(elapsed)}`);
      lines.push('');
      (workout.exercises || []).forEach(item => {
        if (item.type === 'single') {
          lines.push(`📌 ${item.ex.name}`);
          item.sets.forEach((s, i) => lines.push(`   Сет ${i+1}: ${s.w} кг × ${s.r} повт.`));
        } else if (item.type === 'superset') {
          lines.push(`🔗 Суперсет (${item.items.length} упр.)`);
          item.items.forEach((si, siIdx) => {
            lines.push(`   ${String.fromCharCode(65+siIdx)}. ${si.ex.name}`);
            si.sets.forEach((s, i) => lines.push(`      Раунд ${i+1}: ${s.w} кг × ${s.r} повт.`));
          });
        }
        lines.push('');
      });
      lines.push(`📊 Итого: ${totalSteps} сетов · ${tonnageDone.toLocaleString('ru')} кг тоннаж`);
      lines.push('—');
      lines.push('Отправлено из IronLog 🏋️');
      return lines.join('\n');
    };

    const handleCopy = () => {
      const text = buildExportText();
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => showToast?.('✅ Скопировано в буфер')).catch(() => {
          fallbackCopy(text);
        });
      } else {
        fallbackCopy(text);
      }
    };

    const fallbackCopy = (text) => {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast?.('✅ Скопировано в буфер');
    };

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, background: t.bg }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🏆</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: t.text, marginBottom: 6, textAlign: 'center' }}>Тренировка завершена!</div>
        <div style={{ fontSize: 15, color: t.text2, marginBottom: 28, textAlign: 'center' }}>Отличная работа!</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', marginBottom: 24 }}>
          {[
            { v: formatTime(elapsed), l: 'Время' },
            { v: totalSteps, l: 'Сетов/раундов' },
            { v: `${tonnageDone.toLocaleString('ru')} кг`, l: 'Тоннаж' },
            { v: (workout.exercises||[]).length, l: 'Упражнений' },
          ].map((s, i) => (
            <div key={i} style={{ padding: 16, borderRadius: 16, background: t.bg2, border: `1px solid ${t.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: t.accent }}>{s.v}</div>
              <div style={{ fontSize: 12, color: t.text3, marginTop: 3 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Export block */}
        <div style={{ width: '100%', borderRadius: 16, overflow: 'hidden', background: t.bg2, border: `1px solid ${t.border}`, marginBottom: 16 }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${t.border2}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: t.text3, marginBottom: 2 }}>Поделиться тренировкой</div>
            <div style={{ fontSize: 12, color: t.text4 }}>Скопируй и отправь в Telegram, заметки или куда угодно</div>
          </div>
          {/* Preview */}
          <div style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11, color: t.text3, lineHeight: 1.6, maxHeight: 120, overflow: 'hidden', position: 'relative' }}>
            <div>{`💪 IronLog — ${workout.name}`}</div>
            <div>{`📅 ${today} · ⏱ ${formatTime(elapsed)}`}</div>
            {(workout.exercises||[]).slice(0,2).map((item, i) => (
              <div key={i}>{item.type==='single' ? `📌 ${item.ex.name}` : `🔗 Суперсет (${item.items.length} упр.)`}</div>
            ))}
            {(workout.exercises||[]).length > 2 && <div style={{ color: t.text4 }}>… и ещё {(workout.exercises.length-2)} упражнения</div>}
            <div>{`📊 Итого: ${totalSteps} сетов · ${tonnageDone.toLocaleString('ru')} кг тоннаж`}</div>
            {/* fade */}
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height:32, background:`linear-gradient(transparent, ${t.bg2})` }}/>
          </div>
          <div onClick={handleCopy} style={{ margin: '0 12px 12px', padding: '12px 0', borderRadius: 12, background: t.accentBg, border: `1px solid ${t.accentBorder}`, textAlign: 'center', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: t.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="2" width="9" height="12" rx="2"/><rect x="2" y="5" width="9" height="12" rx="2"/></svg>
            Скопировать для Telegram
          </div>
        </div>

        <div onClick={onFinishWorkout} style={{ width: '100%', padding: 16, borderRadius: 16, background: t.accent, color: '#fff', fontSize: 16, fontWeight: 700, textAlign: 'center', cursor: 'pointer' }}>Готово</div>
      </div>
    );
  }

  const isSSStep = curStep?.type === 'ss';
  const ssRound  = isSSStep ? curStep.round + 1 : 0;
  const ssRounds = isSSStep ? curStep.rounds : 0;

  // Build sets table for current item
  const curSets = isSSStep ? curStep.si.sets : curStep?.item?.sets || [];
  // Global step idx for each set row of current exercise
  const setStepIndices = steps.reduce((acc, s, idx) => {
    const key = isSSStep ? `ss-${curStep.item.ssId}-si${curStep.siIdx}-r${s.round}` : null;
    return acc;
  }, {});

  const ringCirc = 163;
  const restPct = restGoal > 0 ? restRemaining / restGoal : 0;
  const ringOffset = ringCirc * (1 - restPct);

  // For SS: find steps of same round to show progress A→B→C
  const roundSteps = isSSStep
    ? steps.filter(s => s.type === 'ss' && s.item === curStep.item && s.round === curStep.round)
    : [];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{ padding: '10px 20px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: t.bg, flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 11, color: t.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>В процессе</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{workout.name}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ padding: '4px 12px', borderRadius: 20, background: t.accentBg, fontSize: 13, fontWeight: 700, color: t.accent }}>⏱ {formatTime(elapsed)}</div>
          <div onClick={() => { if (window.confirm('Завершить тренировку?')) onFinishWorkout(); }} style={{ padding: '5px 12px', borderRadius: 20, background: t.redBg, color: t.red, border: `1px solid ${t.redBorder}`, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Завершить</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 20px 12px', flexShrink: 0 }}>
        <div style={{ height: 4, borderRadius: 2, background: t.bg3, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 2, background: t.accent, width: `${(completedIdx.length / totalSteps) * 100}%`, transition: 'width .4s' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontSize: 11, color: t.text4 }}>Шаг {completedIdx.length + 1} из {totalSteps}</span>
          <span style={{ fontSize: 11, color: t.text4 }}>{(workout.exercises||[]).length} упр.</span>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>

        {/* SS Round indicator */}
        {isSSStep && (
          <div style={{ margin: '0 16px 10px', padding: '10px 14px', borderRadius: 14, background: ssBg, border: `1px solid ${ssBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, background: ssColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M2 2 Q2 7 7 7 Q12 7 12 2"/><path d="M2 12 Q2 7 7 7 Q12 7 12 12"/>
                </svg>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: ssColor }}>Суперсет · Раунд {ssRound}/{ssRounds}</span>
            </div>
            {/* A → B → C chain */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {roundSteps.map((s, i) => {
                const globalIdx = steps.indexOf(s);
                const done = completedIdx.includes(globalIdx);
                const isCur = globalIdx === currentIdx;
                return (
                  <React.Fragment key={i}>
                    {i > 0 && <span style={{ fontSize: 10, color: ssBorder }}>→</span>}
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: done ? ssColor : (isCur ? 'transparent' : t.bg3),
                      border: isCur ? `2px solid ${ssColor}` : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800,
                      color: done ? '#fff' : (isCur ? ssColor : t.text4),
                    }}>{String.fromCharCode(65 + i)}</div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* Current exercise card */}
        {curStep && (
          <div style={{ margin: '0 16px 12px', padding: 14, borderRadius: 16, background: t.bg2, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 46, height: 46, borderRadius: 12, background: t.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ExerciseIcon group={(isSSStep ? curStep.si.ex : curStep.item.ex).group} color={isSSStep ? ssColor : t.accent} size={24}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: t.text3, marginBottom: 2 }}>
                {isSSStep ? `Упражнение ${String.fromCharCode(65 + curStep.siIdx)}` : 'Сейчас'}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {isSSStep ? curStep.si.ex.name : curStep.item.ex.name}
              </div>
              <div style={{ fontSize: 12, color: t.text3, marginTop: 1 }}>
                {isSSStep ? `${curStep.si.ex.group} · ${curStep.si.ex.equipment}` : `${curStep.item.ex.group} · ${curStep.item.ex.equipment}`}
              </div>
            </div>
            {isSSStep && !curStep.isLastInRound && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: ssColor, fontWeight: 600 }}>без отдыха</div>
                <div style={{ fontSize: 10, color: t.text4, marginTop: 1 }}>→ {String.fromCharCode(65 + curStep.siIdx + 1)} далее</div>
              </div>
            )}
          </div>
        )}

        {/* Sets table for current exercise */}
        <div style={{ margin: '0 16px 12px', borderRadius: 16, overflow: 'hidden', background: t.bg2, border: `1px solid ${t.border}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr 44px', gap: 6, padding: '8px 14px 6px' }}>
            {['#', 'Вес (кг)', 'Повторы', 'Пред.', ''].map((h, i) => (
              <span key={i} style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', color: t.text4 }}>{h}</span>
            ))}
          </div>
          {curSets.map((set, sIdx) => {
            // Find global step index for this row
            const globalIdx = steps.findIndex(s => {
              if (isSSStep) return s.type === 'ss' && s.item === curStep.item && s.siIdx === curStep.siIdx && s.round === sIdx;
              return s.type === 'single' && s.item === curStep.item && s.sIdx === sIdx;
            });
            const done = completedIdx.includes(globalIdx);
            const isActive = globalIdx === currentIdx;
            return (
              <div key={sIdx} style={{
                display: 'grid', gridTemplateColumns: '28px 1fr 1fr 1fr 44px', gap: 6,
                padding: '7px 14px', alignItems: 'center',
                opacity: done ? 0.4 : 1,
                background: isActive ? (dark ? '#1d1d2e' : '#f0effe') : (sIdx % 2 === 0 ? t.bg4 : 'transparent'),
                borderLeft: isActive ? `3px solid ${isSSStep ? ssColor : t.accent}` : '3px solid transparent',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', color: isActive ? (isSSStep ? ssColor : t.accent) : t.text3 }}>{sIdx + 1}</span>
                <div style={{ textAlign: 'center', padding: '6px 4px', borderRadius: 8, fontSize: 14, fontWeight: 700, color: t.text, background: isActive ? t.bg3 : 'transparent', border: isActive ? `1.5px solid ${isSSStep ? ssBorder : t.accentBorder}` : 'none' }}>{set.w}</div>
                <div style={{ textAlign: 'center', padding: '6px 4px', borderRadius: 8, fontSize: 14, fontWeight: 700, color: t.text, background: isActive ? t.bg3 : 'transparent', border: isActive ? `1.5px solid ${isSSStep ? ssBorder : t.accentBorder}` : 'none' }}>{set.r}</div>
                <div style={{ textAlign: 'center', fontSize: 13, color: t.text4 }}>{set.w}×{set.r}</div>
                <div onClick={() => { if (isActive) handleDone(); }} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 32, borderRadius: 8,
                  cursor: isActive ? 'pointer' : 'default',
                  background: done ? t.greenBg : (isActive ? t.greenBg : t.bg3),
                  border: `1px solid ${done || isActive ? t.greenBorder : t.border}`,
                  color: done || isActive ? t.green : t.text4,
                  fontSize: 14, fontWeight: 700,
                }}>✓</div>
              </div>
            );
          })}
        </div>

        {/* Rest timer */}
        {restActive && (
          <div style={{ margin: '0 16px 12px', padding: '16px 18px', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: dark ? '#1a1420' : '#f0effe', border: `1px solid ${t.accentBorder}` }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: t.accent, marginBottom: 4 }}>Отдых</div>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-1px', color: t.accent }}>{formatTime(restRemaining)}</div>
              <div style={{ fontSize: 12, marginTop: 2, color: dark ? '#554d70' : '#9b8dd0' }}>Цель: {restGoal}с</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ position: 'relative', width: 58, height: 58 }}>
                <svg width="58" height="58" viewBox="0 0 60 60" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="30" cy="30" r="26" fill="none" strokeWidth="4" stroke={dark ? '#2a2040' : '#d0c8f8'}/>
                  <circle cx="30" cy="30" r="26" fill="none" strokeWidth="4" stroke={t.accent} strokeLinecap="round" strokeDasharray={ringCirc} strokeDashoffset={ringOffset} style={{ transition: 'stroke-dashoffset 1s linear' }}/>
                </svg>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 11, fontWeight: 700, color: t.accent }}>{Math.round(restPct * 100)}%</div>
              </div>
              <div onClick={skipRest} style={{ fontSize: 11, fontWeight: 600, color: t.accent, cursor: 'pointer', padding: '3px 10px', borderRadius: 20, background: t.accentBg }}>Пропустить</div>
            </div>
          </div>
        )}

        {/* Mini stats */}
        <div style={{ display: 'flex', gap: 10, padding: '0 16px', marginBottom: 12 }}>
          {[
            { v: formatTime(elapsed), l: 'время' },
            { v: `${tonnageDone.toLocaleString('ru')} кг`, l: 'тоннаж' },
            { v: `${completedIdx.length}/${totalSteps}`, l: 'шаги' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: 10, borderRadius: 12, background: t.bg2, textAlign: 'center', border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.accent }}>{s.v}</div>
              <div style={{ fontSize: 10, color: t.text4, marginTop: 2 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Next peek */}
        {steps[currentIdx + 1] && (() => {
          const next = steps[currentIdx + 1];
          const nextEx = next.type === 'ss' ? next.si.ex : next.item.ex;
          const isNextSS = next.type === 'ss';
          return (
            <div style={{ margin: '0 16px 12px', padding: '10px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10, background: t.bg2, border: `1px solid ${t.border}` }}>
              <svg width="14" height="14" fill="none" stroke={t.text4} strokeWidth="2"><polyline points="4,7 10,7"/><polyline points="7,4 10,7 7,10"/></svg>
              <div>
                <div style={{ fontSize: 10, color: t.text4, marginBottom: 1 }}>Следующее</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text2 }}>
                  {isNextSS && <span style={{ color: ssColor, marginRight: 4 }}>[SS·{String.fromCharCode(65+next.siIdx)}]</span>}
                  {nextEx.name}
                </div>
              </div>
            </div>
          );
        })()}

        {/* CTA */}
        <div style={{ padding: '0 16px 28px' }}>
          <div onClick={handleDone} style={{
            padding: 16, borderRadius: 16,
            background: restActive ? t.bg3 : (isSSStep && !curStep.isLastInRound ? ssColor : t.green),
            fontSize: 16, fontWeight: 700, textAlign: 'center', cursor: restActive ? 'default' : 'pointer',
            color: restActive ? t.text3 : '#fff', transition: 'all .2s',
          }}>
            {restActive
              ? 'Идёт отдых…'
              : isSSStep && !curStep.isLastInRound
                ? `Упражнение ${String.fromCharCode(65+curStep.siIdx)} готово → ${String.fromCharCode(65+curStep.siIdx+1)}`
                : 'Сет выполнен ✓'}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── PROGRESS ─────────────────────────────────────────────────────────────────
function ScreenProgress({ navigate, t, dark }) {
  const totalTonnage = 18450;
  const nextMilestone = TONNAGE_SCALE.find(m => m.kg > totalTonnage) || TONNAGE_SCALE[TONNAGE_SCALE.length - 1];
  const prevMilestone = [...TONNAGE_SCALE].reverse().find(m => m.kg <= totalTonnage) || TONNAGE_SCALE[0];
  const pct = prevMilestone && nextMilestone ? Math.min(1, (totalTonnage - prevMilestone.kg) / (nextMilestone.kg - prevMilestone.kg)) : 1;
  const maxT = Math.max(...WEEKLY_DATA.map(d => d.t));

  const SPORT_PRs = [
    { name: 'Жим штанги лёжа', date: '3 нед. назад', kg: '100 кг', reps: '× 5 повт.' },
    { name: 'Приседания', date: '1 нед. назад', kg: '140 кг', reps: '× 3 повт.' },
    { name: 'Становая тяга', date: 'Сегодня 🔥', kg: '180 кг', reps: '× 1 повт.', fresh: true },
  ];

  return (
    <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: t.bg }}>
        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', color: t.text }}>Прогресс <span style={{ color: t.accent }}>•</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 20, background: t.goldBg, border: `1px solid ${t.goldBorder}` }}>
          <span style={{ fontSize: 14 }}>🔥</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: t.gold }}>14 дней</span>
        </div>
      </div>

      {/* Hero stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px 14px' }}>
        {[
          { lbl: 'Тренировок', val: '47', sub: 'за всё время', delta: '↑ +3 этот месяц' },
          { lbl: 'Эта неделя', val: '3/4', sub: 'тренировки', delta: '↑ план выполнен' },
          { lbl: 'Объём / неделя', val: '18 200', sub: 'кг тоннаж', delta: '↑ +12% к пред.' },
          { lbl: 'Личных рекордов', val: '12', sub: 'всего PR', delta: '↑ +2 на неделе' },
        ].map((s, i) => (
          <div key={i} style={{ padding: 16, borderRadius: 16, background: t.bg2, border: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', color: t.text3, marginBottom: 6 }}>{s.lbl}</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', color: t.text }}>{s.val}</div>
            <div style={{ fontSize: 12, color: t.text4, marginTop: 3 }}>{s.sub}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.green, marginTop: 4 }}>{s.delta}</div>
          </div>
        ))}
      </div>

      {/* Tonnage journey */}
      <SectionLabel label="Тоннаж — путь к рекорду" t={t} />
      <div style={{ margin: '0 16px 14px', padding: 18, borderRadius: 18, background: dark ? 'linear-gradient(135deg, #1d1630 0%, #1a1a2e 100%)' : 'linear-gradient(135deg, #ede9fb 0%, #e8e4f8 100%)', border: `1px solid ${t.accentBorder}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: dark ? '#6b5ea8' : '#8b78d0', marginBottom: 4 }}>Общий тоннаж</div>
            <div>
              <span style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-1px', color: dark ? '#c4b8f8' : '#4030c0' }}>18 450</span>
              <span style={{ fontSize: 14, fontWeight: 600, marginLeft: 2, color: dark ? '#7060b0' : '#7060d0' }}> кг</span>
            </div>
          </div>
          <div style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: t.accentBg, color: t.accent, border: `1px solid ${t.accentBorder}` }}>
            {nextMilestone.emoji} {Math.round(pct * 100)}%
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: dark ? '#2a2040' : '#d0c8f0', overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${Math.round(pct * 100)}%`, background: 'linear-gradient(90deg, #5b4ff0, #9b87e8)', transition: 'width 1s' }}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: dark ? '#6050a0' : '#8878c0' }}>{prevMilestone.emoji} {prevMilestone.name} ✓</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: t.accent }}>{totalTonnage.toLocaleString('ru')} / {nextMilestone.kg.toLocaleString('ru')} кг</span>
          <span style={{ fontSize: 11, color: dark ? '#6050a0' : '#8878c0' }}>{nextMilestone.emoji} {nextMilestone.name}</span>
        </div>
      </div>

      {/* Weekly chart */}
      <SectionLabel label="Активность — 7 дней" t={t} />
      <div style={{ margin: '0 16px 14px', padding: 16, borderRadius: 16, background: t.bg2, border: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 14 }}>Тоннаж по дням (кг)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: 80, gap: 6 }}>
          {WEEKLY_DATA.map((d, i) => {
            const h = maxT > 0 ? Math.round((d.t / maxT) * 74) : 0;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <div style={{ width: '100%', height: h || 3, borderRadius: '4px 4px 0 0', background: d.today ? t.green : d.active ? t.accent : t.bg3 }}/>
                <span style={{ fontSize: 10, fontWeight: 600, color: d.today ? t.green : d.active ? t.accent : t.text4 }}>{d.day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* PR list */}
      <SectionLabel label="Личные рекорды" action="Все →" onAction={() => {}} t={t} />
      <div style={{ margin: '0 16px 14px', borderRadius: 16, overflow: 'hidden', background: t.bg2, border: `1px solid ${t.border}` }}>
        {SPORT_PRs.map((pr, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderTop: i > 0 ? `1px solid ${t.border2}` : 'none' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text, marginBottom: 2 }}>{pr.name}</div>
              <div style={{ fontSize: 11, color: t.text4 }}>{pr.date}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: pr.fresh ? t.green : t.accent }}>{pr.kg}</div>
              <div style={{ fontSize: 11, color: t.text4, marginTop: 1 }}>{pr.reps}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Achievements */}
      <SectionLabel label="Достижения" action="Все →" onAction={() => {}} t={t} />
      <div style={{ display: 'flex', gap: 10, padding: '0 16px 24px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {ACHIEVEMENTS.map(a => (
          <div key={a.id} style={{ flexShrink: 0, width: 90, padding: '12px 8px', borderRadius: 14, textAlign: 'center', background: t.bg2, border: `1px solid ${t.border}`, opacity: a.unlocked ? 1 : 0.3 }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>{a.emoji}</div>
            <div style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, color: t.text2 }}>{a.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function ScreenProfile({ navigate, t, dark }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
      <div style={{ padding: '12px 20px 10px', background: t.bg }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>Профиль</div>
      </div>

      {/* Avatar card */}
      <div style={{ margin: '0 16px 16px', padding: 20, borderRadius: 18, background: t.bg2, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: t.accentBg, border: `2px solid ${t.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>💪</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>Алексей</div>
          <div style={{ fontSize: 13, color: t.text3, marginTop: 2 }}>Силовые тренировки · 2 года</div>
          <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
            <span style={{ fontSize: 12, color: t.gold }}>🔥 14-дневный стрик</span>
          </div>
        </div>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.bg3, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="14" height="14" fill="none" stroke={t.text3} strokeWidth="2"><path d="M11 2 L12 3 L4 11 L2 12 L3 10 Z"/><line x1="9" y1="4" x2="10" y2="5"/></svg>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '0 16px 16px' }}>
        {[{ v: '47', l: 'Тренировок' }, { v: '12', l: 'PR установлено' }, { v: '18.4т', l: 'Кг поднято' }].map((s, i) => (
          <div key={i} style={{ padding: '14px 8px', borderRadius: 14, background: t.bg2, border: `1px solid ${t.border}`, textAlign: 'center' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: t.accent }}>{s.v}</div>
            <div style={{ fontSize: 10, color: t.text3, marginTop: 2, lineHeight: 1.3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* Settings sections */}
      {[
        { title: 'Тренировки', items: [{ icon: '⚖️', label: 'Единицы измерения', value: 'кг' }, { icon: '⏱', label: 'Отдых по умолчанию', value: '90 с' }, { icon: '📊', label: 'Прогрессия нагрузки', value: 'Вкл' }] },
        { title: 'Приложение', items: [{ icon: '🔔', label: 'Уведомления', value: 'Вкл' }, { icon: '🎨', label: 'Тема', value: dark ? 'Тёмная' : 'Светлая' }, { icon: '📤', label: 'Экспорт данных' }] },
        { title: 'Аккаунт', items: [{ icon: '👤', label: 'Имя пользователя' }, { icon: '🔒', label: 'Конфиденциальность' }, { icon: '❓', label: 'Помощь и поддержка' }] },
      ].map((sec, si) => (
        <div key={si} style={{ marginBottom: 16 }}>
          <SectionLabel label={sec.title} t={t} />
          <div style={{ margin: '0 16px', borderRadius: 16, overflow: 'hidden', background: t.bg2, border: `1px solid ${t.border}` }}>
            {sec.items.map((item, ii) => (
              <div key={ii} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderTop: ii > 0 ? `1px solid ${t.border2}` : 'none', cursor: 'pointer' }}>
                <span style={{ fontSize: 18, marginRight: 12, width: 24, textAlign: 'center' }}>{item.icon}</span>
                <span style={{ flex: 1, fontSize: 15, color: t.text }}>{item.label}</span>
                {item.value && <span style={{ fontSize: 13, color: t.text3, marginRight: 8 }}>{item.value}</span>}
                <svg width="14" height="14" fill="none" stroke={t.text4} strokeWidth="1.8"><polyline points="5,3 9,7 5,11"/></svg>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ textAlign: 'center', padding: '8px 20px 28px', fontSize: 12, color: t.text4 }}>IronLog v1.0.0</div>
    </div>
  );
}

// ─── WORKOUT LOG ──────────────────────────────────────────────────────────────
function ScreenWorkoutLog({ navigate, goBack, t, dark }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px 10px', display: 'flex', alignItems: 'center', gap: 12, background: t.bg, flexShrink: 0, borderBottom: `1px solid ${t.border2}` }}>
        <BackBtn onBack={goBack} t={t} />
        <span style={{ fontSize: 18, fontWeight: 700, color: t.text }}>История тренировок</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: 24 }}>
        {RECENT_WORKOUTS.map((w, i) => (
          <div key={w.id} style={{ margin: '12px 16px 0', padding: 16, borderRadius: 16, background: t.bg2, border: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{w.name}</div>
                <div style={{ fontSize: 12, color: t.text3, marginTop: 2 }}>{w.date}</div>
              </div>
              {w.prs > 0 && <div style={{ padding: '4px 10px', borderRadius: 20, background: t.goldBg, color: t.gold, fontSize: 12, fontWeight: 600, border: `1px solid ${t.goldBorder}` }}>🏆 {w.prs} PR</div>}
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              {[{ v: w.duration, l: 'время' }, { v: w.sets, l: 'сетов' }, { v: `${w.tonnage.toLocaleString('ru')} кг`, l: 'тоннаж' }].map((s, j) => (
                <div key={j}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: t.accent }}>{s.v}</div>
                  <div style={{ fontSize: 11, color: t.text3 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PROGRAM ──────────────────────────────────────────────────────────────────
function ScreenProgram({ navigate, goBack, t, dark }) {
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const schedule = { 'Пн': 0, 'Ср': 1, 'Пт': 0, 'Вс': 2 };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px 10px', display: 'flex', alignItems: 'center', gap: 12, background: t.bg, flexShrink: 0, borderBottom: `1px solid ${t.border2}` }}>
        <BackBtn onBack={goBack} t={t} />
        <span style={{ fontSize: 18, fontWeight: 700, color: t.text }}>Программа</span>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', paddingBottom: 24 }}>
        {/* Program card */}
        <div style={{ margin: '16px 16px 14px', padding: 18, borderRadius: 18, background: t.bg2, border: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.7px', color: t.accent, marginBottom: 6 }}>Активная программа</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.text, marginBottom: 4 }}>Push / Pull / Legs</div>
          <div style={{ fontSize: 13, color: t.text3, marginBottom: 16 }}>3 дня в неделю · 6-недельный цикл</div>

          {/* Week grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
            {days.map(day => {
              const tplIdx = schedule[day];
              const hasTpl = tplIdx !== undefined;
              const tpl = hasTpl ? WORKOUT_TEMPLATES[tplIdx] : null;
              const isToday = day === 'Пн';
              return (
                <div key={day} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: isToday ? t.accent : t.text3, marginBottom: 6 }}>{day}</div>
                  <div style={{ height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: hasTpl ? (isToday ? t.accent : t.accentBg) : t.bg3,
                    border: `1px solid ${hasTpl ? (isToday ? t.accent : t.accentBorder) : t.border}`,
                  }}>
                    {hasTpl ? (
                      <span style={{ fontSize: 16 }}>{['💪','🔱','🦵'][tplIdx]}</span>
                    ) : (
                      <span style={{ fontSize: 10, color: t.text4 }}>—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <SectionLabel label="Тренировки в программе" t={t} />
        {WORKOUT_TEMPLATES.map((wt, i) => (
          <div key={wt.id} onClick={() => navigate('workout-builder', { template: wt })} style={{ margin: '0 16px 10px', padding: '14px 16px', borderRadius: 16, background: t.bg2, border: `1px solid ${t.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: t.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{['💪','🔱','🦵'][i]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: t.text }}>{wt.name}</div>
              <div style={{ fontSize: 12, color: t.text3, marginTop: 2 }}>{wt.exercises.length} упражнений · {wt.exercises.reduce((a, e) => a + e.sets.length, 0)} сетов</div>
            </div>
            <svg width="16" height="16" fill="none" stroke={t.text4} strokeWidth="1.8"><polyline points="6,4 10,8 6,12"/></svg>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenActiveWorkout, ScreenProgress, ScreenProfile, ScreenWorkoutLog, ScreenProgram });
