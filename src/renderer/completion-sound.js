// A quiet local chime. Audio failures never affect a completed save operation.
let completionAudio;
function prepareCompletionAudio(){
  try { completionAudio??=new AudioContext(); if(completionAudio.state==='suspended')completionAudio.resume().catch(()=>{}); } catch {}
}
document.addEventListener('pointerdown',prepareCompletionAudio,{passive:true});
document.addEventListener('keydown',prepareCompletionAudio,{passive:true});
window.cfbToolkit.onToolApplied?.(()=>{
  try {
    prepareCompletionAudio();if(completionAudio?.state!=='running')return;
    const oscillator=completionAudio.createOscillator(),gain=completionAudio.createGain(),now=completionAudio.currentTime;
    oscillator.type='sine';oscillator.frequency.setValueAtTime(1046.5,now);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.045,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+.22);
    oscillator.connect(gain);gain.connect(completionAudio.destination);oscillator.start(now);oscillator.stop(now+.23);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  } catch {}
});
