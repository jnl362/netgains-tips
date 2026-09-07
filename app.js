const state={data:null,view:'home',matchFilter:'all',atsCount:10,bookmaker:localStorage.getItem('netgains-bookmaker')||null};
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const finite=v=>v!=null&&Number.isFinite(Number(v));
const pct=v=>!finite(v)?'—':`${(v*100).toFixed(1)}%`, odds=v=>!finite(v)?'—':`$${Number(v).toFixed(2)}`, num=(v,d=1)=>!finite(v)?'—':Number(v).toFixed(d);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const topPlayers=()=>upcomingFixtures().flatMap(f=>(f.ats_players||[]).map(p=>({...p,match:`${f.home_team} vs ${f.away_team}`}))).sort((a,b)=>b.probability-a.probability);
const favourite=f=>!finite(f.home_win_probability)||!finite(f.away_win_probability)?{team:'Forecast unavailable',p:null}:f.home_win_probability>=f.away_win_probability?{team:f.home_team,p:f.home_win_probability}:{team:f.away_team,p:f.away_win_probability};
const currentBook=()=>state.bookmaker||state.data?.default_bookmaker||'Betcha';
const marketView=f=>{
  const name=currentBook(),prices=f.bookmaker_prices?.[name]||{},view=f.bookmaker_views?.[name]||{};
  return {name,...prices,...view};
};
const priceEV=(prob,price)=>prob!=null&&price!=null?prob*price-1:null;
const signedPct=v=>v==null?'—':`${v>=0?'+':''}${(v*100).toFixed(1)}%`;
const sameNumber=(a,b)=>a!=null&&b!=null&&Math.abs(Number(a)-Number(b))<.001;
const atsBookOdds=p=>p.bookmaker_prices?.[currentBook()]??(currentBook()===state.data?.default_bookmaker?p.bookmaker_odds:null);

const isCompleted=f=>f.status==='completed';
const upcomingFixtures=()=> (state.data?.fixtures||[]).filter(f=>!isCompleted(f));
const completedFixtures=()=> (state.data?.fixtures||[]).filter(isCompleted).sort((a,b)=>String(b.start_time||'').localeCompare(String(a.start_time||'')));
const scoreValue=v=>v==null?'—':esc(Number.isFinite(Number(v))?v:'—');
function completedCard(f){
  const r=f.analysis;
  return `<article class="match-card completed-card" data-match="${esc(f.match_id)}" tabindex="0" role="button" aria-label="View analysis: ${esc(f.home_team)} versus ${esc(f.away_team)}"><div class="match-top"><span>FULL TIME · ${esc(f.kickoff)}</span><span>${esc(f.venue)}</span></div><div class="teams"><div class="team"><b>${esc(f.home_team)}</b></div><div class="score"><b>${scoreValue(f.home_score)}–${scoreValue(f.away_score)}</b><small>FINAL</small></div><div class="team"><b>${esc(f.away_team)}</b></div></div><div class="chips"><span class="chip">${esc(f.winner||'Result available')}</span><span class="chip">${r?.prediction?esc(r.verdict)+' winner pick':'Prediction not graded'}</span></div><div class="analysis-link">View match analysis →</div></article>`;
}
function matchCard(f){
  if(isCompleted(f))return completedCard(f);
  const fav=favourite(f),safe=f.safe_bet?.available?f.safe_bet:null;
  return `<article class="match-card" data-match="${f.match_id}" tabindex="0"><div class="match-top"><span>${esc(f.kickoff)}</span><span>${esc(f.venue)}</span></div><div class="teams"><div class="team"><b>${esc(f.home_team)}</b><span>${pct(f.home_win_probability)}</span></div><div class="score"><b>${scoreValue(f.likely_home_points)}–${scoreValue(f.likely_away_points)}</b><small>PROJECTED</small></div><div class="team"><b>${esc(f.away_team)}</b><span>${pct(f.away_win_probability)}</span></div></div><div class="prob-track"><i style="width:${finite(f.home_win_probability)?Math.max(0,Math.min(100,f.home_win_probability*100)):0}%"></i><i style="width:${finite(f.away_win_probability)?Math.max(0,Math.min(100,f.away_win_probability*100)):0}%"></i></div><div class="chips"><span class="chip">Favourite <b>${esc(fav.team)}</b></span><span class="chip">Margin <b>${num(f.projected_margin)}</b></span><span class="chip">Total <b>${num(f.projected_total)}</b></span></div>${safe?`<div class="pick"><small>SAFEST ATS COMBINATION</small><b>${safe.legs.map(x=>esc(x.player)).join(' + ')}</b><span>${pct(safe.probability)} joint hit probability</span></div>`:''}</article>`;
}

function atsRows(players,count=10){
  return players.slice(0,count).map((p,i)=>{const bookOdds=atsBookOdds(p),edge=priceEV(p.probability,bookOdds);return `<article class="ats-card"><span class="rank">${i+1}</span><div><b>${esc(p.player)}</b><small>${esc(p.team)}${p.match?` · ${esc(p.match)}`:''}</small></div><div class="ats-prob"><b>${pct(p.probability)}</b><small>Fair ${odds(p.fair_odds)} · ${esc(currentBook())} ${odds(bookOdds)}${edge==null?'':` · <span class="${edge>=0?'edge':'negative'}">${signedPct(edge)}</span>`}</small></div></article>`;}).join('')||'<div class="empty">ATS rankings are not available yet.</div>';
}

function marketCard(f){
  const b=marketView(f),hEdge=priceEV(f.home_win_probability,b.home_h2h),aEdge=priceEV(f.away_win_probability,b.away_h2h),best=Math.max(hEdge??-99,aEdge??-99);
  const hp=b.home_cover_probability??(sameNumber(b.home_line,f.market_line)?f.home_cover_probability:null),ap=b.away_cover_probability??(sameNumber(b.away_line,f.away_line)?f.away_cover_probability:null),op=b.over_probability??(sameNumber(b.total,f.market_total)?f.over_probability:null),up=b.under_probability??(sameNumber(b.total,f.market_total)?f.under_probability:null);
  return `<article class="market-card" data-match="${f.match_id}" tabindex="0"><div class="market-title">${esc(f.home_team)} <span style="color:var(--muted);font-weight:500">vs</span> ${esc(f.away_team)}</div><div class="market-grid"><div class="market-cell"><small>H2H · ${esc(b.name)}</small><b>${odds(b.home_h2h)} / ${odds(b.away_h2h)}</b><small>Model ${pct(f.home_win_probability)} / ${pct(f.away_win_probability)} · EV ${signedPct(hEdge)} / ${signedPct(aEdge)}</small></div><div class="market-cell"><small>LINE · ${esc(b.name)}</small><b>${b.home_line==null?'Unavailable':`${esc(f.home_team)} ${Number(b.home_line)>=0?'+':''}${num(b.home_line)} @ ${odds(b.home_line_odds)}`}</b><small>${hp==null?'No current cover calculation':`${pct(hp)} home cover · ${pct(ap)} away`}</small></div><div class="market-cell"><small>TOTAL · ${esc(b.name)}</small><b>${b.total==null?'Unavailable':`${num(b.total)} · O ${odds(b.over_odds)} / U ${odds(b.under_odds)}`}</b><small>${op==null?'No current total calculation':`Over ${pct(op)} · Under ${pct(up)}`}</small></div></div><div class="chips"><span class="chip">Best H2H edge <b class="${best>=0?'edge':'negative'}">${best===-99?'—':signedPct(best)}</b></span><span class="chip">Viewing ${esc(b.name)}</span></div></article>`;
}

function renderBoosts(){
  const fixtures=upcomingFixtures(),roundLabel=state.data.round_label||`Round ${state.data.round}`;
  const offered=fixtures.filter(f=>(f.super_boost_reviews||[]).length);
  $('#boostRound').textContent=`${roundLabel} · ${offered.length} of ${fixtures.length} matches currently have a stored offer`;
  $('#boostList').innerHTML=offered.map(f=>{
    const reviews=f.super_boost_reviews||[];
    return `<article class="market-card" data-match="${esc(f.match_id)}" tabindex="0" role="button"><div class="match-top"><span>${esc(f.kickoff)}</span><span>${esc(f.venue)}</span></div><div class="market-title">${esc(f.home_team)} <span style="color:var(--muted);font-weight:500">vs</span> ${esc(f.away_team)}</div><div class="detail-grid">${reviews.map(x=>`<div class="detail-box"><small>${esc(x.bookmaker)} SUPER BOOST</small><b>${esc(x.selection)} @ ${odds(x.bookmaker_odds)}</b><span>${x.probability==null?'Probability unavailable':`${pct(x.probability)} model · Fair ${odds(x.fair_odds)} · <span class="${Number(x.expected_value)>=0?'edge':'negative'}">${signedPct(x.expected_value)} EV</span>`}</span><small>${esc(x.verdict)} · ${esc(x.reason)}</small></div>`).join('')}</div><div class="analysis-link">Open full match review →</div></article>`;
  }).join('')||'<div class="empty">No Super Boost has been captured for this round yet. This tab will fill automatically when a bookmaker publishes and NetGains stores an offer for a specific match.</div>';
}

function render(){
  const d=state.data,fixtures=upcomingFixtures(),players=topPlayers(),strong=fixtures.filter(f=>favourite(f).p>=.68).length;
  configureBookmakerSelector();
  const roundLabel=d.round_label||`Round ${d.round}`;
  $('#roundPill').textContent=roundLabel;
  $('#matchRound').textContent=`${roundLabel} · ${fixtures.length} upcoming fixtures`;
  $('#updated').textContent=`Live model · Updated ${d.generated_at}`;
  $('#homeStats').innerHTML=`<article class="stat-card"><small>UPCOMING</small><b>${fixtures.length} matches</b></article><article class="stat-card"><small>TOP ATS</small><b class="good">${players[0]?pct(players[0].probability):'—'}</b></article><article class="stat-card"><small>STRONG FAVOURITES</small><b>${strong}</b></article><article class="stat-card"><small>ENGINE</small><b>v${esc(d.engine_version)}</b></article>`;
  $('#featured').innerHTML=fixtures.map(matchCard).join('')||'<div class="empty">No upcoming matches in this round.</div>';
  const finished=completedFixtures();
  $('#completedSection').hidden=!finished.length;
  $('#completedMatches').innerHTML=finished.map(completedCard).join('');
  $('#homeAts').innerHTML=atsRows(players,5);
  renderMatches();
  $('#atsList').innerHTML=atsRows(players,state.atsCount);
  $('#marketList').innerHTML=fixtures.map(marketCard).join('');
  renderBoosts();
  $('#modelPanel').innerHTML=`<div class="model-row"><div><b>Active model engine</b><small>${esc(fixtures[0]?.forecast_engine||'NetGains projection engine')}</small></div><b>LIVE</b></div><div class="model-row"><div><b>ATS calibration</b><small>Validated historical probability-band calibration</small></div><b>97.8%</b></div><div class="model-row"><div><b>Data quality</b><small>Current round input coverage</small></div><b>${esc(fixtures[0]?.data_quality||'—')}</b></div><div class="model-row"><div><b>Current release</b><small>Published model and mobile data schema ${esc(d.schema_version)}</small></div><b>v${esc(d.engine_version)}</b></div><div class="model-row"><div><b>Competition</b><small>NetGains is built for NRL only</small></div><b>NRL</b></div>`;
  bindMatchOpen();
}

function renderMatches(){
  const fixtures=upcomingFixtures().filter(f=>state.matchFilter==='strong'?favourite(f).p>=.68:state.matchFilter==='close'?f.close_game_probability>=.45:true);
  $('#matchList').innerHTML=fixtures.map(f=>`<article class="list-row" data-match="${f.match_id}" tabindex="0"><div><div class="list-meta">${esc(f.kickoff)} · ${esc(f.venue)}</div><div class="list-teams">${esc(f.home_team)}<span>vs</span>${esc(f.away_team)}</div></div><div class="list-score"><b>${scoreValue(f.likely_home_points)}–${scoreValue(f.likely_away_points)}</b><small>${pct(Math.max(f.home_win_probability,f.away_win_probability))} favourite</small></div></article>`).join('')||'<div class="empty">No matches fit this filter.</div>';
  if(state.matchFilter==='all')$('#matchList').innerHTML+=completedFixtures().map(completedCard).join('');
  bindMatchOpen();
}

function specialMarkets(f){
  const boosts=f.super_boost_reviews||[],medals=f.clive_churchill_candidates||[];
  const boostHtml=boosts.length?boosts.map(x=>`<div class="detail-box"><small>${esc(x.bookmaker)} SUPER BOOST</small><b>${esc(x.selection)} @ ${odds(x.bookmaker_odds)}</b><span>${x.probability==null?'Probability unavailable':`${pct(x.probability)} model · Fair ${odds(x.fair_odds)} · ${signedPct(x.expected_value)} EV`}</span><small>${esc(x.verdict)} · ${esc(x.reason)}</small></div>`).join(''):'<div class="empty">No stored Super Boost offer is available for this match.</div>';
  const medalHtml=medals.length?`<h3>Clive Churchill Medal candidates</h3><div class="detail-grid">${medals.map(x=>{const prices=Object.entries(x.bookmaker_prices||{}).map(([b,p])=>`${esc(b)} ${odds(p)}`).join(' · ')||'Bookmaker price unavailable';return `<div class="detail-box"><small>${esc(x.team)} · ${esc(x.position)}</small><b>${esc(x.player)} · ${pct(x.probability)}</b><span>Fair ${odds(x.fair_odds)} · ${prices}</span><small>${esc(x.reason)}</small></div>`;}).join('')}</div>`:'';
  return `<h3>Super Boost review</h3><div class="detail-grid">${boostHtml}</div>${medalHtml}`;
}

function showMatch(id){
  const f=state.data.fixtures.find(x=>String(x.match_id)===String(id)); if(!f)return;
  if(isCompleted(f)){showAnalysis(f);return;}
  const fav=favourite(f),players=f.ats_players||[],ctx=f.context_effects||{},b=marketView(f);
  const hp=b.home_cover_probability??(sameNumber(b.home_line,f.market_line)?f.home_cover_probability:null),ap=b.away_cover_probability??(sameNumber(b.away_line,f.away_line)?f.away_cover_probability:null),op=b.over_probability??(sameNumber(b.total,f.market_total)?f.over_probability:null),up=b.under_probability??(sameNumber(b.total,f.market_total)?f.under_probability:null);
  $('#drawerContent').innerHTML=`<div class="drawer-head"><div><div class="kicker">${esc(f.kickoff)} · ${esc(f.venue)}</div><h2>${esc(f.home_team)} vs ${esc(f.away_team)}</h2><div class="subtitle">${esc(b.name)} markets · model v${esc(state.data.engine_version)}</div></div><button class="close" aria-label="Close match">×</button></div><div class="projection"><div><small>${esc(f.home_team)}</small><strong>${pct(f.home_win_probability)}</strong></div><div class="score">${scoreValue(f.likely_home_points)}–${scoreValue(f.likely_away_points)}</div><div><small>${esc(f.away_team)}</small><strong>${pct(f.away_win_probability)}</strong></div></div><div class="tabs"><button class="active" data-detail="overview">Overview</button><button data-detail="ats">ATS</button><button data-detail="markets">Markets</button><button data-detail="special">Boosts${(f.clive_churchill_candidates||[]).length?' & Medal':''}</button><button data-detail="model">Model detail</button></div>
  <section class="detail-section active" data-section="overview"><div class="detail-grid"><div class="detail-box"><small>MODEL FAVOURITE</small><b>${esc(fav.team)} · ${pct(fav.p)}</b></div><div class="detail-box"><small>PROJECTED MARGIN</small><b>${num(f.projected_margin)} points</b></div><div class="detail-box"><small>PROJECTED TOTAL</small><b>${num(f.projected_total)} points</b></div><div class="detail-box"><small>PREDICTION STRENGTH</small><b>${num(f.prediction_strength_score,0)}/100</b></div><div class="detail-box"><small>FAVOURITE 1–12</small><b>${pct(f.fav_1_12_probability)}</b></div><div class="detail-box"><small>FAVOURITE 13+</small><b>${pct(f.fav_13_plus_probability)}</b></div></div>${f.safe_bet?.available?`<div class="pick"><small>SAFEST ATS COMBINATION</small><b>${f.safe_bet.legs.map(x=>esc(x.player)).join(' + ')}</b><span>${pct(f.safe_bet.probability)} joint hit · Fair ${odds(f.safe_bet.fair_odds)}</span></div>`:''}</section>
  <section class="detail-section" data-section="ats"><div class="ats-list">${atsRows(players,999)}</div></section>
  <section class="detail-section" data-section="markets"><div class="detail-grid"><div class="detail-box"><small>${esc(f.home_team)} H2H · ${esc(b.name)}</small><b>${pct(f.home_win_probability)} model · ${odds(b.home_h2h)} book · ${signedPct(priceEV(f.home_win_probability,b.home_h2h))} EV</b></div><div class="detail-box"><small>${esc(f.away_team)} H2H · ${esc(b.name)}</small><b>${pct(f.away_win_probability)} model · ${odds(b.away_h2h)} book · ${signedPct(priceEV(f.away_win_probability,b.away_h2h))} EV</b></div><div class="detail-box"><small>${esc(f.home_team)} LINE · ${esc(b.name)}</small><b>${b.home_line==null?'Unavailable':`${Number(b.home_line)>=0?'+':''}${num(b.home_line)} @ ${odds(b.home_line_odds)} · ${pct(hp)}`}</b></div><div class="detail-box"><small>${esc(f.away_team)} LINE · ${esc(b.name)}</small><b>${b.away_line==null?'Unavailable':`${Number(b.away_line)>=0?'+':''}${num(b.away_line)} @ ${odds(b.away_line_odds)} · ${pct(ap)}`}</b></div><div class="detail-box"><small>OVER · ${esc(b.name)}</small><b>${b.total==null?'Unavailable':`${num(b.total)} @ ${odds(b.over_odds)} · ${pct(op)}`}</b></div><div class="detail-box"><small>UNDER · ${esc(b.name)}</small><b>${b.total==null?'Unavailable':`${num(b.total)} @ ${odds(b.under_odds)} · ${pct(up)}`}</b></div></div></section>
  <section class="detail-section" data-section="special">${specialMarkets(f)}</section>
  <section class="detail-section" data-section="model"><div class="detail-grid"><div class="detail-box"><small>DATA QUALITY</small><b>${esc(f.data_quality)}</b></div><div class="detail-box"><small>CONFIDENCE</small><b>${esc(f.confidence)} · ${num(f.confidence_score,0)}/100</b></div><div class="detail-box"><small>HOME INPUT</small><b>${Number(ctx.home_advantage||0)>=0?'+':''}${num(ctx.home_advantage)} pts</b></div><div class="detail-box"><small>CONTROLLED CONTEXT</small><b>${Number(ctx.controlled_context_margin||0)>=0?'+':''}${num(ctx.controlled_context_margin)} pts</b></div></div><ol class="drivers">${(f.drivers||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol></section>`;
  $('#drawer').classList.add('open'); document.body.style.overflow='hidden'; $('.close').onclick=closeDrawer;
  $$('[data-detail]').forEach(button=>button.onclick=()=>{$$('[data-detail]').forEach(x=>x.classList.toggle('active',x===button));$$('[data-section]').forEach(x=>x.classList.toggle('active',x.dataset.section===button.dataset.detail));});
}

function closeDrawer(){const url=new URL(location.href);url.searchParams.delete('match');history.replaceState(null,'',url);$('#drawer').classList.remove('open');$('#drawer').removeAttribute('aria-labelledby');$('#drawer').onkeydown=null;document.body.style.overflow='';}
function bindMatchOpen(){$$('[data-match]').forEach(el=>{el.onclick=()=>showMatch(el.dataset.match);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showMatch(el.dataset.match);}};});}
function go(view){state.view=view;$$('.view').forEach(v=>v.classList.toggle('active',v.id===`${view}View`));$$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));scrollTo({top:0,behavior:'smooth'});}
function configureBookmakerSelector(){
  const select=$('#bookmakerSelect'),books=state.data?.available_bookmakers?.length?state.data.available_bookmakers:['Betcha','TAB NZ','Best Available'];
  if(!books.includes(state.bookmaker))state.bookmaker=books.includes(state.data?.default_bookmaker)?state.data.default_bookmaker:books[0];
  const signature=books.join('|');
  if(select.dataset.books!==signature){select.innerHTML=books.map(book=>`<option value="${esc(book)}">${esc(book==='TAB NZ'?'TAB':book==='Best Available'?'Best':book)}</option>`).join('');select.dataset.books=signature;}
  select.value=state.bookmaker;
}

async function loadData(){
  const btn=$('#refreshBtn'); btn.classList.add('spinning');
  try{const response=await fetch(`./data.json?v=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw Error(`HTTP ${response.status}`);state.data=await response.json();configureBookmakerSelector();localStorage.setItem('netgains-bookmaker',state.bookmaker);render();const selected=new URL(location.href).searchParams.get('match');if(selected)showMatch(selected);}
  catch(error){$('#updated').textContent='Could not load the latest model data';$('#featured').innerHTML='<div class="error">Refresh the page to try again.</div>';}
  finally{btn.classList.remove('spinning');}
}

$$('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.view));
$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
$('#refreshBtn').onclick=loadData;
$('#bookmakerSelect').onchange=e=>{state.bookmaker=e.target.value;localStorage.setItem('netgains-bookmaker',state.bookmaker);closeDrawer();render();};
$('#drawer').onclick=e=>{if(e.target===$('#drawer'))closeDrawer();};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});
$$('[data-filter]').forEach(b=>b.onclick=()=>{$$('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));state.matchFilter=b.dataset.filter;renderMatches();});
$$('[data-ats-count]').forEach(b=>b.onclick=()=>{$$('[data-ats-count]').forEach(x=>x.classList.toggle('active',x===b));state.atsCount=Number(b.dataset.atsCount);$('#atsList').innerHTML=atsRows(topPlayers(),state.atsCount);});
loadData();
setInterval(loadData,5*60*1000);
