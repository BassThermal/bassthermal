import fs from 'node:fs';
import path from 'node:path';

const file = path.join(process.cwd(), 'public', 'visits-terminal.js');
let source = fs.readFileSync(file, 'utf8');

function replaceOnce(before, after, label) {
  if (source.includes(after)) return;
  if (!source.includes(before)) throw new Error(`Visits runtime patch marker missing: ${label}`);
  source = source.replace(before, after);
}

replaceOnce(
  "const state = { active: false, timer: null, block: null, body: null, inFlight: false, lastData: null };",
  "const state = { active: false, timer: null, block: null, body: null, inFlight: false, lastData: null, generation: 0 };",
  'generation state'
);

replaceOnce(
  "return value === 'visits' || value === 'visits now' || value === 'visits today' || value === 'visits pages' || value === 'visits apps' || value === 'visits clicks' || value === 'visits health' || value === 'visits off' || /^city\\s+.+\\s+[a-z]{2,3}$/i.test(value);",
  "return value === 'visits' || value === 'visits all' || value === 'visits live' || value === 'visits now' || value === 'visits today' || value === 'visits pages' || value === 'visits apps' || value === 'visits clicks' || value === 'visits health' || value === 'visits off' || /^city\\s+.+\\s+[a-z]{2,3}$/i.test(value);",
  'documented aliases'
);

replaceOnce(
  "function stopMonitor() {\n    state.active = false;\n    state.inFlight = false;",
  "function stopMonitor() {\n    state.generation += 1;\n    state.active = false;\n    state.inFlight = false;",
  'monitor invalidation'
);

replaceOnce(
  "function schedule() {\n    if (!state.active) return;",
  "function schedule() {\n    if (!state.active || document.visibilityState !== 'visible' || !overlay.classList.contains('open')) return;",
  'visibility-aware schedule'
);

replaceOnce(
  "async function refreshMonitor() {\n    if (!state.active || state.inFlight || !state.body) return;\n    state.inFlight = true;\n    try {\n      const data = await requestJson('/api/visits/summary');\n      state.lastData = data;\n      state.body.innerHTML = renderSummary(data);\n    } catch (error) {\n      state.body.innerHTML = renderError(error);\n    } finally {\n      state.inFlight = false;\n      schedule();\n    }\n  }",
  "async function refreshMonitor() {\n    if (!state.active || state.inFlight || !state.body || document.visibilityState !== 'visible' || !overlay.classList.contains('open')) return;\n    const generation = state.generation;\n    const body = state.body;\n    state.inFlight = true;\n    try {\n      const data = await requestJson('/api/visits/summary');\n      if (generation !== state.generation || body !== state.body || !state.active) return;\n      state.lastData = data;\n      body.innerHTML = renderSummary(data);\n    } catch (error) {\n      if (generation === state.generation && body === state.body && state.active) body.innerHTML = renderError(error);\n    } finally {\n      if (generation === state.generation) {\n        state.inFlight = false;\n        schedule();\n      }\n    }\n  }",
  'generation-safe refresh'
);

replaceOnce(
  "const normalized = normalize(command);\n    showTerminal();",
  "const requested = normalize(command);\n    const normalized = requested === 'visits all' ? 'visits today' : requested === 'visits live' ? 'visits now' : requested;\n    showTerminal();",
  'alias routing'
);

replaceOnce(
  "document.addEventListener('visibilitychange', () => {\n    if (document.visibilityState === 'visible' && state.active && !state.inFlight) refreshMonitor();\n  });",
  "document.addEventListener('visibilitychange', () => {\n    if (document.visibilityState === 'hidden') {\n      if (state.timer) clearTimeout(state.timer);\n      state.timer = null;\n      return;\n    }\n    if (state.active && overlay.classList.contains('open') && !state.inFlight) refreshMonitor();\n  });\n\n  new MutationObserver(() => {\n    if (!overlay.classList.contains('open') && state.active) stopMonitor();\n  }).observe(overlay, { attributes: true, attributeFilter: ['class'] });",
  'hidden and closed monitor pause'
);

fs.writeFileSync(file, source, 'utf8');
console.log('PASS  Visits runtime aliases, visibility, and request generations finalized');
