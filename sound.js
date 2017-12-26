import { frame } from "./script.js";

const NUM_NODES = 16;

let analyser;
let playing = false;
let music = new Uint8Array(NUM_NODES);
let musicTot= [];
let musicAve=[];
var timesAveraged=0;
var mergeAmount=0.99;
for (let i = 0; i < NUM_NODES; i++) {
  musicTot[i]=0;
  musicAve[i]=0;
}
function update() {
    analyser.getByteFrequencyData(music);
    timesAveraged++;
    for (let i = 0; i < music.length; i++) {
      musicTot[i]+=music[i];
    }
    var allAve=0;
    for (let i = 0; i < music.length; i++) {
      if(timesAveraged<100){
        musicAve[i]=Math.max(music[i],musicAve[i]);
      }
      musicAve[i]=music[i]*(1-mergeAmount)+musicAve[i]*mergeAmount;
      allAve+=musicAve[i]/music.length;
    }
    frame(music,musicAve,allAve);
    if (playing) window.requestAnimationFrame(update);
}

const audioContext = new window.AudioContext() || new window.webkitAudioContext();
const audio = document.getElementById("audio");
window.addEventListener("load", () => {
    analyser = audioContext.createAnalyser();
    analyser.connect(audioContext.destination);

    const source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);

    analyser.fftSize = NUM_NODES * 2;
    analyser.smoothingTimeConstant = 0.6;

    const btn = document.getElementById("btn");
    btn.textContent = "";

    function toggle() {
        playing ? audio.pause() : audio.play();
        btn.className = `btn-${playing ? "play" : "pause"}`;
        playing = !playing;
        update();
    }

    window.addEventListener("keydown", event => {
        if (event.keyCode == 32) toggle();
    });

    window.addEventListener("beforeunload", () => {
        audio.pause();
        btn.className = "btn-pause";
        playing = false;
    });

    btn.addEventListener("click", toggle);

    toggle();
});
