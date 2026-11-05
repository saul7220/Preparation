/* Optional, locally synthesized ambience; starts only on an explicit sound click. */
export function createIntroAudio() {
  let ctx, master, breath, enabled = false, lastLine = -1;
  const lines = [
    [3, 'Sistemas listos. Entorno cargado.'],
    [13, 'Cada paso tiene un costo.'],
    [18, 'Elige hasta dónde explorar.'],
  ];
  return {
    async toggle() {
      enabled = !enabled;
      if (enabled && !ctx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) { enabled = false; return false; }
        ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
        for (const frequency of [55, 82.41, 110.15]) {
          const tone = ctx.createOscillator(), gain = ctx.createGain();
          tone.type = 'sine'; tone.frequency.value = frequency; gain.gain.value = 0.055;
          tone.connect(gain).connect(master); tone.start();
        }
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
        const data = buffer.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
        source.buffer = buffer; source.loop = true; filter.type = 'lowpass'; filter.frequency.value = 420;
        breath = ctx.createGain(); breath.gain.value = .015;
        source.connect(filter).connect(breath).connect(master); source.start();
      }
      if (enabled) {
        try { await ctx.resume(); } catch { enabled = false; }
      } else if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      return enabled;
    },
    update(t, paused) {
      if (ctx) {
        master.gain.setTargetAtTime(enabled && !paused ? 0.65 : 0, ctx.currentTime, .15);
        breath.gain.value = .012 + .026 * Math.max(0, Math.sin(t * 1.65));
      }
      const index = lines.findLastIndex(([start]) => t >= start);
      if (index !== lastLine) {
        lastLine = index;
        if (enabled && !paused && index >= 0 && 'speechSynthesis' in window) {
          const voice = new SpeechSynthesisUtterance(lines[index][1]);
          voice.lang = 'es-MX'; voice.rate = .87; voice.pitch = .8; voice.volume = .6;
          window.speechSynthesis.cancel(); window.speechSynthesis.speak(voice);
        }
      }
    },
    silence() { if (ctx) master.gain.setTargetAtTime(0, ctx.currentTime, .05); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); },
    dispose() { enabled = false; if (ctx) ctx.close().catch(() => {}); if ('speechSynthesis' in window) window.speechSynthesis.cancel(); },
  };
}
