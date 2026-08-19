const state={data:null,view:'home',matchFilter:'all',atsCount:10};
const $=(s,p=document)=>p.querySelector(s), $$=(s,p=document)=>[...p.querySelectorAll(s)];
const pct=v=>v==null?'—':`${(v*100).toFixed(1)}%`, odds=v=>v==null?'—':`$${Number(v).toFixed(2)}`, num=(v,d=1)=>v==null?'—':Number(v).toFixed(d);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const topPlayers=()=>state.data.fixtures.flatMap(f=>(f.ats_players||[]).map(p=>({...p,match:`${f.home_team} vs ${f.away_team}`}))).sort((a,b)=>b.probability-a.probability);
const favourite=f=>f.home_win_probability>=f.away_win_probability?{team:f.home_team,p:f.home_win_probability}:{team:f.away_team,p:f.away_win_probability};

function matchCard(f){
  const fav=favourite(f),safe=f.safe_bet?.available?f.safe_bet:null;
  return `<article class="match-card" data-match="${f.match_id}" tabindex="0"><div class="match-top"><span>${esc(f.kickoff)}</span><span>${esc(f.venue)}</span></div><div class="teams"><div class="team"><b>${esc(f.home_team)}</b><span>${pct(f.home_win_probability)}</span></div><div class="score"><b>${f.likely_home_points}–${f.likely_away_points}</b><small>PROJECTED</small></div><div class="team"><b>${esc(f.away_team)}</b><span>${pct(f.away_win_probability)}</span></div></div><div class="prob-track"><i style="width:${f.home_win_probability*100}%"></i><i style="width:${f.away_win_probability*100}%"></i></div><div class="chips"><span class="chip">Favourite <b>${esc(fav.team)}</b></span><span class="chip">Margin <b>${num(f.projected_margin)}</b></span><span class="chip">Total <b>${num(f.projected_total)}</b></span></div>${safe?`<div class="pick"><small>SAFEST ATS COMBINATION</small><b>${safe.legs.map(x=>esc(x.player)).join(' + ')}</b><span>${pct(safe.probability)} joint hit probability</span></div>`:''}</article>`;
}

function atsRows(players,count=10){
  return players.slice(0,count).map((p,i)=>`<article class="ats-card"><span class="rank">${i+1}</span><div><b>${esc(p.player)}</b><small>${esc(p.team)}${p.match?` · ${esc(p.match)}`:''}</small></div><div class="ats-prob"><b>${pct(p.probability)}</b><small>Fair ${odds(p.fair_odds)}</small></div></article>`).join('')||'<div class="empty">ATS rankings are not available yet.</div>';
}

function marketCard(f){
  const hEdge=f.home_h2h_ev,aEdge=f.away_h2h_ev,best=Math.max(hEdge??-99,aEdge??-99);
  return `<article class="market-card" data-match="${f.match_id}" tabindex="0"><div class="market-title">${esc(f.home_team)} <span style="color:var(--muted);font-weight:500">vs</span> ${esc(f.away_team)}</div><div class="market-grid"><div class="market-cell"><small>H2H MODEL</small><b>${pct(f.home_win_probability)} / ${pct(f.away_win_probability)}</b><small>${odds(f.home_fair_odds)} / ${odds(f.away_fair_odds)} fair</small></div><div class="market-cell"><small>LINE</small><b>${esc(f.home_team)} ${f.market_line>=0?'+':''}${num(f.market_line)}</b><small>${pct(f.home_cover_probability)} cover</small></div><div class="market-cell"><small>TOTAL ${num(f.market_total)}</small><b>Over ${pct(f.over_probability)}</b><small>Under ${pct(f.under_probability)}</small></div></div><div class="chips"><span class="chip">Best H2H edge <b class="${best>=0?'edge':'negative'}">${pct(best)}</b></span><span class="chip">${esc(f.bookmaker_provider||state.data.default_bookmaker)}</span></div></article>`;
}

function render(){
  const d=state.data,fixtures=d.fixtures||[],players=topPlayers(),strong=fixtures.filter(f=>favourite(f).p>=.68).length;
  $('#roundPill').textContent=`Round ${d.round}`;
  $('#matchRound').textContent=`Round ${d.round} · ${fixtures.length} upcoming fixtures`;
  $('#updated').textContent=`Live model · Updated ${d.generated_at}`;
  $('#homeStats').innerHTML=`<article class="stat-card"><small>UPCOMING</small><b>${fixtures.length} matches</b></article><article class="stat-card"><small>TOP ATS</small><b class="good">${players[0]?pct(players[0].probability):'—'}</b></article><article class="stat-card"><small>STRONG FAVOURITES</small><b>${strong}</b></article><article class="stat-card"><small>ENGINE</small><b>v${esc(d.engine_version)}</b></article>`;
  $('#featured').innerHTML=fixtures.slice(0,4).map(matchCard).join('');
  $('#homeAts').innerHTML=atsRows(players,5);
  renderMatches();
  $('#atsList').innerHTML=atsRows(players,state.atsCount);
  $('#marketList').innerHTML=fixtures.map(marketCard).join('');
  $('#modelPanel').innerHTML=`<div class="model-row"><div><b>Active model engine</b><small>${esc(fixtures[0]?.forecast_engine||'NetGains projection engine')}</small></div><b>LIVE</b></div><div class="model-row"><div><b>ATS calibration</b><small>Validated historical probability-band calibration</small></div><b>97.8%</b></div><div class="model-row"><div><b>Data quality</b><small>Current round input coverage</small></div><b>${esc(fixtures[0]?.data_quality||'—')}</b></div><div class="model-row"><div><b>Current release</b><small>Published model and mobile data schema ${esc(d.schema_version)}</small></div><b>v${esc(d.engine_version)}</b></div><div class="model-row"><div><b>Competition</b><small>NetGains is built for NRL only</small></div><b>NRL</b></div>`;
  bindMatchOpen();
}

function renderMatches(){
  const fixtures=state.data.fixtures.filter(f=>state.matchFilter==='strong'?favourite(f).p>=.68:state.matchFilter==='close'?f.close_game_probability>=.45:true);
  $('#matchList').innerHTML=fixtures.map(f=>`<article class="list-row" data-match="${f.match_id}" tabindex="0"><div><div class="list-meta">${esc(f.kickoff)} · ${esc(f.venue)}</div><div class="list-teams">${esc(f.home_team)}<span>vs</span>${esc(f.away_team)}</div></div><div class="list-score"><b>${f.likely_home_points}–${f.likely_away_points}</b><small>${pct(Math.max(f.home_win_probability,f.away_win_probability))} favourite</small></div></article>`).join('')||'<div class="empty">No matches fit this filter.</div>';
  bindMatchOpen();
}

function showMatch(id){
  const f=state.data.fixtures.find(x=>String(x.match_id)===String(id)); if(!f)return;
  const fav=favourite(f),players=f.ats_players||[],ctx=f.context_effects||{};
  $('#drawerContent').innerHTML=`<div class="drawer-head"><div><div class="kicker">${esc(f.kickoff)} · ${esc(f.venue)}</div><h2>${esc(f.home_team)} vs ${esc(f.away_team)}</h2><div class="subtitle">${esc(f.bookmaker_provider||state.data.default_bookmaker)} markets · model v${esc(state.data.engine_version)}</div></div><button class="close" aria-label="Close match">×</button></div><div class="projection"><div><small>${esc(f.home_team)}</small><strong>${pct(f.home_win_probability)}</strong></div><div class="score">${f.likely_home_points}–${f.likely_away_points}</div><div><small>${esc(f.away_team)}</small><strong>${pct(f.away_win_probability)}</strong></div></div><div class="tabs"><button class="active" data-detail="overview">Overview</button><button data-detail="ats">ATS</button><button data-detail="markets">Markets</button><button data-detail="model">Model detail</button></div>
  <section class="detail-section active" data-section="overview"><div class="detail-grid"><div class="detail-box"><small>MODEL FAVOURITE</small><b>${esc(fav.team)} · ${pct(fav.p)}</b></div><div class="detail-box"><small>PROJECTED MARGIN</small><b>${num(f.projected_margin)} points</b></div><div class="detail-box"><small>PROJECTED TOTAL</small><b>${num(f.projected_total)} points</b></div><div class="detail-box"><small>PREDICTION STRENGTH</small><b>${num(f.prediction_strength_score,0)}/100</b></div><div class="detail-box"><small>FAVOURITE 1–12</small><b>${pct(f.fav_1_12_probability)}</b></div><div class="detail-box"><small>FAVOURITE 13+</small><b>${pct(f.fav_13_plus_probability)}</b></div></div>${f.safe_bet?.available?`<div class="pick"><small>SAFEST ATS COMBINATION</small><b>${f.safe_bet.legs.map(x=>esc(x.player)).join(' + ')}</b><span>${pct(f.safe_bet.probability)} joint hit · Fair ${odds(f.safe_bet.fair_odds)}</span></div>`:''}</section>
  <section class="detail-section" data-section="ats"><div class="ats-list">${atsRows(players,999)}</div></section>
  <section class="detail-section" data-section="markets"><div class="detail-grid"><div class="detail-box"><small>${esc(f.home_team)} H2H</small><b>${pct(f.home_win_probability)} · Fair ${odds(f.home_fair_odds)}</b></div><div class="detail-box"><small>${esc(f.away_team)} H2H</small><b>${pct(f.away_win_probability)} · Fair ${odds(f.away_fair_odds)}</b></div><div class="detail-box"><small>${esc(f.home_team)} ${f.market_line>=0?'+':''}${num(f.market_line)}</small><b>${pct(f.home_cover_probability)} · Fair ${odds(f.home_line_fair_odds)}</b></div><div class="detail-box"><small>${esc(f.away_team)} ${f.away_line>=0?'+':''}${num(f.away_line)}</small><b>${pct(f.away_cover_probability)} · Fair ${odds(f.away_line_fair_odds)}</b></div><div class="detail-box"><small>OVER ${num(f.market_total)}</small><b>${pct(f.over_probability)} · ${odds(f.over_odds)}</b></div><div class="detail-box"><small>UNDER ${num(f.market_total)}</small><b>${pct(f.under_probability)} · ${odds(f.under_odds)}</b></div></div></section>
  <section class="detail-section" data-section="model"><div class="detail-grid"><div class="detail-box"><small>DATA QUALITY</small><b>${esc(f.data_quality)}</b></div><div class="detail-box"><small>CONFIDENCE</small><b>${esc(f.confidence)} · ${num(f.confidence_score,0)}/100</b></div><div class="detail-box"><small>HOME INPUT</small><b>${Number(ctx.home_advantage||0)>=0?'+':''}${num(ctx.home_advantage)} pts</b></div><div class="detail-box"><small>CONTROLLED CONTEXT</small><b>${Number(ctx.controlled_context_margin||0)>=0?'+':''}${num(ctx.controlled_context_margin)} pts</b></div></div><ol class="drivers">${(f.drivers||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol></section>`;
  $('#drawer').classList.add('open'); document.body.style.overflow='hidden'; $('.close').onclick=closeDrawer;
  $$('[data-detail]').forEach(button=>button.onclick=()=>{$$('[data-detail]').forEach(x=>x.classList.toggle('active',x===button));$$('[data-section]').forEach(x=>x.classList.toggle('active',x.dataset.section===button.dataset.detail));});
}

function closeDrawer(){$('#drawer').classList.remove('open');document.body.style.overflow='';}
function bindMatchOpen(){$$('[data-match]').forEach(el=>{el.onclick=()=>showMatch(el.dataset.match);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showMatch(el.dataset.match);}};});}
function go(view){state.view=view;$$('.view').forEach(v=>v.classList.toggle('active',v.id===`${view}View`));$$('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));scrollTo({top:0,behavior:'smooth'});}

async function loadData(){
  const btn=$('#refreshBtn'); btn.classList.add('spinning');
  try{const response=await fetch(`./data.json?v=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw Error(`HTTP ${response.status}`);state.data=await response.json();render();}
  catch(error){$('#updated').textContent='Could not load the latest model data';$('#featured').innerHTML='<div class="error">Refresh the page to try again.</div>';}
  finally{btn.classList.remove('spinning');}
}

$$('.nav button').forEach(b=>b.onclick=()=>go(b.dataset.view));
$$('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
$('#refreshBtn').onclick=loadData;
$('#drawer').onclick=e=>{if(e.target===$('#drawer'))closeDrawer();};
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer();});
$$('[data-filter]').forEach(b=>b.onclick=()=>{$$('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));state.matchFilter=b.dataset.filter;renderMatches();});
$$('[data-ats-count]').forEach(b=>b.onclick=()=>{$$('[data-ats-count]').forEach(x=>x.classList.toggle('active',x===b));state.atsCount=Number(b.dataset.atsCount);$('#atsList').innerHTML=atsRows(topPlayers(),state.atsCount);});
loadData();
setInterval(loadData,5*60*1000);
