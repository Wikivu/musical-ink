import { frame } from "./script.js";

var NUM_NODES = 32;

var analyser;
var playing = false;
var music = new Uint8Array(NUM_NODES);

function update() {
    analyser.getByteFrequencyData(music);
    frame(music);
    if (playing) window.requestAnimationFrame(update);
}

var audioContext = new window.AudioContext() || new window.webkitAudioContext();
var audio = document.getElementById("audio");
window.addEventListener("load", function() {
    analyser = audioContext.createAnalyser();
    analyser.connect(audioContext.destination);

    var source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);

    analyser.fftSize = NUM_NODES * 2;
    analyser.smoothingTimeConstant = 0.6;

    var btn = document.getElementById("btn");
    btn.textContent = "";

    function toggle() {
        playing ? audio.pause() : audio.play();
        btn.className = "btn-" + (playing ? "play" : "pause");
        playing = !playing;
        update();
    }

    window.addEventListener("keydown", function(event) {
        if (event.keyCode == 32) toggle();
    });

    window.addEventListener("beforeunload", function() {
        audio.pause();
        btn.className = "btn-pause";
        playing = false;
    });

    btn.addEventListener("click", toggle);

    toggle();
});
