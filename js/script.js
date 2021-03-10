import Regl from "../snowpack_meta/pkg/regl.js";
import vex from "../snowpack_meta/pkg/vex-js.js";
import * as dat from "../snowpack_meta/pkg/dat.gui.js";

import "../snowpack_meta/pkg/vex-js/dist/css/vex.css.proxy.js";
import "../snowpack_meta/pkg/vex-js/dist/css/vex-theme-top.css.proxy.js";
vex.defaultOptions.className = "vex-theme-top";

var config = {
  TEXTURE_DOWNSAMPLE: 1,
  DENSITY_DISSIPATION: 0.9,
  VELOCITY_DISSIPATION: 0.9,
  PRESSURE_DISSIPATION: 0.8,
  PRESSURE_ITERATIONS: 40,
  SPLAT_RADIUS: 0.025,
  showStationary: true,
  displayShader: 0,
  loadFile: function () {
    document.getElementById("upload").click();
  },
};

var regl = Regl({
  attributes: {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
  },
  pixelRatio: 1, // << config.TEXTURE_DOWNSAMPLE,
  extensions: ["OES_texture_half_float", "OES_texture_half_float_linear"],
});
let downSamplelis = [];
const gui = new dat.GUI();
gui.add(config, "SPLAT_RADIUS", 0.01, 0.1).name("splat radius");
gui
  .add(config, "TEXTURE_DOWNSAMPLE", 0, 10, 1)
  .name("downsample")
  .onFinishChange(() => {
    downSamplelis.forEach((x) => x());
  });
gui.add(config, "displayShader", { paint: 0, rorschach: 1 }).name("style");
gui.add(config, "showStationary").name("show stationary");
gui.add(config, "loadFile").name("upload mp3");
function hslToRgb(h) {
  return [
    Math.sin(6.28 * h + 2) / 2 + 0.5,
    Math.sin(6.28 * h + 0) / 2 + 0.5,
    Math.sin(6.28 * h + 4) / 2 + 0.5,
  ];
}

var doubleFbo = (filter) => {
  let fbos = [createFbo(filter), createFbo(filter)];
  return {
    get read() {
      return fbos[0]();
    },
    get write() {
      return fbos[1]();
    },
    swap() {
      fbos.reverse();
    },
  };
};

var createFbo = (filter) => {
  let tx = regl.texture({
    width: window.innerWidth >> config.TEXTURE_DOWNSAMPLE,
    height: window.innerHeight >> config.TEXTURE_DOWNSAMPLE,
    wrap: "clamp",
    min: filter,
    mag: filter,
    type: "half float",
  });
  var fbg = regl.framebuffer({
    color: tx,
    depthStencil: false,
    width: window.innerWidth >> config.TEXTURE_DOWNSAMPLE,
    height: window.innerHeight >> config.TEXTURE_DOWNSAMPLE,
  });
  const updateSizes = () => {
    tx = tx.resize(
      window.innerWidth >> config.TEXTURE_DOWNSAMPLE,
      window.innerHeight >> config.TEXTURE_DOWNSAMPLE
    );
    fbg = fbg.resize(
      window.innerWidth >> config.TEXTURE_DOWNSAMPLE,
      window.innerHeight >> config.TEXTURE_DOWNSAMPLE
    );
  };
  window.addEventListener("resize", updateSizes);
  downSamplelis.push(updateSizes);

  return () => fbg;
};

window.velocity = doubleFbo("linear");
window.density = doubleFbo("linear");
window.pressure = doubleFbo("linear"); //nearest
const divergenceTex = createFbo("linear"); //nearest
import projectVERT from "../shaders/project.js";

import advectFRAG from "../shaders/advect.js";

import clearFRAG from "../shaders/clear.js";

import displayFRAG from "../shaders/display.js";
import display1FRAG from "../shaders/display1.js";
import gradientSubtractFRAG from "../shaders/gradientSubtract.js";
import divergenceFRAG from "../shaders/divergence.js";
import splatDFRAG from "../shaders/splatD.js";
import splatVFRAG from "../shaders/splatV.js";
import jacobiFRAG from "../shaders/jacobi.js";
var fullscreenDraw = {
  vert: projectVERT,
  attributes: {
    points: [1, 1, 1, -1, -1, -1, 1, 1, -1, -1, -1, 1],
  },
  count: 6,
};

window.texelSize = ({ viewportWidth, viewportHeight }) => [
  1 / viewportWidth,
  1 / viewportHeight,
];
const advect = regl(
  Object.assign(
    {
      frag: advectFRAG,
      framebuffer: regl.prop("framebuffer"),
      uniforms: {
        timestep: 0.017,
        dissipation: regl.prop("dissipation"),
        x: regl.prop("x"),
        velocity: () => velocity.read,
        texelSize,
      },
    },
    fullscreenDraw
  )
);
const divergence = regl(
  Object.assign(
    {
      frag: divergenceFRAG,
      framebuffer: () => divergenceTex(),
      uniforms: {
        velocity: () => velocity.read,
        texelSize,
      },
    },
    fullscreenDraw
  )
);
const clear = regl(
  Object.assign(
    {
      frag: clearFRAG,
      framebuffer: () => pressure.write,
      uniforms: {
        pressure: () => pressure.read,
        dissipation: config.PRESSURE_DISSIPATION,
      },
    },
    fullscreenDraw
  )
);
const gradientSubtract = regl(
  Object.assign(
    {
      frag: gradientSubtractFRAG,
      framebuffer: () => velocity.write,
      uniforms: {
        pressure: () => pressure.read,
        velocity: () => velocity.read,
        texelSize,
      },
    },
    fullscreenDraw
  )
);
const jacobi = regl(
  Object.assign(
    {
      frag: jacobiFRAG,
      framebuffer: () => pressure.write,
      uniforms: {
        pressure: () => pressure.read,
        divergence: () => divergenceTex(),
        texelSize,
      },
    },
    fullscreenDraw
  )
);
const display0 = regl(
  Object.assign(
    {
      frag: displayFRAG,
      uniforms: {
        density: () => density.read,
        texelSize,
      },
      viewport: () => ({
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    },
    fullscreenDraw
  )
);
const display1 = regl(
  Object.assign(
    {
      frag: display1FRAG,
      uniforms: {
        density: () => density.read,
        texelSize,
      },
      viewport: () => ({
        x: 0,
        y: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      }),
    },
    fullscreenDraw
  )
);
const display = () => [display0, display1][config.displayShader]();
// const splat = regl(
//   Object.assign(
//     {
//       frag: splatFRAG,
//       framebuffer: regl.prop("framebuffer"),
//       uniforms: {
//         uTarget: regl.prop("uTarget"),
//         aspectRatio: ({ viewportWidth, viewportHeight }) =>
//           viewportWidth / viewportHeight,
//         point: regl.prop("point"),
//         color: regl.prop("color"),
//         radius: regl.prop("size"),
//         density: () => density.read,
//       },
//     },
//     fullscreenDraw
//   )
// );
const splatV = regl(
  Object.assign(
    {
      frag: splatVFRAG,
      framebuffer: regl.prop("framebuffer"),
      uniforms: {
        velocity: regl.prop("velocity"),
        density: regl.prop("density"),
        aspectRatio: ({ viewportWidth, viewportHeight }) =>
          viewportWidth / viewportHeight,
        point: regl.prop("point"),
        inkColor: regl.prop("inkColor"),
        inkVelocity: regl.prop("inkVelocity"),
        radius: regl.prop("size"),
        texelSize,
      },
    },
    fullscreenDraw
  )
);
const splatD = regl(
  Object.assign(
    {
      frag: splatDFRAG,
      framebuffer: regl.prop("framebuffer"),
      uniforms: {
        velocity: regl.prop("velocity"),
        density: regl.prop("density"),
        aspectRatio: ({ viewportWidth, viewportHeight }) =>
          viewportWidth / viewportHeight,
        point: regl.prop("point"),
        inkColor: regl.prop("inkColor"),
        inkVelocity: regl.prop("inkVelocity"),
        radius: regl.prop("size"),
        texelSize,
      },
    },
    fullscreenDraw
  )
);
function createSplat(x, y, dx, dy, color, size) {
  splatV({
    framebuffer: velocity.write,
    velocity: velocity.read,
    density: density.read,
    point: [x, 1 - y],
    inkVelocity: [dx, -dy, 1],
    inkColor: color,
    size,
  });

  splatD({
    framebuffer: density.write,
    velocity: velocity.read,
    density: density.read,
    point: [x, 1 - y],
    inkVelocity: [dx, -dy, 1],
    inkColor: color,
    size,
  });
  velocity.swap();
  density.swap();
}

function colorF(I) {
  return hslToRgb((new Date().getTime() / 10000 - I * 100) % 1);
}

export function frame(music, average, allAve) {
  let viewport = {
    x: 0,
    y: 0,
    width: window.innerWidth >> config.TEXTURE_DOWNSAMPLE,
    height: window.innerHeight >> config.TEXTURE_DOWNSAMPLE,
  };
  if (pointer.down) {
    createSplat(
      pointer.x / window.innerWidth,
      pointer.y / window.innerHeight,
      pointer.dx,
      pointer.dy,
      pointer.color,
      config.SPLAT_RADIUS
    );
    //pointer.moved = false;
  }

  /*for (let i = 0; i < music.length; i++) {
    var speed = Math.log((music[i]) / (average[i] * 20 + allAve * 1) * 21) * 3000 | 0;
    createSplat((1 + i / music.length) / 2, 0.5, 0, -Math.sign(speed) * Math.pow(Math.abs(speed), 1), colorF(i / music.length), 0.5/music.length);
    createSplat(1 - (1 + i / music.length) / 2, 0.5, 0, -Math.sign(speed) * Math.pow(Math.abs(speed), 1), colorF(i / music.length), 0.5/music.length);
  }*/
  var anglem = 1 / Math.PI;
  let ringRadius = Math.min(viewport.height, viewport.width) / 2;
  let RR = 1;
  for (let i = 0; i < music.length; i++) {
    var loc = {
      x: Math.sin(((i + 0.5) / music.length) * Math.PI) * anglem,
      y: -Math.cos(((i + 0.5) / music.length) * Math.PI) * anglem,
    };
    var speed =
      (Math.log((music[i] / (average[i] * 20 + allAve * 1)) * 21) * 3000) | 0;
    if (speed !== 0 || config.showStationary)
      createSplat(
        (loc.x * ringRadius) / viewport.width + 0.5,
        (loc.y * ringRadius) / viewport.height + 0.5,
        (1 / anglem) * loc.x * Math.sign(speed) * Math.pow(Math.abs(speed), 1),
        (1 / anglem) * loc.y * Math.sign(speed) * Math.pow(Math.abs(speed), 1),
        colorF(i / music.length),
        (0.5 / music.length) * RR
      );
    //createSplat(1 - (1 + i / music.length) / 2, 0.5, 0, -Math.sign(speed) * Math.pow(Math.abs(speed), 1), colorF(i / music.length), 0.5/music.length);
  }
  for (let i = 0; i < music.length; i++) {
    var loc = {
      x: -Math.sin(((i + 0.5) / music.length) * Math.PI) * anglem,
      y: -Math.cos(((i + 0.5) / music.length) * Math.PI) * anglem,
    };
    var speed =
      (Math.log((music[i] / (average[i] * 20 + allAve * 1)) * 21) * 3000) | 0;
    if (speed !== 0 || config.showStationary)
      createSplat(
        (loc.x * ringRadius) / viewport.width + 0.5,
        (loc.y * ringRadius) / viewport.height + 0.5,
        (1 / anglem) * loc.x * Math.sign(speed) * Math.pow(Math.abs(speed), 1),
        (1 / anglem) * loc.y * Math.sign(speed) * Math.pow(Math.abs(speed), 1),
        colorF(i / music.length),
        (0.5 / music.length) * RR
      );
    //createSplat(1 - (1 + i / music.length) / 2, 0.5, 0, -Math.sign(speed) * Math.pow(Math.abs(speed), 1), colorF(i / music.length), 0.5/music.length);
  }

  advect({
    framebuffer: velocity.write,
    x: velocity.read,
    dissipation: config.VELOCITY_DISSIPATION,
  });
  velocity.swap();

  advect({
    framebuffer: density.write,
    x: density.read,
    dissipation: config.DENSITY_DISSIPATION,
  });
  density.swap();

  divergence();

  clear();
  pressure.swap();

  for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
    jacobi();
    pressure.swap();
  }

  gradientSubtract();
  velocity.swap();

  display();
}

let pointer = {
  x: 0,
  y: 0,
  dx: 0,
  dy: 0,
  down: false,
  moved: false,
  color: [30, 0, 300],
};
document.addEventListener("mousemove", (e) => {
  pointer.moved = pointer.down;
  var l = 0.9;
  pointer.dx = pointer.dx * l + (e.clientX - pointer.x) * 1000 * (1 - l);
  pointer.dy = pointer.dy * l + (e.clientY - pointer.y) * 1000 * (1 - l);
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});
document.addEventListener("mousedown", () => {
  pointer.down = true;
  pointer.dx = 0;
  pointer.dy = 0;
  pointer.color = [
    Math.random() + 0.2,
    Math.random() + 0.2,
    Math.random() + 0.2,
  ];
});
window.addEventListener("mouseup", () => {
  pointer.down = false;
});
// import vexDia from "vex-dialog";
// vex.registerPlugin(vexDia);
// window.dialogue = () => {
//   vex.dialog.alert({
//     unsafeMessage: `<h1 style="line-spacing:140%;">You can view the source code on <a href="http://github.com/cm-tech/musical-ink">Github</a></h1>
// 		<p>If the site is slow, try using <a href="https://www.google.com/chrome/">Google Chrome</a></p>`,
//   });
// };
window.addEventListener("load", display);
