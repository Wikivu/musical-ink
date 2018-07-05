import Regl from 'regl';
import vex from 'vex-js';

import "vex-js/dist/css/vex.css";
import "vex-js/dist/css/vex-theme-top.css";
vex.defaultOptions.className = "vex-theme-top";

var regl = Regl({
  attributes: {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false
  },
  extensions: ['OES_texture_half_float', 'OES_texture_half_float_linear']
});

function hslToRgb(h) {
  return [
    Math.sin(6.28 * h + 2) / 2 + 0.5,
    Math.sin(6.28 * h + 0) / 2 + 0.5,
    Math.sin(6.28 * h + 4) / 2 + 0.5
  ];
}

var config = {
  TEXTURE_DOWNSAMPLE: 0,
  DENSITY_DISSIPATION: 0.9,
  VELOCITY_DISSIPATION: 0.9,
  PRESSURE_DISSIPATION: 0.8,
  PRESSURE_ITERATIONS: 40,
  SPLAT_RADIUS: 0.025
};

var doubleFbo = (filter) => {
  let fbos = [createFbo(filter), createFbo(filter)];
  return {
    get read() {
      return fbos[0];
    },
    get write() {
      return fbos[1];
    },
    swap() {
      fbos.reverse();
    }
  };
};

var createFbo = (filter) => {
  return regl.framebuffer({
    color: regl.texture({
      width: window.innerWidth >> config.TEXTURE_DOWNSAMPLE,
      height: window.innerHeight >> config.TEXTURE_DOWNSAMPLE,
      wrap: 'clamp',
      min: filter,
      mag: filter,
      type: 'half float'
    }),
    depthStencil: false
  });
};

window.velocity = doubleFbo('linear');
window.density = doubleFbo('linear');
window.pressure = doubleFbo('nearest');
window.divergenceTex = createFbo('nearest');

var fullscreenDraw = {
  vert: require("raw-loader!./shaders/project.vert"),
  attributes: {
    points: [
      1,
      1,
      1,
      -1,
      -1,
      -1,
      1,
      1,
      -1,
      -1,
      -1,
      1
    ]
  },
  count: 6
};

window.texelSize = ({viewportWidth, viewportHeight}) => [
  1 / viewportWidth,
  1 / viewportHeight
];
window.viewport = {
  x: 0,
  y: 0,
  width: window.innerWidth >> config.TEXTURE_DOWNSAMPLE,
  height: window.innerHeight >> config.TEXTURE_DOWNSAMPLE
};
window.advect = regl(Object.assign({
  frag: require("raw-loader!./shaders/advect.frag"),
  framebuffer: regl.prop("framebuffer"),
  uniforms: {
    timestep: 0.017,
    dissipation: regl.prop("dissipation"),
    x: regl.prop("x"),
    velocity: () => velocity.read,
    texelSize
  },
  viewport
}, fullscreenDraw));
window.divergence = regl(Object.assign({
  frag: require("raw-loader!./shaders/divergence.frag"),
  framebuffer: divergenceTex,
  uniforms: {
    velocity: () => velocity.read,
    texelSize
  },
  viewport
}, fullscreenDraw));
window.clear = regl(Object.assign({
  frag: require("raw-loader!./shaders/clear.frag"),
  framebuffer: () => pressure.write,
  uniforms: {
    pressure: () => pressure.read,
    dissipation: config.PRESSURE_DISSIPATION
  },
  viewport
}, fullscreenDraw));
window.gradientSubtract = regl(Object.assign({
  frag: require("raw-loader!./shaders/gradientSubtract.frag"),
  framebuffer: () => velocity.write,
  uniforms: {
    pressure: () => pressure.read,
    velocity: () => velocity.read,
    texelSize
  },
  viewport
}, fullscreenDraw));
window.jacobi = regl(Object.assign({
  frag: require("raw-loader!./shaders/jacobi.frag"),
  framebuffer: () => pressure.write,
  uniforms: {
    pressure: () => pressure.read,
    divergence: () => divergenceTex,
    texelSize
  },
  viewport
}, fullscreenDraw));
window.display = regl(Object.assign({
  frag: require("raw-loader!./shaders/display.frag"),
  uniforms: {
    density: () => density.read,
    texelSize
  }
}, fullscreenDraw));
window.splat = regl(Object.assign({
  frag: require("raw-loader!./shaders/splat.frag"),
  framebuffer: regl.prop("framebuffer"),
  uniforms: {
    uTarget: regl.prop("uTarget"),
    aspectRatio: ({viewportWidth, viewportHeight}) => viewportWidth / viewportHeight,
    point: regl.prop("point"),
    color: regl.prop("color"),
    radius: regl.prop("size"),
    density: () => density.read
  },
  viewport
}, fullscreenDraw));
function createSplat(x, y, dx, dy, color, size) {
  splat({
    framebuffer: velocity.write,
    uTarget: velocity.read,
    point: [
      x, 1 - y
    ],
    color: [
      dx, -dy,
      1
    ],
    size
  });
  velocity.swap();

  splat({
    framebuffer: density.write,
    uTarget: density.read,
    point: [
      x, 1 - y
    ],
    color,
    size
  });
  density.swap();
}

function colorF(I) {
  return hslToRgb((new Date().getTime() / 10000 - I * 100) % 1);
}

export function frame(music, average, allAve) {
  if (pointer.down) {
    createSplat(pointer.x / window.innerWidth, pointer.y / window.innerHeight, pointer.dx, pointer.dy, pointer.color, config.SPLAT_RADIUS);
    //pointer.moved = false;
  }

  /*for (let i = 0; i < music.length; i++) {
    var speed = Math.log((music[i]) / (average[i] * 20 + allAve * 1) * 21) * 3000 | 0;
    createSplat((1 + i / music.length) / 2, 0.5, 0, -Math.sign(speed) * Math.pow(Math.abs(speed), 1), colorF(i / music.length), 0.5/music.length);
    createSplat(1 - (1 + i / music.length) / 2, 0.5, 0, -Math.sign(speed) * Math.pow(Math.abs(speed), 1), colorF(i / music.length), 0.5/music.length);
  }*/
	var anglem=1/Math.PI;
	for (let i = 0; i < music.length; i++) {
		var loc={x:Math.sin((i+0.5) / music.length*Math.PI)*anglem,y:-Math.cos((i+0.5) / music.length*Math.PI)*anglem};
    var speed = Math.log((music[i]) / (average[i] * 20 + allAve * 1) * 21) * 3000 | 0;
    createSplat(loc.x*Math.min(viewport.height,viewport.width)/viewport.width+0.5,loc.y*Math.min(viewport.height,viewport.width)/viewport.height+0.5, 1/anglem*loc.x*Math.sign(speed) * Math.pow(Math.abs(speed), 1), 1/anglem*loc.y*Math.sign(speed) * Math.pow(Math.abs(speed), 1), colorF(i / music.length), 0.5/music.length);
    //createSplat(1 - (1 + i / music.length) / 2, 0.5, 0, -Math.sign(speed) * Math.pow(Math.abs(speed), 1), colorF(i / music.length), 0.5/music.length);

	}
  for (let i = 0; i < music.length; i++) {
		var loc={x:-Math.sin((i+0.5) / music.length*Math.PI)*anglem,y:-Math.cos((i+0.5) / music.length*Math.PI)*anglem};
    var speed = Math.log((music[i]) / (average[i] * 20 + allAve * 1) * 21) * 3000 | 0;
    createSplat(loc.x*Math.min(viewport.height,viewport.width)/viewport.width+0.5,loc.y*Math.min(viewport.height,viewport.width)/viewport.height+0.5, 1/anglem*loc.x*Math.sign(speed) * Math.pow(Math.abs(speed), 1), 1/anglem*loc.y*Math.sign(speed) * Math.pow(Math.abs(speed), 1), colorF(i / music.length), 0.5/music.length);
    //createSplat(1 - (1 + i / music.length) / 2, 0.5, 0, -Math.sign(speed) * Math.pow(Math.abs(speed), 1), colorF(i / music.length), 0.5/music.length);

	}

  advect({framebuffer: velocity.write, x: velocity.read, dissipation: config.VELOCITY_DISSIPATION});
  velocity.swap();

  advect({framebuffer: density.write, x: density.read, dissipation: config.DENSITY_DISSIPATION});
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
  color: [30, 0, 300]
};
document.addEventListener("mousemove", (e) => {
  pointer.moved = pointer.down;
  var l = 0.9;
  pointer.dx = pointer.dx * l + (e.clientX - pointer.x) * 1000 * (1 - l);
  pointer.dy = pointer.dy * l + (e.clientY - pointer.y) * 1000 * (1 - l);
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});
document.addEventListener('mousedown', () => {
  pointer.down = true;
  pointer.dx = 0;
  pointer.dy = 0;
  pointer.color = [
    Math.random() + 0.2,
    Math.random() + 0.2,
    Math.random() + 0.2
  ];
});
window.addEventListener('mouseup', () => {
  pointer.down = false;
});

vex.registerPlugin(require('vex-dialog'));
window.dialogue = () => {
  vex.dialog.alert({unsafeMessage: `<h1 style="line-spacing:140%;">You can view the source code on <a href="http://github.com/cm-tech/musical-ink">Github</a></h1>
		<p>If the site is slow, try using <a href="https://www.google.com/chrome/">Google Chrome</a></p>`});
};
window.addEventListener("resize",function(){
  return null;
  window.velocity = doubleFbo('linear');
  window.density = doubleFbo('linear');
  window.pressure = doubleFbo('nearest');
  window.divergenceTex = createFbo('nearest');
  window.texelSize = ({viewportWidth, viewportHeight}) => [
    1 / viewportWidth,
    1 / viewportHeight
  ];
  window.viewport = {
    x: 0,
    y: 0,
    width: window.innerWidth >> config.TEXTURE_DOWNSAMPLE,
    height: window.innerHeight >> config.TEXTURE_DOWNSAMPLE
  };
  window.advect = regl(Object.assign({
    frag: require("raw-loader!./shaders/advect.frag"),
    framebuffer: regl.prop("framebuffer"),
    uniforms: {
      timestep: 0.017,
      dissipation: regl.prop("dissipation"),
      x: regl.prop("x"),
      velocity: () => velocity.read,
      texelSize
    },
    viewport
  }, fullscreenDraw));
  window.divergence = regl(Object.assign({
    frag: require("raw-loader!./shaders/divergence.frag"),
    framebuffer: divergenceTex,
    uniforms: {
      velocity: () => velocity.read,
      texelSize
    },
    viewport
  }, fullscreenDraw));
  window.clear = regl(Object.assign({
    frag: require("raw-loader!./shaders/clear.frag"),
    framebuffer: () => pressure.write,
    uniforms: {
      pressure: () => pressure.read,
      dissipation: config.PRESSURE_DISSIPATION
    },
    viewport
  }, fullscreenDraw));
  window.gradientSubtract = regl(Object.assign({
    frag: require("raw-loader!./shaders/gradientSubtract.frag"),
    framebuffer: () => velocity.write,
    uniforms: {
      pressure: () => pressure.read,
      velocity: () => velocity.read,
      texelSize
    },
    viewport
  }, fullscreenDraw));
  window.jacobi = regl(Object.assign({
    frag: require("raw-loader!./shaders/jacobi.frag"),
    framebuffer: () => pressure.write,
    uniforms: {
      pressure: () => pressure.read,
      divergence: () => divergenceTex,
      texelSize
    },
    viewport
  }, fullscreenDraw));
  window.display = regl(Object.assign({
    frag: require("raw-loader!./shaders/display.frag"),
    uniforms: {
      density: () => density.read,
      texelSize
    }
  }, fullscreenDraw));
  window.splat = regl(Object.assign({
    frag: require("raw-loader!./shaders/splat.frag"),
    framebuffer: regl.prop("framebuffer"),
    uniforms: {
      uTarget: regl.prop("uTarget"),
      aspectRatio: ({viewportWidth, viewportHeight}) => viewportWidth / viewportHeight,
      point: regl.prop("point"),
      color: regl.prop("color"),
      radius: regl.prop("size"),
      density: () => density.read
    },
    viewport
  }, fullscreenDraw));
});
