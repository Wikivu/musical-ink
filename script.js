import Regl from 'regl';
import vex from 'vex-js';

import "vex-js/dist/css/vex.css";
import "vex-js/dist/css/vex-theme-default.css";
vex.defaultOptions.className = "vex-theme-default";

const regl = Regl({
	attributes: {
		alpha: false,
		depth: false,
		stencil: false,
		antialias: false
	},
	extensions: ['OES_texture_half_float', 'OES_texture_half_float_linear']
});
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [r , g,b];
}
const config = {
	TEXTURE_DOWNSAMPLE: 1,
	DENSITY_DISSIPATION: 0.9,
	VELOCITY_DISSIPATION: 0.9,
	PRESSURE_DISSIPATION: 0.9,
	PRESSURE_ITERATIONS: 50,
	SPLAT_RADIUS: 0.00012
};

let doubleFbo = (filter) => {
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

let createFbo = (filter) => {
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

const velocity = doubleFbo('linear');
const density = doubleFbo('linear');
const pressure = doubleFbo('nearest');
const divergenceTex = createFbo('nearest');

const fullscreenDraw = {
	vert: require("raw-loader!./shaders/project.vert"),
	attributes: {
		points: [1, 1, 1, -1, -1, -1, 1, 1, -1, -1, -1, 1]
	},
	count: 6
};

const texelSize = ({ viewportWidth, viewportHeight }) => [1 / viewportWidth, 1 / viewportHeight];
const viewport = {
	x: 0,
	y: 0,
	width: window.innerWidth >> config.TEXTURE_DOWNSAMPLE,
	height: window.innerHeight >> config.TEXTURE_DOWNSAMPLE,
};
const advect = regl(Object.assign({
	frag: require("raw-loader!./shaders/advect.frag"),
	framebuffer: regl.prop("framebuffer"),
	uniforms: {
		timestep: 0.017,
		dissipation: regl.prop("dissipation"),
		x: regl.prop("x"),
		velocity: () => velocity.read,
		texelSize,
	},
	viewport
}, fullscreenDraw));
const divergence = regl(Object.assign({
	frag: require("raw-loader!./shaders/divergence.frag"),
	framebuffer: divergenceTex,
	uniforms: {
		velocity: () => velocity.read,
		texelSize,
	},
	viewport
}, fullscreenDraw));
const clear = regl(Object.assign({
	frag: require("raw-loader!./shaders/clear.frag"),
	framebuffer: () => pressure.write,
	uniforms: {
		pressure: () => pressure.read,
		dissipation: config.PRESSURE_DISSIPATION,
	},
	viewport
}, fullscreenDraw));
const gradientSubtract = regl(Object.assign({
	frag: require("raw-loader!./shaders/gradientSubtract.frag"),
	framebuffer: () => velocity.write,
	uniforms: {
		pressure: () => pressure.read,
		velocity: () => velocity.read,
		texelSize,
	},
	viewport
}, fullscreenDraw));
const display = regl(Object.assign({
	frag: require("raw-loader!./shaders/display.frag"),
	uniforms: {
		density: () => density.read,
	}
}, fullscreenDraw));
const splat = regl(Object.assign({
	frag: require("raw-loader!./shaders/splat.frag"),
	framebuffer: regl.prop("framebuffer"),
	uniforms: {
		uTarget: regl.prop("uTarget"),
		aspectRatio: ({ viewportWidth, viewportHeight }) => viewportWidth / viewportHeight,
		point: regl.prop("point"),
		color: regl.prop("color"),
		radius: regl.prop("size"),
		density: () => density.read
	},
	viewport
}, fullscreenDraw));
const jacobi = regl(Object.assign({
	frag: require("raw-loader!./shaders/jacobi.frag"),
	framebuffer: () => pressure.write,
	uniforms: {
		pressure: () => pressure.read,
		divergence: () => divergenceTex,
		texelSize,
	},
	viewport
}, fullscreenDraw));
function createSplat(x, y, dx, dy, color,size) {
	splat({
		framebuffer: velocity.write,
		uTarget: velocity.read,
		point: [x / window.innerWidth, 1 - y / window.innerHeight],
		color: [dx, -dy, 1],
		size:size
	});
	velocity.swap();

	splat({
		framebuffer: density.write,
		uTarget: density.read,
		point: [x / window.innerWidth, 1 - y / window.innerHeight],
		color:color,
		size:size
	});
	density.swap();
}

regl.frame(() => {
	if (pointer.moved) {
		createSplat(pointer.x, pointer.y, pointer.dx, pointer.dy, pointer.color,config.SPLAT_RADIUS);
		pointer.moved = false;
	}
	for(var i=0;i<music.length;i++){
		createSplat(i/music.length*window.innerWidth,window.innerHeight,0,-Math.min(music[i],100)*20,hslToRgb(i/music.length,1,0.5),(Math.min(music[i]/200,0.5)+1)*0.00005);
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
});
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
	pointer.dx = (e.clientX - pointer.x) * 10;
	pointer.dy = (e.clientY - pointer.y) * 10;
	pointer.x = e.clientX;
	pointer.y = e.clientY;
});
document.addEventListener('mousedown', () => {
	pointer.down = true;
	pointer.color = [Math.random() + 0.2, Math.random() + 0.2, Math.random() + 0.2];
});
window.addEventListener('mouseup', () => {
	pointer.down = false;
});

vex.registerPlugin(require('vex-dialog'));
window.dialogue = () => {
	vex.dialog.alert({
		unsafeMessage: `<h1>You can view the source code on <a href="http://github.com/cm-tech/musical-ink">Github</a></h1>

		<h2>How to use</h2>
		<p>Click and drag your mouse to create fluid! <br>
		If the site is slow, try using <a href="https://www.google.com/chrome/">Google Chrome</a></p>`,
	});
	document.querySelector(".vex").scrollTop = 0;
};
