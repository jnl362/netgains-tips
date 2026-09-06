function matchStory(report){
  const notes=(report.explanations||[]).filter(line=>line.includes('than forecast;')||line.includes('finished with ')||line.startsWith('Decisive score change:'));
  return `<section class="analysis-summary"><h3>What matched or differed</h3>${notes.map(line=>`<p>${esc(line.replace('Decisive score change:','Last recorded lead change:'))}</p>`).join('')||'<p>Not enough recorded evidence for a detailed explanation.</p>'}</section>`;
}
function pairedStat(label,left,right,unit,maxValue){
  const maximum=maxValue||Math.max(Number(left)||0,Number(right)||0,1);
  return `<article class="stat-visual"><h4>${esc(label)}</h4>${[left,right].map((v,i)=>`<div class="stat-bar-row"><div class="stat-bar-track"><i class="stat-bar-${i}" style="width:${v==null?0:Math.max(0,Math.min(100,Number(v)/maximum*100))}%"></i></div><b>${v==null?'—':esc(Number(Number(v).toFixed(1)))+esc(unit)}</b></div>`).join('')}</article>`;
}
function pointBars(report){
  const p=report.prediction;if(!p)return '';
  const maximum=Math.max(p.home_points||0,p.away_points||0,report.home_score||0,report.away_score||0,1);
  return `<section class="prediction-bars"><h3>Predicted and actual points</h3><p class="bar-legend">Grey: prediction · Mint: actual</p><div class="stat-visual-grid">${pairedStat(report.home_team,p.home_points,report.home_score,'',maximum)}${pairedStat(report.away_team,p.away_points,report.away_score,'',maximum)}</div></section>`;
}
function statCharts(report){
  return `<section><h3>Team statistics at a glance</h3><p class="bar-legend">Mint: ${esc(report.home_team)} · Blue: ${esc(report.away_team)}</p><div class="stat-visual-grid team-bars">${(report.stats||[]).map(s=>pairedStat(s.label,s.home,s.away,s.unit,s.unit==='%'?100:null)).join('')}</div></section>`;
}
function momentsTable(report){
  return `<section class="analysis-moments"><h3>Key match moments</h3><table class="analysis-table moments-table"><thead><tr><th>Time</th><th>What happened</th></tr></thead><tbody>${(report.turning_points||[]).map(line=>{const short=line.split(' The timing shows the sequence;')[0],parts=short.split(' — ');return `<tr><th scope="row">${esc(parts[0])}</th><td>${esc(parts.slice(1).join(' — ')||short)}</td></tr>`;}).join('')||'<tr><td colspan="2">No key moments are available.</td></tr>'}</tbody></table><p class="subtitle">Timing shows the sequence of play; it does not establish that an earlier event caused a try.</p></section>`;
}
function comparisonTable(report){
  const rows=report.comparisons||[];
  if(!rows.length)return '<p>No verified pre-kickoff forecast is available for comparison.</p>';
  return `<section><h3>Our prediction beside the actual result</h3><div class="table-scroll"><table class="analysis-table"><thead><tr><th>Measure</th><th>Our prediction</th><th>Actual result</th><th>Difference</th></tr></thead><tbody>${rows.map(row=>`<tr><th scope="row">${esc(row.label)}</th><td>${esc(row.predicted)}</td><td>${esc(row.actual)}</td><td>${esc(row.difference)}</td></tr>`).join('')}</tbody></table></div><p class="subtitle">Scores are the original model projection. Differences are actual minus predicted; margin is home minus away.</p></section>`;
}
function scoreGraph(report){
  const flow=report.score_flow||[];
  if(flow.length<2)return '<p class="subtitle">A complete scoring timeline is not available.</p>';
  const duration=Math.max(...flow.map(p=>p.seconds),1),maxScore=Math.max(...flow.flatMap(p=>[p.home,p.away]),4)+4;
  const x=t=>40+640*t/duration,y=v=>185-150*v/maxScore;
  const path=side=>{let last=0;return flow.map((p,i)=>{const command=i?'L':'M',s=`${command}${x(p.seconds)},${y(last)} L${x(p.seconds)},${y(p[side])}`;last=p[side];return s;}).join(' ');};
  const ticks=Array.from({length:Math.floor(duration/600)+1},(_,i)=>i*600);
  return `<figure class="score-figure"><figcaption>Score through the match <span>Home: mint · Away: blue</span></figcaption><svg viewBox="0 0 720 215" role="img" aria-label="Score timeline. ${esc(report.home_team)} ${report.home_score}, ${esc(report.away_team)} ${report.away_score}. Detailed events appear below.">${ticks.map(t=>`<line x1="${x(t)}" y1="30" x2="${x(t)}" y2="185" stroke="#294139"/><text x="${x(t)}" y="205" text-anchor="middle">${Math.round(t/60)}′</text>`).join('')}${Array.from({length:Math.floor(maxScore/10)+1},(_,i)=>`<text x="30" y="${y(i*10)+4}" text-anchor="end">${i*10}</text>`).join('')}<path d="${path('home')}" stroke="#51f29a"/><path d="${path('away')}" stroke="#82b8ff"/></svg></figure>`;
}

function possessionGraph(report){
  const possession=(report.stats||[]).find(s=>s.label==='Possession %');
  if(!possession||possession.home==null||possession.away==null)return '';
  const h=Math.max(0,Math.min(100,possession.home)),a=Math.max(0,Math.min(100,possession.away));
  return `<section class="possession"><h3>Final possession</h3><div class="possession-labels"><span>${esc(report.home_team)} <b>${h}%</b></span><span>${esc(report.away_team)} <b>${a}%</b></span></div><div class="possession-track" role="img" aria-label="Final possession: home ${h} percent, away ${a} percent"><i style="flex:${h}"></i><i style="flex:${a}"></i></div></section>`;
}

function showAnalysis(f){
  const report=f.analysis;
  const heading=`<div class="drawer-head"><div><div class="kicker">FULL TIME · POST-MATCH ANALYSIS</div><h2 id="analysisTitle">${esc(f.home_team)} ${scoreValue(f.home_score)}–${scoreValue(f.away_score)} ${esc(f.away_team)}</h2><div class="subtitle">${esc(f.kickoff)} · ${esc(f.venue)}</div></div><button class="close" aria-label="Close match">×</button></div>`;
  let body;
  if(!report?.available){
    body='<p class="empty">The final result is available. Detailed analysis will appear after the desktop app publishes the match evidence.</p>';
  }else{
    const pred=report.prediction;
    const grade=pred?`${esc(report.verdict)} winner pick`:'Prediction not graded';
    body=`<div class="analysis-verdict ${report.verdict==='Wrong'?'missed':''}">${grade}<p>${esc(report.summary)}</p></div>${comparisonTable(report)}${pointBars(report)}${matchStory(report)}${possessionGraph(report)}${scoreGraph(report)}${momentsTable(report)}<section><h3>Team comparison</h3><div class="table-scroll"><table class="analysis-table"><thead><tr><th>Statistic</th><th>${esc(report.home_team)}</th><th>${esc(report.away_team)}</th></tr></thead><tbody>${(report.stats||[]).map(s=>`<tr><th scope="row">${esc(s.label)}</th><td>${s.home==null?'—':esc(s.home)+esc(s.unit)}</td><td>${s.away==null?'—':esc(s.away)+esc(s.unit)}</td></tr>`).join('')}</tbody></table></div></section>${statCharts(report)}<section class="event-section"><div class="section-head"><h3>Match timeline</h3><label>Show <select id="eventFilter" aria-label="Filter match events"><option value="all">All events</option><option value="scoring">Scoring</option><option value="errors">Errors</option><option value="six_agains">Six-agains</option><option value="discipline">Discipline</option><option value="interchanges">Interchanges</option><option value="attack">Attack</option></select></label></div><div id="analysisEvents"></div></section><details class="analysis-evidence"><summary>Evidence and availability</summary>${(report.limitations||[]).map(line=>`<p>${esc(line)}</p>`).join('')}${pred?`<p>Prediction locked ${esc(pred.audit.locked_at)} UTC. Data cutoff ${esc(pred.audit.cutoff)}.</p>`:''}${/^https:\/\/www\.nrl\.com\//.test(report.source_url||'')?`<a href="${esc(report.source_url)}" target="_blank" rel="noopener">Official Match Centre</a>`:''}</details>`;
  }
  $('#drawerContent').innerHTML=heading+`<div class="analysis-body">${body}</div>`;
  const drawer=$('#drawer');drawer.classList.add('open');drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-labelledby','analysisTitle');
  document.body.style.overflow='hidden';$('.close').onclick=closeDrawer;$('.close').focus();
  const url=new URL(location.href);url.searchParams.set('match',f.match_id);history.replaceState(null,'',url);
  const renderEvents=()=>{
    const category=$('#eventFilter').value;
    const events=(report.events||[]).filter(e=>category==='all'||e.category===category);
    $('#analysisEvents').innerHTML=`<p class="subtitle">${events.length} recorded events</p><ol class="event-list">${events.map(e=>`<li class="event-${esc(e.side)}"><time>${esc(e.clock)}</time><div><b>${esc(e.title)}</b><span>${esc(e.team)}${e.player?' · '+esc(e.player):''}${e.detail?' · '+esc(e.detail):''}</span></div></li>`).join('')||'<li>No recorded events in this category.</li>'}</ol>`;
  };
  if(report?.available&&$('#eventFilter')){$('#eventFilter').onchange=renderEvents;renderEvents();}
  drawer.onkeydown=event=>{
    if(event.key!=='Tab')return;
    const targets=$$('button,select,a,summary,[tabindex="0"]',drawer).filter(el=>el.getClientRects().length);
    const first=targets[0],last=targets.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
}
