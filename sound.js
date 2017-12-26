import { frame } from "./script.js";

const NUM_NODES = 16;

let analyser;
let playing = false;
let music = new Uint8Array(NUM_NODES);

function update() {
    analyser.getByteFrequencyData(music);
    frame(music);
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
    analyser.smoothingTimeConstant = 0.9;

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
