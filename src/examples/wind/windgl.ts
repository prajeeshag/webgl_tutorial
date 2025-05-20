
import Util from './util';


import drawVert from './shaders/draw.vert.glsl?raw';
import drawFrag from './shaders/draw.frag.glsl?raw';

import quadVert from './shaders/quad.vert.glsl?raw';

import screenFrag from './shaders/screen.frag.glsl?raw';
import updateFrag from './shaders/update.frag.glsl?raw';
import updatePropFrag from './shaders/updateProp.frag.glsl?raw'
// import utils_glsl from './shaders/utils.glsl?raw'

// const defaultRampColors = {
//     0.0: '#3288bd',
//     0.1: '#66c2a5',
//     0.2: '#abdda4',
//     0.3: '#e6f598',
//     0.4: '#fee08b',
//     0.5: '#fdae61',
//     0.6: '#f46d43',
//     1.0: '#d53e4f'
// };

const defaultRampColors = {
    0.0: '#ffffff',
    1.0: '#ffffff',
};

function getMinMax(arr: ArrayLike<number>): [number, number] {
    var min = Infinity;
    var max = -Infinity;
    for (let i = 0; i < arr.length; i++) {
        const val = arr[i];
        if (val < min) min = val;
        if (val > max) max = val;
    }
    return [min, max];
}

export class WindData {
    wind: Uint8Array;
    width: number;
    height: number;
    uMin: number;
    vMin: number;
    uMax: number;
    vMax: number;
    spdMin: number;
    spdMax: number;
    constructor(
        uwind: Float32Array,
        vwind: Float32Array,
        uwind1: Float32Array,
        vwind1: Float32Array,
        width: number,
        height: number
    ) {
        // some sanity checks
        if (uwind.length !== vwind.length) {
            throw new Error('U and V wind arrays must be the same length');
        }
        if (uwind.length % width !== 0) {
            throw new Error('Wind arrays length must be a multiple of width');
        }
        if (uwind.length / width !== height) {
            throw new Error('Wind arrays length must be equal to width * height');
        }
        this.width = width;
        this.height = height;
        const [uMin, uMax] = getMinMax(uwind);
        const [vMin, vMax] = getMinMax(vwind);
        const [uMin1, uMax1] = getMinMax(uwind1);
        const [vMin1, vMax1] = getMinMax(vwind1);
        this.uMin = Math.min(uMin, uMin1);
        this.uMax = Math.max(uMax, uMax1);
        this.vMin = Math.min(vMin, vMin1);
        this.vMax = Math.max(vMax, vMax1);
        this.wind = new Uint8Array(uwind.length + vwind.length * 4);
        var spdMin = 9999999.
        var spdMax = 0.
        for (let i = 0; i < uwind.length; i++) {
            // normalize the wind values to 0-255 range
            const u = Math.floor(((uwind[i] - this.uMin) / (this.uMax - this.uMin)) * 255);
            const v = Math.floor(((vwind[i] - this.vMin) / (this.vMax - this.vMin)) * 255);
            const u1 = Math.floor(((uwind1[i] - this.uMin) / (this.uMax - this.uMin)) * 255);
            const v1 = Math.floor(((vwind1[i] - this.vMin) / (this.vMax - this.vMin)) * 255);
            const spd = Math.sqrt(u * u + v * v)
            const spd1 = Math.sqrt(u1 * u1 + v1 * v1)
            spdMin = Math.min(spdMin, spd, spd1)
            spdMax = Math.max(spdMax, spd, spd1)
            this.wind[i * 4] = u;
            this.wind[i * 4 + 1] = v;
            this.wind[i * 4 + 2] = u1;
            this.wind[i * 4 + 3] = v1;
        }
        this.spdMin = spdMin
        this.spdMax = spdMax
    }
}

export default class WindGL {
    gl: WebGLRenderingContext;
    fadeOpacity: number;
    speedFactor: number;
    dropRate: number;
    private _programs: { [key: string]: any } = {}
    private _quadBuffer: any;
    private _framebuffer: WebGLFramebuffer;
    private _screenTexture: [WebGLTexture, WebGLTexture]
    private _colorRampTexture: WebGLTexture;
    private _particleStateResolution: number;
    private _numParticles: number;
    private _particlePosTexture: [WebGLTexture, WebGLTexture]
    private _particlePropTexture: [WebGLTexture, WebGLTexture]
    private _particleIndexBuffer: any;
    private _windTexture: WebGLTexture;
    private _windData: WindData;
    private _util: Util;
    private _animationSpeed: number;
    private _time_factor: number = 0.0;

    constructor(gl: WebGLRenderingContext, windData: WindData, numParticles: number = 20000, animationSpeed: number = 30) {
        this.gl = gl;
        this.fadeOpacity = 0.99; // how fast the particle trails fade on each frame
        this.speedFactor = 0.9; // how fast the particles move
        this.dropRate = 0.001; // how fast the particle will die off
        this._animationSpeed = animationSpeed // seconds per timestep of the data

        this._util = new Util(gl);
        this._programs['draw'] = this._util.createProgram(drawVert, drawFrag);
        this._programs['screen'] = this._util.createProgram(quadVert, screenFrag);
        this._programs['update'] = this._util.createProgram(quadVert, updateFrag);
        this._programs['updateProp'] = this._util.createProgram(quadVert, updatePropFrag)

        this._quadBuffer = this._util.createBuffer(new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]));
        this._framebuffer = gl.createFramebuffer();

        this._colorRampTexture = this._util.createTexture(this.gl.LINEAR, getColorRamp(defaultRampColors), 16, 16);

        this._windData = windData;
        this._windTexture = this._util.createTexture(this.gl.LINEAR, windData.wind, windData.width, windData.height);


        // we create a square texture where each pixel will hold a particle position encoded as RGBA
        const particleRes = this._particleStateResolution = Math.ceil(Math.sqrt(numParticles));
        this._numParticles = particleRes * particleRes;
        const numParticlesRGBA = this._numParticles * 4
        // two sets of rgba texture, first for position, second for properties
        const particleState = new Uint8Array(numParticlesRGBA);
        const particleProp = new Uint8Array(numParticlesRGBA);
        for (let i = 0; i < numParticlesRGBA; i++) {
            particleState[i] = Math.floor(Math.random() * 256); // randomize the initial particle positions
        }
        for (let i = 0; i < numParticlesRGBA; i++) {
            particleProp[i] = 128; // randomize the initial particle positions
        }
        // textures to hold the particle state for the current and the next frame
        this._particlePosTexture = [
            this._util.createTexture(gl.NEAREST, particleState, particleRes, particleRes),
            this._util.createTexture(gl.NEAREST, particleState, particleRes, particleRes)
        ]
        this._particlePropTexture = [
            this._util.createTexture(gl.NEAREST, particleState, particleRes, particleRes),
            this._util.createTexture(gl.NEAREST, particleState, particleRes, particleRes)
        ]

        const particleIndices = new Float32Array(this._numParticles);
        for (let i = 0; i < this._numParticles; i++) particleIndices[i] = i;
        this._particleIndexBuffer = this._util.createBuffer(particleIndices);

        const emptyPixels = new Uint8Array(gl.canvas.width * gl.canvas.height * 4);
        this._screenTexture = [
            this._util.createTexture(gl.NEAREST, emptyPixels, gl.canvas.width, gl.canvas.height),
            this._util.createTexture(gl.NEAREST, emptyPixels, gl.canvas.width, gl.canvas.height)
        ]
    }


    draw(dt: number) {
        const gl = this.gl;
        this._time_factor += dt / this._animationSpeed
        if (this._time_factor > 1.0) {
            this._time_factor = 0.0;
        }
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);
        this._drawScreen();
        this._updateParticleProp();
        this._updateParticles();
        this._particlePosTexture.reverse()
        this._particlePropTexture.reverse()
    }

    private _drawScreen() {
        const gl = this.gl;
        // draw the screen into a temporary framebuffer to retain it as the background on the next frame
        this._util.bindFramebuffer(this._framebuffer, this._screenTexture[0]);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        this._drawTexture(this._screenTexture[1], this.fadeOpacity);
        this._drawParticles();

        this._util.bindFramebuffer(null);
        // enable blending to support drawing on top of an existing background (e.g. a map)
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        this._drawTexture(this._screenTexture[0], 1.0);
        gl.disable(gl.BLEND);
        this._screenTexture.reverse()
        // save the current screen as the background for the next frame
    }

    private _drawTexture(texture: WebGLTexture, opacity: number) {
        const gl = this.gl;
        const program = this._programs.screen;
        gl.useProgram(program.program);

        gl.uniform1f(program.u_wind_spd_min, this._windData.spdMin);
        gl.uniform1f(program.u_wind_spd_max, this._windData.spdMax);
        gl.uniform2f(program.u_wind_res, this._windData.width, this._windData.height);
        this._util.bindTexture(program.u_wind, this._windTexture)
        this._util.bindAttribute(this._quadBuffer, program.a_pos, 2);
        this._util.bindTexture(program.u_screen, texture)
        gl.uniform1f(program.u_opacity, opacity);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    private _drawParticles() {
        const gl = this.gl;
        const program = this._programs.draw;
        gl.useProgram(program.program);

        this._util.bindAttribute(this._particleIndexBuffer, program.a_index, 1);

        this._util.bindTexture(program.u_wind, this._windTexture)
        this._util.bindTexture(program.u_particles, this._particlePosTexture[0])
        this._util.bindTexture(program.u_particle_props, this._particlePropTexture[0])
        this._util.bindTexture(program.u_color_ramp, this._colorRampTexture)

        gl.uniform1f(program.u_particles_res, this._particleStateResolution);
        gl.uniform2f(program.u_wind_min, this._windData.uMin, this._windData.vMin);
        gl.uniform2f(program.u_wind_max, this._windData.uMax, this._windData.vMax);

        gl.drawArrays(gl.POINTS, 0, this._numParticles);
        // gl.drawArrays(gl.LINES)
    }

    private _updateParticles() {
        const gl = this.gl;
        this._util.bindFramebuffer(this._framebuffer, this._particlePosTexture[1]);
        gl.viewport(0, 0, this._particleStateResolution, this._particleStateResolution);

        const program = this._programs.update;
        gl.useProgram(program.program);

        this._util.bindAttribute(this._quadBuffer, program.a_pos, 2);

        this._util.bindTexture(program.u_wind, this._windTexture)
        this._util.bindTexture(program.u_particles, this._particlePosTexture[0])
        this._util.bindTexture(program.u_particle_props, this._particlePropTexture[0])

        gl.uniform1f(program.u_time_fac, this._time_factor);
        gl.uniform1f(program.u_rand_seed, Math.random());
        gl.uniform2f(program.u_wind_res, this._windData.width, this._windData.height);
        gl.uniform2f(program.u_wind_min, this._windData.uMin, this._windData.vMin);
        gl.uniform2f(program.u_wind_max, this._windData.uMax, this._windData.vMax);
        gl.uniform1f(program.u_speed_factor, this.speedFactor);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    private _updateParticleProp() {
        const gl = this.gl;
        this._util.bindFramebuffer(this._framebuffer, this._particlePropTexture[1]);
        gl.viewport(0, 0, this._particleStateResolution, this._particleStateResolution);

        const program = this._programs.updateProp;
        gl.useProgram(program.program);

        this._util.bindAttribute(this._quadBuffer, program.a_pos, 2);

        this._util.bindTexture(program.u_wind, this._windTexture)
        this._util.bindTexture(program.u_particles, this._particlePosTexture[0])
        this._util.bindTexture(program.u_particle_props, this._particlePropTexture[0])
        gl.uniform1f(program.u_time_fac, this._time_factor);
        gl.uniform2f(program.u_wind_res, this._windData.width, this._windData.height);
        gl.uniform2f(program.u_wind_min, this._windData.uMin, this._windData.vMin);
        gl.uniform2f(program.u_wind_max, this._windData.uMax, this._windData.vMax);
        gl.uniform1f(program.u_wind_speed_min, this._windData.uMin);
        gl.uniform1f(program.u_wind_speed_max, this._windData.uMax);
        gl.uniform1f(program.u_drop_rate, this.dropRate);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
}

function getColorRamp(colors: { [x: string]: string; }) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not get canvas context');
    }

    canvas.width = 256;
    canvas.height = 1;

    const gradient = ctx.createLinearGradient(0, 0, 256, 0);
    for (const stop in colors) {
        gradient.addColorStop(+stop, colors[stop]);
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 1);

    return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);
}
