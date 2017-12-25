var anim;
var playing = false;
var music = [];

var NUM_NODES = 32;

function clearMusic() {
    for (var i = 0; i < NUM_NODES; i++) music[i] = 0.0;
}

clearMusic();

function update(analyser) {
    var freqArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqArray);

    for (var i = 0; i < NUM_NODES; i++) music[i] = freqArray[i];

    anim = window.requestAnimationFrame(update.bind(this, analyser));
}

var audioContext = new window.AudioContext() || window.webkitAudioContext();
var audio = document.getElementById("audio");
window.addEventListener("load", function() {

    var analyser = audioContext.createAnalyser();
    var source = audioContext.createMediaElementSource(audio);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = NUM_NODES * 2;
    analyser.smoothingTimeConstant = 0.6;

    var btn = document.getElementById("btn");

    btn.textContent = "";

    function toggle() {
        playing ? audio.pause() : audio.play();
        playing ? window.cancelAnimationFrame(anim) : update(analyser);

        btn.className = "btn-" + (playing ? "play" : "pause");

        playing = !playing;
    }

    window.addEventListener("keydown", function(event) {
        if (event.keyCode == 32) toggle();
    });

    window.addEventListener("beforeunload", function() {
        audio.pause();
        window.cancelAnimationFrame(anim);
        btn.className = "btn-pause";
        playing = false;
    });

    btn.addEventListener("click", toggle);

    toggle();
});
