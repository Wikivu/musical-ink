import vex from "vex-js";

import "vex-js/dist/css/vex.css";
import "vex-js/dist/css/vex-theme-top.css";
vex.defaultOptions.className = "vex-theme-top";

const regl = require("regl")({
	attributes: {
		alpha: false,
		depth: false,
		stencil: false,
		antialias: false
	},
	extensions: ["OES_texture_half_float", "OES_texture_half_float_linear"]
});

function hslToRgb(h) {
	return [
		Math.sin(6.28 * h + 2) / 2 + 0.5,
		Math.sin(6.28 * h + 0) / 2 + 0.5,
		Math.sin(6.28 * h + 4) / 2 + 0.5,
	];
}

const config = {
	TEXTURE_DOWNSAMPLE: 1,
	DENSITY_DISSIPATION: 0.9,
	VELOCITY_DISSIPATION: 0.9,
	PRESSURE_DISSIPATION: 0.8,
	PRESSURE_ITERATIONS: 40,
	SPLAT_RADIUS: 0.0025
};

const doubleFbo = (filter) => {
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

const createFbo = (filter) => {
	return regl.framebuffer({
		color: regl.texture({
			width: window.innerWidth >> config.TEXTURE_DOWNSAMPLE,
			height: window.innerHeight >> config.TEXTURE_DOWNSAMPLE,
			wrap: "clamp",
			min: filter,
			mag: filter,
			type: "half float"
		}),
		depthStencil: false
	});
};

const velocity = doubleFbo("linear");
const density = doubleFbo("linear");
const pressure = doubleFbo("nearest");
const divergenceTex = createFbo("nearest");

const fullscreenDraw = regl({
	vert: require("../shaders/project.vert"),
	attributes: {
		points: [1, 1, 1, -1, -1, -1, 1, 1, -1, -1, -1, 1]
	},
	count: 6
});

const texelSize = ({ viewportWidth, viewportHeight }) => [1 / viewportWidth, 1 / viewportHeight];
const viewport = {
	x: 0,
	y: 0,
	width: window.innerWidth >> config.TEXTURE_DOWNSAMPLE,
	height: window.innerHeight >> config.TEXTURE_DOWNSAMPLE,
};
const advect = regl({
	frag: require("../shaders/advect.frag"),
	framebuffer: regl.prop("framebuffer"),
	uniforms: {
		timestep: 0.017,
		dissipation: regl.prop("dissipation"),
		x: regl.prop("x"),
		velocity: () => velocity.read,
		texelSize,
	},
	viewport
});
const divergence = regl({
	frag: require("../shaders/divergence.frag"),
	framebuffer: divergenceTex,
	uniforms: {
		velocity: () => velocity.read,
		texelSize,
	},
	viewport
});
const clear = regl({
	frag: require("../shaders/clear.frag"),
	framebuffer: () => pressure.write,
	uniforms: {
		pressure: () => pressure.read,
		dissipation: config.PRESSURE_DISSIPATION,
	},
	viewport
});
const gradientSubtract = regl({
	frag: require("../shaders/gradientSubtract.frag"),
	framebuffer: () => velocity.write,
	uniforms: {
		pressure: () => pressure.read,
		velocity: () => velocity.read,
		texelSize,
	},
	viewport
});
const jacobi = regl({
	frag: require("../shaders/jacobi.frag"),
	framebuffer: () => pressure.write,
	uniforms: {
		pressure: () => pressure.read,
		divergence: () => divergenceTex,
		texelSize,
	},
	viewport
});
const display = regl({
	frag: require("../shaders/display.frag"),
	uniforms: {
		density: () => density.read,
	}
});
const splat = regl({
	frag: require("../shaders/splat.frag"),
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
});
function createSplat(x, y, dx, dy, color, size) {
	splat({
		framebuffer: velocity.write,
		uTarget: velocity.read,
		point: [x, 1 - y],
		color: [dx, -dy, -1],
		size
	});
	velocity.swap();

	splat({
		framebuffer: density.write,
		uTarget: density.read,
		point: [x, 1 - y],
		color,
		size
	});
	density.swap();
}

function colorF(I) {
	return hslToRgb((new Date().getTime() / 10000 - I * 100) % 1);
}

export function frame(music, average, allAve) {
	fullscreenDraw(() => {
		if (pointer.moved) {
			createSplat(pointer.x / window.innerWidth, pointer.y / window.innerHeight, pointer.dx, pointer.dy, pointer.color, config.SPLAT_RADIUS);
			pointer.moved = false;
		}

		for (let i = 0; i < music.length; i += 2) {
			var speed = Math.log((music[i]) / (average[i] * 10 + allAve * 1) * 11) * 1500 | 0;
			createSplat((1 + i / music.length) / 2, 0.5, 0, -Math.sign(speed) * Math.pow(Math.abs(speed), 1), colorF(i / music.length / 2), 0.0025);
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
	pointer.dx = (e.clientX - pointer.x) * 10;
	pointer.dy = (e.clientY - pointer.y) * 10;
	pointer.x = e.clientX;
	pointer.y = e.clientY;
});
document.addEventListener("mousedown", () => {
	pointer.down = true;
	pointer.color = [Math.random() + 0.2, Math.random() + 0.2, Math.random() + 0.2];
});
window.addEventListener("mouseup", () => {
	pointer.down = false;
});

vex.registerPlugin(require("vex-dialog"));
window.dialogue = () => {
	vex.dialog.alert({
		unsafeMessage: `<h1 style="line-spacing:140%;">You can view the source code on <a href="http://github.com/cm-tech/musical-ink">Github</a></h1>
		<p>If the site is slow, try using <a href="https://www.google.com/chrome/">Google Chrome</a></p>`,
	});
};
