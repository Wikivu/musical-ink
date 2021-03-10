import { frame } from "./script.js";

const NUM_NODES = 32;

let analyser;
let playing = false;
let music = new Uint8Array(NUM_NODES);
let musicTot = [];
let musicAve = [];
var timesAveraged = 0;
var mergeAmount = 0.99;
for (let i = 0; i < NUM_NODES; i++) {
  musicTot[i] = 0;
  musicAve[i] = 0;
}

function update() {
  analyser.getByteFrequencyData(music);
  timesAveraged++;
  for (let i = 0; i < music.length; i++) {
    musicTot[i] += music[i];
  }
  var allAve = 0;
  for (let i = 0; i < music.length; i++) {
    if (timesAveraged < 100) {
      musicAve[i] = Math.max(music[i], musicAve[i]);
    }
    musicAve[i] = music[i] * (1 - mergeAmount) + musicAve[i] * mergeAmount;
    allAve += musicAve[i] / music.length;
  }
  frame(music, musicAve, allAve);
  if (playing) window.requestAnimationFrame(update);
}
var audioContext = false;
var audio = document.getElementById("audio");
function handleFiles(event) {
  var files = event.target.files;
  document.getElementById("src").setAttribute("src", URL.createObjectURL(files[0]));
  document.getElementById("audio").load();
  toggle();
  toggle();
}

document.getElementById("upload").addEventListener("change", handleFiles, false);
const btn = document.getElementById("btn");
function setPlaying(newPlaying){
  playing=newPlaying;
  if(!playing ) audio.pause(); else audio.play();
  btn.innerHTML=playing?`<span class="material-icons">pause</span>`:`<span class="material-icons">play_arrow</span>`;
  update();
}
function toggle() {
  setPlaying(!playing);
  // playing ? audio.pause() : audio.play();
  // btn.className = `btn-${playing ? "play" : "pause"}`;
  // playing = !playing;
  // update();
}
window.addEventListener("load", () => {
  btn.innerHTML=playing?`<span class="material-icons">pause</span>`:`<span class="material-icons">play_arrow</span>`;

  
  var ks = btn.addEventListener("click", () => {
    if (!audioContext) {
      audioContext =
        new window.AudioContext() || new window.webkitAudioContext();

      analyser = audioContext.createAnalyser();
      analyser.connect(audioContext.destination);

      const source = audioContext.createMediaElementSource(audio);
      source.connect(analyser);

      analyser.fftSize = NUM_NODES * 2;
      analyser.smoothingTimeConstant = 0.6;

      window.addEventListener("keydown", (event) => {
        if (event.keyCode == 32) toggle();
      });

      window.addEventListener("beforeunload", () => {
        setPlaying(false);
        // audio.pause();
        // // btn.className = "btn-pause";
        // playing = false;
      });
    } else {
      toggle();
    }
  });
});
