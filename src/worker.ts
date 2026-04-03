import { evapPipeline, getEvapReport, getLockStats } from './lib/evaporation-pipeline.js';
import { selectModel } from './lib/model-router.js';
import { trackConfidence, getConfidence } from './lib/confidence-tracker.js';
import { loadBYOKConfig, saveBYOKConfig, callLLM, generateSetupHTML } from './lib/byok.js';
import { deadbandCheck, deadbandStore, getEfficiencyStats } from './lib/deadband.js';
import { logResponse } from './lib/response-logger.js';

const BRAND = '#22c55e';
const NAME = 'ActiveLog.ai';
const TAGLINE = 'Watch AI build your training plan';

const FLEET = { name: NAME, tier: 2, domain: 'athletics-training', fleetVersion: '2.0.0', builtBy: 'Superinstance & Lucineer (DiGennaro et al.)' };

const SEED_DATA = {
  training: {
    frameworks: ['Linear Periodization', 'Undulating Periodization', 'Conjugate Method', '5/3/1', 'Hypertrophy-Specific Training', 'HIIT', 'Zone 2 Base Building'],
    muscleGroups: ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads', 'Hamstrings', 'Glutes', 'Core', 'Calves'],
    principles: ['Progressive Overload', 'Specificity', 'Recovery', 'Volume Management', 'Intensity Management', 'Deload'],
    sportSpecific: ['Powerlifting', 'Olympic Lifting', 'CrossFit', 'Running', 'Cycling', 'Swimming', 'Martial Arts', 'Team Sports'],
  },
};

function landingHTML(): string {
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${NAME} — ${TAGLINE}</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',system-ui;background:#0a0a0a;color:#e0e0e0;overflow-x:hidden}
.hero{background:linear-gradient(135deg,#22c55e,#16a34a);padding:3rem 2rem 2rem;text-align:center;position:relative}
.hero::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(255,255,255,.08) 0%,transparent 60%);pointer-events:none}
.hero h1{font-size:2.8rem;color:#fff;margin-bottom:.5rem;font-weight:800}.hero p{color:#bbf7d0;font-size:1.1rem}
.badge{display:inline-block;background:rgba(0,0,0,.2);padding:.4rem 1rem;border-radius:20px;font-size:.8rem;color:#fff;margin-top:1rem}

.demo{max-width:860px;margin:2rem auto;padding:0 1rem}
.demo-label{text-align:center;color:#22c55e;font-size:.85rem;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:1rem}
.terminal{background:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;font-family:'JetBrains Mono',monospace;font-size:.82rem;line-height:1.7}
.term-bar{background:#1a1a1a;padding:.6rem 1rem;display:flex;gap:.5rem;align-items:center}
.dot{width:10px;height:10px;border-radius:50%}.r{background:#ff5f57}.y{background:#febc2e}.g{background:#28c840}
.term-title{margin-left:.75rem;color:#555;font-size:.75rem}
.term-body{padding:1rem 1.25rem;max-height:520px;overflow-y:auto}
.msg{margin-bottom:.85rem;animation:fadein .4s ease both}
@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.msg:nth-child(1){animation-delay:.1s}.msg:nth-child(2){animation-delay:.4s}.msg:nth-child(3){animation-delay:.7s}.msg:nth-child(4){animation-delay:1s}.msg:nth-child(5){animation-delay:1.3s}.msg:nth-child(6){animation-delay:1.6s}.msg:nth-child(7){animation-delay:1.9s}.msg:nth-child(8){animation-delay:2.2s}.msg:nth-child(9){animation-delay:2.5s}
.ts{color:#555;font-size:.72rem}
.msg-user{color:#bbf7d0}.msg-user strong{color:#fff}
.msg-agent{color:#4ade80}.msg-agent strong{color:#fbbf24}
.msg-sys{color:#666;font-style:italic}
.msg-success{color:#34d399;padding:.5rem .75rem;background:rgba(52,211,153,.06);border-left:3px solid #34d399;border-radius:0 6px 6px 0}
.msg-tip{color:#fbbf24;padding:.5rem .75rem;background:rgba(251,191,36,.06);border-left:3px solid #fbbf24;border-radius:0 6px 6px 0}
.workout-block{background:#0d1a0d;border:1px solid #1a2f1a;border-radius:8px;padding:.75rem 1rem;margin-top:.5rem}
.wk-title{color:#22c55e;font-size:.75rem;text-transform:uppercase;letter-spacing:1px;margin-bottom:.5rem}
.wk-row{display:flex;justify-content:space-between;padding:.2rem 0;font-size:.8rem;border-bottom:1px solid #1a2f1a}.wk-row:last-child{border:none}
.wk-ex{color:#e0e0e0}.wk-sets{color:#888}.wk-rest{color:#4ade80}

.plan{max-width:860px;margin:2rem auto;padding:0 1rem}
.plan h2{color:#22c55e;font-size:1.1rem;margin-bottom:1rem}
.plan-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.75rem}
@media(max-width:600px){.plan-grid{grid-template-columns:1fr}}
.pcard{background:#111;border:1px solid #1f1f1f;border-radius:10px;padding:1rem}
.pcard h3{color:#fbbf24;font-size:.8rem;margin-bottom:.5rem}.pcard ul{list-style:none;padding:0}
.pcard li{color:#888;font-size:.78rem;padding:.2rem 0}.pcard li span{color:#4ade80}

.byok{max-width:560px;margin:2.5rem auto;padding:0 1rem;text-align:center}
.byok h2{color:#bbf7d0;font-size:1.2rem;margin-bottom:.75rem}
.byok p{color:#666;font-size:.85rem;margin-bottom:1rem}
.byok form{display:flex;gap:.5rem}
.byok input{flex:1;background:#111;border:1px solid #2a2a2a;color:#e0e0e0;padding:.7rem 1rem;border-radius:8px;font-family:'JetBrains Mono',monospace;font-size:.8rem;outline:none}
.byok input:focus{border-color:#22c55e}
.byok button{background:#22c55e;color:#fff;border:none;padding:.7rem 1.5rem;border-radius:8px;font-weight:700;cursor:pointer}

.fork-bar{max-width:860px;margin:2rem auto;padding:0 1rem;display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}
.fork-bar a{display:inline-flex;align-items:center;gap:.5rem;padding:.6rem 1.2rem;background:#111;border:1px solid #2a2a2a;border-radius:8px;color:#bbf7d0;text-decoration:none;font-size:.85rem;font-weight:600;transition:border-color .2s}
.fork-bar a:hover{border-color:#22c55e}

.footer{text-align:center;padding:2rem;color:#333;font-size:.75rem;border-top:1px solid #1a1a1a}
</style></head><body>
<div class="hero">
  <h1>${NAME}</h1>
  <p>${TAGLINE}</p>
  <div class="badge">💪 AI Training Coach · BYOK · Fleet Protocol</div>
</div>

<div class="demo">
  <div class="demo-label">⚡ Live Plan Generation</div>
  <div class="terminal">
    <div class="term-bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="term-title">activelog://training-plan</div></div>
    <div class="term-body">
      <div class="msg msg-user"><span class="ts">06:15:01</span> <strong>You:</strong> I'm a runner, intermediate level, training 3x/week. Want to improve my 5K time. Currently at 24:30.</div>
      <div class="msg msg-agent"><span class="ts">06:15:04</span> <strong>ActiveLog Coach:</strong> Great baseline! A 24:30 5K puts you at ~4:54/km pace. Let's target sub-23:00 in 8 weeks with progressive overload.</div>
      <div class="msg msg-sys"><span class="ts">06:15:06</span> ── Profile set: Runner · Intermediate · 3x/week · Goal: Sub-23:00 5K · Timeline: 8 weeks</div>
      <div class="msg msg-agent"><span class="ts">06:15:10</span> <strong>Week 1-2 — Base Building:</strong> Easy runs at 5:30/km, one tempo at 4:45/km. Volume: 15km/week. Focus: aerobic efficiency.</div>
      <div class="msg msg-workout-block"><span class="ts">06:15:13</span> <strong>📋 Week 1 Schedule</strong>
        <div class="workout-block">
          <div class="wk-row"><span class="wk-ex">Day 1: Easy Run</span><span class="wk-sets">5km @ 5:30/km</span><span class="wk-rest">90s walk breaks ok</span></div>
          <div class="wk-row"><span class="wk-ex">Day 2: Tempo</span><span class="wk-sets">3×1km @ 4:45/km</span><span class="wk-rest">2min jog recovery</span></div>
          <div class="wk-row"><span class="wk-ex">Day 3: Long Easy</span><span class="wk-sets">7km @ 5:45/km</span><span class="wk-rest">conversational pace</span></div>
        </div>
      </div>
      <div class="msg msg-agent"><span class="ts">06:15:16</span> <strong>Week 3-4 — Speed Introduction:</strong> Adding 200m intervals at 4:15/km pace. Tempo extends to 4km. Volume: 18km/week.</div>
      <div class="msg msg-tip"><span class="ts">06:15:19</span> 💡 <strong>Form Tip:</strong> Focus on cadence (target 170+ spm) and forward lean from ankles. Your current 24:30 suggests good endurance — the gains will come from stride efficiency.</div>
      <div class="msg msg-agent"><span class="ts">06:15:22</span> <strong>Week 5-8 — Peak Phase:</strong> Intervals down to 400m at goal pace (4:35/km). Final week taper. Race week: 2 easy runs + 5K attempt.</div>
      <div class="msg msg-success"><span class="ts">06:15:25</span> ✓ Full 8-week plan generated and saved. Deload built into week 4. Next workout: Tomorrow — Easy Run 5km. I'll track your adaptations.</div>
    </div>
  </div>
</div>

<div class="plan">
  <h2>📋 Progressive Overload Timeline</h2>
  <div class="plan-grid">
    <div class="pcard"><h3>Weeks 1-2: Base</h3><ul><li>Easy: 5-7km @ 5:30/km</li><li>Tempo: 3km @ 4:45/km</li><li>Volume: <span>15km/wk</span></li><li>Focus: Aerobic base</li></ul></div>
    <div class="pcard"><h3>Weeks 3-4: Speed</h3><ul><li>Intervals: 6×200m @ 4:15/km</li><li>Tempo: 4km @ 4:40/km</li><li>Volume: <span>18km/wk</span></li><li>Deload in week 4</li></ul></div>
    <div class="pcard"><h3>Weeks 5-8: Peak</h3><ul><li>Intervals: 6×400m @ 4:35/km</li><li>Tempo: 5km @ 4:35/km</li><li>Volume: <span>20km/wk</span></li><li>Week 8: Race + taper</li></ul></div>
  </div>
</div>

<div class="byok">
  <h2>🔑 Bring Your Own Key</h2>
  <p>Add your LLM API key to get personalized training plans.</p>
  <form action="/setup" method="get"><input type="text" placeholder="sk-... or your provider key" readonly><button type="submit">Configure</button></form>
</div>

<div class="fork-bar">
  <a href="https://github.com/Lucineer/activelog-ai" target="_blank">⭐ Star</a>
  <a href="https://github.com/Lucineer/activelog-ai/fork" target="_blank">🔀 Fork</a>
  <a href="https://github.com/Lucineer/activelog-ai" target="_blank">📋 git clone https://github.com/Lucineer/activelog-ai.git</a>
</div>

<div class="footer">${NAME} — Built by Superinstance & Lucineer (DiGennaro et al.) · Part of the Cocapn Fleet</div>
</body></html>`;
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const headers = { 'Content-Type': 'text/html;charset=utf-8' };
    const jsonHeaders = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
    }

    if (url.pathname === '/') return new Response(landingHTML(), { headers });
    if (url.pathname === '/health') return new Response(JSON.stringify({ status: 'ok', service: NAME, fleet: FLEET }), { headers: jsonHeaders });
    if (url.pathname === '/setup') return new Response(generateSetupHTML(NAME, BRAND), { headers });

    if (url.pathname === '/api/seed') {
      return new Response(JSON.stringify({ service: NAME, seed: SEED_DATA, fleet: FLEET }), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/byok/config') {
      if (request.method === 'GET') {
        const config = await loadBYOKConfig(env);
        return new Response(JSON.stringify({ configured: !!config, provider: config?.provider || null }), { headers: jsonHeaders });
      }
      if (request.method === 'POST') {
        const body = await request.json();
        await saveBYOKConfig(env, body);
        return new Response(JSON.stringify({ saved: true }), { headers: jsonHeaders });
      }
    }
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const config = await loadBYOKConfig(env);
        if (!config) return new Response(JSON.stringify({ error: 'No provider configured. Visit /setup' }), { status: 401, headers: jsonHeaders });
        const body = await request.json();
        const messages = [{ role: 'system', content: 'You are ActiveLog.ai, an AI athletics and training coach agent.' }, ...(body.messages || [{ role: 'user', content: body.message || '' }])];
        const userMessage = (body.messages || [{ role: 'user', content: body.message || '' }]).map((m) => m.content).join(' ');
        const cached = await deadbandCheck(env, userMessage);
        let resp;
        if (cached) { resp = cached; } else { resp = await callLLM(config.apiKey, messages, config.provider, config.model); await deadbandStore(env, userMessage, resp); }
        return new Response(JSON.stringify({ response: resp }), { headers: jsonHeaders });
      } catch (e: any) { return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: jsonHeaders }); }
    }
    if (url.pathname === '/api/routines') {
      return new Response(JSON.stringify({ service: NAME, routines: [], message: 'Workout routines — coming soon' }), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/workouts') {
      return new Response(JSON.stringify({ service: NAME, workouts: [], message: 'Workout logging — coming soon' }), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/activities') {
      return new Response(JSON.stringify({ service: NAME, endpoint: '/api/activities', message: 'Activity logging — coming soon' }), { headers: jsonHeaders });
    }
    if (url.pathname === '/api/stats') {
      return new Response(JSON.stringify({ service: NAME, endpoint: '/api/stats', message: 'Performance statistics — coming soon' }), { headers: jsonHeaders });
    }

    if (url.pathname === '/api/confidence') {
      const scores = await getConfidence(env);
      return new Response(JSON.stringify(scores), { headers: jsonHeaders });
    }
    return new Response('{"error":"Not Found"}', { status: 404, headers: jsonHeaders });
  },
};