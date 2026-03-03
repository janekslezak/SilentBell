// ─── Audio Engine Module ─────────────────────────────────────────
// Hybrid audio system: Web Audio API for synthesis + HTML5 Audio for locked-screen playback

import { getAudioContext } from './audio-context.js';

export { getAudioContext, ensureAudioContext, unlockAudio } from './audio-context.js';

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isAndroid = /Android/.test(navigator.userAgent);

const DEBUG = true;
function log(...args) {
  if (DEBUG) console.log('[Audio]', ...args);
}

let audioMode = 'auto';

const audioCache = new Map();
const audioPreloadPromises = new Map();
let activeAudioElements = [];

// Loading state tracking
let isLoading = false;
let loadingProgress = 0;
const loadingCallbacks = [];

const AUDIO_FILES = {
  'bell': {
    start: 'sounds/sequence_bell_start.mp3',
    interval: 'sounds/sequence_bell_interval.mp3',
    end: 'sounds/sequence_bell_end.mp3',
    single: 'sounds/temple_bell_standard.mp3'
  },
  'bell-high': {
    start: 'sounds/sequence_bell_high_start.mp3',
    interval: 'sounds/sequence_bell_high_interval.mp3',
    end: 'sounds/sequence_bell_high_end.mp3',
    single: 'sounds/temple_bell_high.mp3'
  },
  'chugpi': {
    start: 'sounds/sequence_chugpi_start.mp3',
    interval: 'sounds/sequence_chugpi_interval.mp3',
    end: 'sounds/sequence_chugpi_end.mp3',
    single: 'sounds/chugpi.mp3'
  }
};

export function detectBestAudioMode() {
  if (isIOS) {
    log('iOS detected - using HTML5 Audio');
    return 'html5';
  }
  
  if (isAndroid) {
    log('Android detected - using HTML5 Audio for locked screen support');
    return 'html5';
  }
  
  log('Desktop detected - using Web Audio API');
  return 'webaudio';
}

export function setAudioMode(mode) {
  if (['auto', 'webaudio', 'html5'].includes(mode)) {
    audioMode = mode;
    log('Audio mode set to:', mode);
  }
}

export function getAudioMode() {
  if (audioMode === 'auto') {
    return detectBestAudioMode();
  }
  return audioMode;
}

// Loading state management
export function isAudioLoading() {
  return isLoading;
}

export function getLoadingProgress() {
  return loadingProgress;
}

export function onLoadingProgress(callback) {
  loadingCallbacks.push(callback);
  return () => {
    const idx = loadingCallbacks.indexOf(callback);
    if (idx > -1) loadingCallbacks.splice(idx, 1);
  };
}

function setLoading(loading) {
  isLoading = loading;
  loadingCallbacks.forEach(cb => cb({ loading, progress: loadingProgress }));
}

function setProgress(progress) {
  loadingProgress = progress;
  loadingCallbacks.forEach(cb => cb({ loading: isLoading, progress }));
}

function getAudioElement(src) {
  if (audioCache.has(src)) {
    return audioCache.get(src);
  }
  
  const audio = new Audio(src);
  audio.preload = 'auto';
  audioCache.set(src, audio);
  return audio;
}

export function preloadAudio(src) {
  if (audioPreloadPromises.has(src)) {
    return audioPreloadPromises.get(src);
  }
  
  const promise = new Promise((resolve, reject) => {
    const audio = getAudioElement(src);
    
    if (audio.readyState >= 3) {
      log('Audio already loaded:', src);
      resolve(audio);
      return;
    }
    
    const timeoutId = setTimeout(() => {
      if (audio.readyState >= 2) {
        log('Audio load timeout but readyState ok:', src, 'readyState:', audio.readyState);
        resolve(audio);
      } else {
        log('Audio load timeout:', src, 'readyState:', audio.readyState);
        // Don't reject - try to use it anyway on iOS
        if (isIOS) {
          resolve(audio);
        } else {
          reject(new Error(`Timeout loading ${src}`));
        }
      }
    }, 8000);
    
    const onCanPlay = () => {
      clearTimeout(timeoutId);
      log('Audio can play:', src);
      resolve(audio);
    };
    
    const onError = (e) => {
      clearTimeout(timeoutId);
      log('Audio load error:', src, e);
      // On iOS, still resolve as the audio might work on user gesture
      if (isIOS) {
        resolve(audio);
      } else {
        reject(new Error(`Failed to load ${src}`));
      }
    };
    
    audio.addEventListener('canplaythrough', onCanPlay, { once: true });
    audio.addEventListener('canplay', onCanPlay, { once: true });
    audio.addEventListener('error', onError, { once: true });
    
    // Force load
    audio.load();
  });
  
  audioPreloadPromises.set(src, promise);
  return promise;
}

export async function preloadSoundSet(soundType, onProgress = null) {
  const files = AUDIO_FILES[soundType];
  if (!files) {
    log('No files found for sound type:', soundType);
    return;
  }
  
  setLoading(true);
  setProgress(0);
  
  const soundFiles = [files.start, files.interval, files.end];
  const total = soundFiles.length;
  let loaded = 0;
  
  try {
    log('Preloading sound set:', soundType);
    
    await Promise.all(soundFiles.map(async (src, index) => {
      try {
        await preloadAudio(src);
        loaded++;
        const progress = Math.round((loaded / total) * 100);
        setProgress(progress);
        if (onProgress) onProgress(progress);
        log(`Loaded ${loaded}/${total}:`, src);
      } catch (error) {
        log('Failed to preload:', src, error.message);
        // Continue even if one fails
        loaded++;
      }
    }));
    
    log(`Preloaded ${soundType} sound set (${loaded}/${total} files)`);
  } catch (error) {
    log('Failed to preload sound set:', error.message);
  } finally {
    setLoading(false);
  }
}

// iOS-specific: Preload with user gesture simulation
export async function preloadWithUserGesture(soundType) {
  if (!isIOS) {
    return preloadSoundSet(soundType);
  }
  
  log('iOS: Preloading with user gesture context');
  setLoading(true);
  
  const files = AUDIO_FILES[soundType] || AUDIO_FILES['bell'];
  
  try {
    // On iOS, we need to create and play a silent sound to unlock audio
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Preload all files
    await Promise.all([
      preloadAudio(files.start),
      preloadAudio(files.interval),
      preloadAudio(files.end)
    ]);
    
    log('iOS: Sound set preloaded successfully');
  } catch (error) {
    log('iOS: Preload error (non-fatal):', error.message);
  } finally {
    setLoading(false);
  }
}

export function stopAllAudio() {
  activeAudioElements.forEach(audio => {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {}
  });
  activeAudioElements = [];
}

async function playHTML5Audio(src, volume = 1.0) {
  try {
    const audio = getAudioElement(src);
    audio.volume = volume;
    audio.currentTime = 0;
    
    activeAudioElements.push(audio);
    
    audio.addEventListener('ended', () => {
      const idx = activeAudioElements.indexOf(audio);
      if (idx > -1) activeAudioElements.splice(idx, 1);
    }, { once: true });
    
    // iOS: ensure we have user gesture context
    if (isIOS && audio.readyState < 2) {
      log('iOS: Audio not fully loaded, waiting...');
      await new Promise((resolve) => {
        const checkReady = () => {
          if (audio.readyState >= 2 || audio.error) {
            resolve();
          } else {
            setTimeout(checkReady, 50);
          }
        };
        checkReady();
      });
    }
    
    await audio.play();
    log('Playing HTML5 audio:', src);
    return true;
  } catch (error) {
    log('HTML5 audio playback failed:', error.message);
    return false;
  }
}

export async function playSound(type, timeSeconds = 0) {
  if (type === 'none') return;
  
  const mode = getAudioMode();
  
  if (mode === 'html5') {
    const files = AUDIO_FILES[type] || AUDIO_FILES['bell'];
    setTimeout(() => {
      playHTML5Audio(files.single, 1.0);
    }, timeSeconds * 1000);
  } else {
    playWebAudioSound(type, timeSeconds);
  }
}

export async function playStrokes(type, count, startDelay = 0) {
  if (type === 'none') return;
  
  const mode = getAudioMode();
  
  if (mode === 'html5') {
    const files = AUDIO_FILES[type] || AUDIO_FILES['bell'];
    setTimeout(() => {
      playHTML5Audio(files.start, 1.0);
    }, startDelay * 1000);
  } else {
    playWebAudioStrokes(type, count, startDelay);
  }
}

export async function playStartSound(type) {
  if (type === 'none') return;
  
  const mode = getAudioMode();
  const files = AUDIO_FILES[type] || AUDIO_FILES['bell'];
  
  log('Playing start sound:', type, 'mode:', mode);
  
  if (mode === 'html5') {
    const success = await playHTML5Audio(files.start, 1.0);
    if (!success && isIOS) {
      // iOS fallback: try playing a short silent sound first to unlock
      log('iOS: Trying unlock fallback for start sound');
      try {
        const silent = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAAAAAA==');
        await silent.play();
        await new Promise(r => setTimeout(r, 100));
        await playHTML5Audio(files.start, 1.0);
      } catch (e) {
        log('iOS: Fallback failed:', e.message);
      }
    }
  } else {
    if (type === 'chugpi') {
      playWebAudioStrokes(type, 3, 0);
    } else {
      playWebAudioSound(type, 0);
    }
  }
}

export async function playIntervalSound(type) {
  if (type === 'none') return;
  
  const mode = getAudioMode();
  const files = AUDIO_FILES[type] || AUDIO_FILES['bell'];
  
  if (mode === 'html5') {
    await playHTML5Audio(files.interval, 0.8);
  } else {
    playWebAudioSound(type, 0);
  }
}

export async function playEndSound(type) {
  if (type === 'none') return;
  
  const mode = getAudioMode();
  const files = AUDIO_FILES[type] || AUDIO_FILES['bell'];
  
  if (mode === 'html5') {
    await playHTML5Audio(files.end, 1.0);
  } else {
    playWebAudioEndSequence(type);
  }
}

let chugpiMaster = null;

export function getChugpiMaster() {
  const ctx = getAudioContext();
  if (!chugpiMaster) {
    chugpiMaster = ctx.createDynamicsCompressor();
    chugpiMaster.threshold.value = -10; 
    chugpiMaster.knee.value = 8;
    chugpiMaster.ratio.value = 2.5; 
    chugpiMaster.attack.value = 0.001;
    chugpiMaster.release.value = 0.15;
    chugpiMaster.connect(ctx.destination);
    
    const primeBuf = ctx.createBuffer(1, 2048, ctx.sampleRate);
    const primeSrc = ctx.createBufferSource();
    primeSrc.buffer = primeBuf; 
    primeSrc.connect(chugpiMaster); 
    primeSrc.start(0);
  }
  return chugpiMaster;
}

export function resetChugpiMaster() {
  chugpiMaster = null;
}

function playWebAudioSound(type, timeSeconds = 0) {
  const ctx = getAudioContext();
  
  function doPlay() { 
    if (type === 'bell-high') {
      playTempleBellHigh(ctx.currentTime + timeSeconds); 
    } else if (type === 'chugpi') {
      playChugpiNow(ctx.currentTime + timeSeconds);
    } else {
      playTempleBell(ctx.currentTime + timeSeconds); 
    }
  }
  
  if (ctx.state === 'suspended') { 
    ctx.resume().then(doPlay).catch(() => doPlay()); 
  } else { 
    doPlay(); 
  }
}

function playWebAudioStrokes(type, count, startDelay = 0) {
  if (type === 'none') return;
  
  const interval = type === 'chugpi' ? 1.5 : 1.4;
  
  if (type === 'chugpi') {
    const ctx = getAudioContext(); 
    getChugpiMaster();
    const leadIn = 0.15;
    
    for (let i = 0; i < count; i++) {
      const delay = leadIn + startDelay + i * interval;
      
      function doPlay() { 
        playChugpiNow(ctx.currentTime + delay, 1.0); 
      }
      
      if (ctx.state === 'suspended') { 
        ctx.resume().then(doPlay).catch(() => doPlay()); 
      } else { 
        doPlay(); 
      }
    }
  } else {
    for (let i = 0; i < count; i++) {
      playWebAudioSound(type, startDelay + i * interval);
    }
  }
}

function playWebAudioEndSequence(type) {
  const ctx = getAudioContext();
  
  function doEnding() {
    const now = ctx.currentTime;
    
    if (type === 'chugpi') {
      getChugpiMaster();
      playChugpiNow(now + 0.15, 1.0);
      playChugpiNow(now + 1.65, 1.0);
      playChugpiNow(now + 3.15, 1.0);
    } else if (type === 'bell-high') {
      playSingingBowlEdgeHigh(now + 0.0);
      playTempleBellHigh(now + 1.8, 0.55);
      playTempleBellHigh(now + 5.8, 1.0);
      playTempleBellHigh(now + 9.8, 1.0);
    } else {
      playSingingBowlEdge(now + 0.0);
      playTempleBell(now + 1.8, 0.55);
      playTempleBell(now + 5.8, 1.0);
      playTempleBell(now + 9.8, 1.0);
    }
  }
  
  if (ctx.state === 'suspended') { 
    ctx.resume().then(doEnding).catch(doEnding); 
  } else { 
    doEnding(); 
  }
}

function playTempleBell(startTime, velocity = 1.0) {
  const ctx = getAudioContext();
  const t0 = startTime ?? ctx.currentTime;
  
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -18; 
  master.knee.value = 20; 
  master.ratio.value = 1.5;
  master.attack.value = 0.02; 
  master.release.value = 0.5;
  
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; 
  lpf.frequency.value = 6000; 
  lpf.Q.value = 0.5;
  
  const tailFade = ctx.createGain();
  tailFade.gain.setValueAtTime(1.0, t0);
  tailFade.gain.setValueAtTime(1.0, t0 + 10.0);
  tailFade.gain.exponentialRampToValueAtTime(0.0001, t0 + 17.0);
  
  master.connect(lpf); 
  lpf.connect(tailFade); 
  tailFade.connect(ctx.destination);
  
  const clankSize = Math.floor(ctx.sampleRate * 0.04);
  const clankBuf = ctx.createBuffer(1, clankSize, ctx.sampleRate);
  const clankData = clankBuf.getChannelData(0);
  for (let i = 0; i < clankSize; i++) {
    clankData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clankSize, 3);
  }
  
  const clankSrc = ctx.createBufferSource();
  clankSrc.buffer = clankBuf;
  
  const clankBp = ctx.createBiquadFilter();
  clankBp.type = 'bandpass'; 
  clankBp.frequency.value = 4000; 
  clankBp.Q.value = 0.5;
  
  const clankGain = ctx.createGain();
  clankGain.gain.setValueAtTime(0.0, t0);
  clankGain.gain.linearRampToValueAtTime(0.30 * velocity, t0 + 0.004);
  clankGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.07);
  
  clankSrc.connect(clankBp); 
  clankBp.connect(clankGain); 
  clankGain.connect(master);
  clankSrc.start(t0); 
  clankSrc.stop(t0 + 0.08);
  
  function addPartial(freq, gainPeak, attackTime, decayTime) {
    const osc = ctx.createOscillator();
    osc.type = 'sine'; 
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0, t0);
    env.gain.linearRampToValueAtTime(gainPeak * velocity, t0 + attackTime);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decayTime);
    osc.connect(env); 
    env.connect(master);
    osc.start(t0); 
    osc.stop(t0 + decayTime + 2.0);
  }
  
  addPartial(110,  0.32, 0.015, 16.0);
  addPartial(304,  0.22, 0.010, 11.0);
  addPartial(594,  0.14, 0.008,  8.0);
  addPartial(982,  0.08, 0.005, 5.5);
  addPartial(1627, 0.04, 0.004, 3.5);
  
  const shimmerLfo = ctx.createOscillator();
  shimmerLfo.type = 'sine'; 
  shimmerLfo.frequency.value = 4.5;
  const shimmerDepth = ctx.createGain(); 
  shimmerDepth.gain.value = 0.02;
  const shimmerFund = ctx.createOscillator();
  shimmerFund.type = 'sine'; 
  shimmerFund.frequency.value = 110;
  const shimmerEnv = ctx.createGain();
  shimmerEnv.gain.setValueAtTime(0.0, t0);
  shimmerEnv.gain.linearRampToValueAtTime(0.06 * velocity, t0 + 0.08);
  shimmerEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 14.0);
  shimmerLfo.connect(shimmerDepth); 
  shimmerDepth.connect(shimmerEnv.gain);
  shimmerFund.connect(shimmerEnv); 
  shimmerEnv.connect(master);
  shimmerLfo.start(t0); 
  shimmerFund.start(t0);
  shimmerLfo.stop(t0 + 16.0); 
  shimmerFund.stop(t0 + 16.0);
}

function playTempleBellHigh(startTime, velocity = 1.0) {
  const ctx = getAudioContext();
  const t0 = startTime ?? ctx.currentTime;
  
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -18; 
  master.knee.value = 20; 
  master.ratio.value = 1.5;
  master.attack.value = 0.02; 
  master.release.value = 0.5;
  
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; 
  lpf.frequency.value = 7000; 
  lpf.Q.value = 0.5;
  
  const tailFade = ctx.createGain();
  tailFade.gain.setValueAtTime(1.0, t0);
  tailFade.gain.setValueAtTime(1.0, t0 + 8.0);
  tailFade.gain.exponentialRampToValueAtTime(0.0001, t0 + 14.0);
  
  master.connect(lpf); 
  lpf.connect(tailFade); 
  tailFade.connect(ctx.destination);
  
  const clankSize = Math.floor(ctx.sampleRate * 0.035);
  const clankBuf = ctx.createBuffer(1, clankSize, ctx.sampleRate);
  const clankData = clankBuf.getChannelData(0);
  for (let i = 0; i < clankSize; i++) {
    clankData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clankSize, 3);
  }
  
  const clankSrc = ctx.createBufferSource();
  clankSrc.buffer = clankBuf;
  
  const clankBp = ctx.createBiquadFilter();
  clankBp.type = 'bandpass'; 
  clankBp.frequency.value = 5500; 
  clankBp.Q.value = 0.5;
  
  const clankGain = ctx.createGain();
  clankGain.gain.setValueAtTime(0.0, t0);
  clankGain.gain.linearRampToValueAtTime(0.30 * velocity, t0 + 0.003);
  clankGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.06);
  
  clankSrc.connect(clankBp); 
  clankBp.connect(clankGain); 
  clankGain.connect(master);
  clankSrc.start(t0); 
  clankSrc.stop(t0 + 0.07);
  
  function addPartial(freq, gainPeak, attackTime, decayTime) {
    const osc = ctx.createOscillator();
    osc.type = 'sine'; 
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0, t0);
    env.gain.linearRampToValueAtTime(gainPeak * velocity, t0 + attackTime);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decayTime);
    osc.connect(env); 
    env.connect(master);
    osc.start(t0); 
    osc.stop(t0 + decayTime + 2.0);
  }
  
  addPartial(165,  0.32, 0.012, 12.0);
  addPartial(456,  0.22, 0.008,  8.5);
  addPartial(891,  0.14, 0.006,  6.0);
  addPartial(1473, 0.08, 0.004,  4.0);
  addPartial(2440, 0.04, 0.003, 2.5);
  
  const shimmerLfo = ctx.createOscillator();
  shimmerLfo.type = 'sine'; 
  shimmerLfo.frequency.value = 5.5;
  const shimmerDepth = ctx.createGain(); 
  shimmerDepth.gain.value = 0.02;
  const shimmerFund = ctx.createOscillator();
  shimmerFund.type = 'sine'; 
  shimmerFund.frequency.value = 165;
  const shimmerEnv = ctx.createGain();
  shimmerEnv.gain.setValueAtTime(0.0, t0);
  shimmerEnv.gain.linearRampToValueAtTime(0.06 * velocity, t0 + 0.07);
  shimmerEnv.gain.exponentialRampToValueAtTime(0.0001, t0 + 11.0);
  shimmerLfo.connect(shimmerDepth); 
  shimmerDepth.connect(shimmerEnv.gain);
  shimmerFund.connect(shimmerEnv); 
  shimmerEnv.connect(master);
  shimmerLfo.start(t0); 
  shimmerFund.start(t0);
  shimmerLfo.stop(t0 + 13.0); 
  shimmerFund.stop(t0 + 13.0);
}

function playSingingBowlEdge(startTime) {
  const ctx = getAudioContext(); 
  const t0 = startTime ?? ctx.currentTime;
  
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -18; 
  master.knee.value = 20; 
  master.ratio.value = 1.5;
  master.attack.value = 0.05; 
  master.release.value = 0.6;
  
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; 
  lpf.frequency.value = 5000; 
  lpf.Q.value = 0.5;
  
  master.connect(lpf); 
  lpf.connect(ctx.destination);
  
  const noiseSize = Math.floor(ctx.sampleRate * 0.8);
  const noiseBuf = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseSize; i++) {
    const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (noiseSize - 1)));
    noiseData[i] = (Math.random() * 2 - 1) * hann;
  }
  
  const noiseSrc = ctx.createBufferSource(); 
  noiseSrc.buffer = noiseBuf;
  const bp1 = ctx.createBiquadFilter(); 
  bp1.type = 'bandpass'; 
  bp1.frequency.value = 220; 
  bp1.Q.value = 8.0;
  const bp2 = ctx.createBiquadFilter(); 
  bp2.type = 'bandpass'; 
  bp2.frequency.value = 220; 
  bp2.Q.value = 8.0;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0, t0);
  noiseGain.gain.linearRampToValueAtTime(0.15, t0 + 0.5);
  noiseGain.gain.linearRampToValueAtTime(0.12, t0 + 0.7);
  noiseGain.gain.linearRampToValueAtTime(0.0,  t0 + 0.85);
  
  noiseSrc.connect(bp1); 
  bp1.connect(bp2); 
  bp2.connect(noiseGain); 
  noiseGain.connect(master);
  noiseSrc.start(t0); 
  noiseSrc.stop(t0 + 0.9);
  
  function addEdgePartial(freq, gainPeak, decayTime) {
    const osc = ctx.createOscillator(); 
    osc.type = 'sine'; 
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0, t0); 
    env.gain.linearRampToValueAtTime(gainPeak, t0 + 0.35);
    env.gain.setValueAtTime(gainPeak, t0 + 0.55); 
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decayTime);
    osc.connect(env); 
    env.connect(master); 
    osc.start(t0); 
    osc.stop(t0 + decayTime + 1.5);
  }
  
  addEdgePartial(110, 0.07, 5.5); 
  addEdgePartial(304, 0.04, 3.5); 
  addEdgePartial(594, 0.02, 2.0);
}

function playSingingBowlEdgeHigh(startTime) {
  const ctx = getAudioContext(); 
  const t0 = startTime ?? ctx.currentTime;
  
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -18; 
  master.knee.value = 20; 
  master.ratio.value = 1.5;
  master.attack.value = 0.05; 
  master.release.value = 0.6;
  
  const lpf = ctx.createBiquadFilter();
  lpf.type = 'lowpass'; 
  lpf.frequency.value = 6000; 
  lpf.Q.value = 0.5;
  
  master.connect(lpf); 
  lpf.connect(ctx.destination);
  
  const noiseSize = Math.floor(ctx.sampleRate * 0.8);
  const noiseBuf = ctx.createBuffer(1, noiseSize, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseSize; i++) {
    const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (noiseSize - 1)));
    noiseData[i] = (Math.random() * 2 - 1) * hann;
  }
  
  const noiseSrc = ctx.createBufferSource(); 
  noiseSrc.buffer = noiseBuf;
  const bp1 = ctx.createBiquadFilter(); 
  bp1.type = 'bandpass'; 
  bp1.frequency.value = 330; 
  bp1.Q.value = 8.0;
  const bp2 = ctx.createBiquadFilter(); 
  bp2.type = 'bandpass'; 
  bp2.frequency.value = 330; 
  bp2.Q.value = 8.0;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.0, t0);
  noiseGain.gain.linearRampToValueAtTime(0.15, t0 + 0.45);
  noiseGain.gain.linearRampToValueAtTime(0.12, t0 + 0.65);
  noiseGain.gain.linearRampToValueAtTime(0.0,  t0 + 0.80);
  
  noiseSrc.connect(bp1); 
  bp1.connect(bp2); 
  bp2.connect(noiseGain); 
  noiseGain.connect(master);
  noiseSrc.start(t0); 
  noiseSrc.stop(t0 + 0.85);
  
  function addEdgePartial(freq, gainPeak, decayTime) {
    const osc = ctx.createOscillator(); 
    osc.type = 'sine'; 
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0, t0); 
    env.gain.linearRampToValueAtTime(gainPeak, t0 + 0.30);
    env.gain.setValueAtTime(gainPeak, t0 + 0.50); 
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + decayTime);
    osc.connect(env); 
    env.connect(master); 
    osc.start(t0); 
    osc.stop(t0 + decayTime + 1.5);
  }
  
  addEdgePartial(165, 0.07, 4.5); 
  addEdgePartial(456, 0.04, 2.8); 
  addEdgePartial(891, 0.02, 1.6);
}

function playChugpiNow(startTime, velocity = 1.0) {
  const ctx = getAudioContext(); 
  const master = getChugpiMaster();
  const now = startTime ?? ctx.currentTime; 
  const v = velocity;
  
  const snapSize = Math.floor(ctx.sampleRate * 0.015);
  const snapBuf = ctx.createBuffer(1, snapSize, ctx.sampleRate);
  const snapData = snapBuf.getChannelData(0);
  for (let i = 0; i < snapSize; i++) {
    snapData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / snapSize, 2.5);
  }
  
  const snapSrc = ctx.createBufferSource(); 
  snapSrc.buffer = snapBuf;
  const snapBpHi = ctx.createBiquadFilter();
  snapBpHi.type = 'bandpass'; 
  snapBpHi.frequency.value = 2400; 
  snapBpHi.Q.value = 1.2;
  const snapBpMid = ctx.createBiquadFilter();
  snapBpMid.type = 'bandpass'; 
  snapBpMid.frequency.value = 1400; 
  snapBpMid.Q.value = 0.9;
  const snapGainHi = ctx.createGain(); 
  snapGainHi.gain.value = 0.6;
  const snapGainMid = ctx.createGain(); 
  snapGainMid.gain.value = 0.4;
  const snapEnv = ctx.createGain();
  snapEnv.gain.setValueAtTime(0.0, now);
  snapEnv.gain.linearRampToValueAtTime(2.8 * v, now + 0.001);
  snapEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.016);
  
  snapSrc.connect(snapBpHi);  
  snapBpHi.connect(snapGainHi);   
  snapGainHi.connect(snapEnv);
  snapSrc.connect(snapBpMid); 
  snapBpMid.connect(snapGainMid); 
  snapGainMid.connect(snapEnv);
  snapEnv.connect(master); 
  snapSrc.start(now); 
  snapSrc.stop(now + 0.018);
  
  const flesSize = Math.floor(ctx.sampleRate * 0.08);
  const flesBuf = ctx.createBuffer(1, flesSize, ctx.sampleRate);
  const flesData = flesBuf.getChannelData(0);
  for (let j = 0; j < flesSize; j++) {
    flesData[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / flesSize, 1.6);
  }
  
  const flesSrc = ctx.createBufferSource(); 
  flesSrc.buffer = flesBuf;
  const flesBpLo = ctx.createBiquadFilter();
  flesBpLo.type = 'bandpass'; 
  flesBpLo.frequency.value = 500;  
  flesBpLo.Q.value = 0.9;
  const flesBpMid = ctx.createBiquadFilter();
  flesBpMid.type = 'bandpass'; 
  flesBpMid.frequency.value = 950; 
  flesBpMid.Q.value = 0.8;
  const flesBpHi = ctx.createBiquadFilter();
  flesBpHi.type = 'bandpass'; 
  flesBpHi.frequency.value = 1600; 
  flesBpHi.Q.value = 1.0;
  const flesGLo = ctx.createGain(); 
  flesGLo.gain.value = 0.40;
  const flesGMid = ctx.createGain(); 
  flesGMid.gain.value = 0.40;
  const flesGHi = ctx.createGain(); 
  flesGHi.gain.value = 0.20;
  const flesEnv = ctx.createGain();
  flesEnv.gain.setValueAtTime(0.0, now);
  flesEnv.gain.linearRampToValueAtTime(4.8 * v, now + 0.003);
  flesEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
  
  flesSrc.connect(flesBpLo);  
  flesBpLo.connect(flesGLo);   
  flesGLo.connect(flesEnv);
  flesSrc.connect(flesBpMid); 
  flesBpMid.connect(flesGMid); 
  flesGMid.connect(flesEnv);
  flesSrc.connect(flesBpHi);  
  flesBpHi.connect(flesGHi);   
  flesGHi.connect(flesEnv);
  flesEnv.connect(master); 
  flesSrc.start(now); 
  flesSrc.stop(now + 0.09);
  
  const palmOsc = ctx.createOscillator(); 
  palmOsc.type = 'sine';
  palmOsc.frequency.setValueAtTime(200, now);
  palmOsc.frequency.exponentialRampToValueAtTime(140, now + 0.07);
  const palmEnv = ctx.createGain();
  palmEnv.gain.setValueAtTime(0.0, now);
  palmEnv.gain.linearRampToValueAtTime(0.35 * v, now + 0.004);
  palmEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
  palmOsc.connect(palmEnv); 
  palmEnv.connect(master);
  palmOsc.start(now); 
  palmOsc.stop(now + 0.09);
  
  const thudSize = Math.floor(ctx.sampleRate * 0.055);
  const thudBuf = ctx.createBuffer(1, thudSize, ctx.sampleRate);
  const thudData = thudBuf.getChannelData(0);
  for (let k = 0; k < thudSize; k++) {
    thudData[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / thudSize, 2.5);
  }
  
  const thudSrc = ctx.createBufferSource(); 
  thudSrc.buffer = thudBuf;
  const thudLp = ctx.createBiquadFilter();
  thudLp.type = 'lowpass'; 
  thudLp.frequency.value = 280; 
  thudLp.Q.value = 1.0;
  const thudGain = ctx.createGain();
  thudGain.gain.setValueAtTime(0.0, now);
  thudGain.gain.linearRampToValueAtTime(2.2 * v, now + 0.004);
  thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
  
  thudSrc.connect(thudLp); 
  thudLp.connect(thudGain); 
  thudGain.connect(master);
  thudSrc.start(now); 
  thudSrc.stop(now + 0.06);
}

export function playBell(timeSeconds = 0) {
  playSound('bell', timeSeconds);
}

export function playBellHigh(timeSeconds = 0) {
  playSound('bell-high', timeSeconds);
}

export function playChugpi(timeSeconds = 0) {
  playSound('chugpi', timeSeconds);
}

log('Audio module loaded. Platform:', isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop');
log('Detected audio mode:', detectBestAudioMode());
