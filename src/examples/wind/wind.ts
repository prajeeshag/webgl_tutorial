import WindGL, { WindData } from "./windgl";
import { open, FetchStore, get } from "zarrita";

export default class Wind {
    // private _windGL: WindGL;
    private _gl: WebGLRenderingContext;

    constructor(canvas: HTMLCanvasElement) {
        const gl = canvas.getContext('webgl') as WebGLRenderingContext;
        if (!gl) {
            throw new Error('Unable to initialize WebGL. Your browser may not support it.');
        }
        this._gl = gl;
    }

    async run() {
        const BASE_URL = 'http://localhost:8000/';
        const _loadZarrArray = (url: string) => {
            return open.v3(new FetchStore(BASE_URL + url), { kind: "array" })
                .then(store => get(store));
        };
        const vArr = await _loadZarrArray('V10.zarr/V10')
        const uArr = await _loadZarrArray('U10.zarr/U10')
        const width = uArr.shape[2];
        const height = uArr.shape[1];
        const ntime = uArr.shape[0];

        const uwind = new Float32Array(width * height)
        const uwind1 = new Float32Array(width * height)
        const vwind = new Float32Array(width * height)
        const vwind1 = new Float32Array(width * height)

        const uData = uArr.data as Float32Array;
        const vData = vArr.data as Float32Array;
        for (let n = 0; n < width * height; n++) {
            uwind[n] = uData[n];
            vwind[n] = vData[n];
            uwind1[n] = uData[width * height + n];
            vwind1[n] = vData[width * height + n];
        }

        const windData = new WindData(
            flipY(uwind, width, height),
            flipY(vwind, width, height),
            flipY(uwind1, width, height),
            flipY(vwind1, width, height),
            width, height
        );
        // const windData = new WindData(wind, wind, width, height);
        const windGl = new WindGL(this._gl, windData,);
        this._gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);
        var prev_time = performance.now();
        var delta_time = 0;
        const frame = () => {
            windGl.draw(delta_time);
            const time = performance.now();
            delta_time = (time - prev_time) * 0.001;
            prev_time = time;
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }
}

function flipY(data: Float32Array, nx: number, ny: number): Float32Array {
    const result = new Float32Array(data.length);

    for (let y = 0; y < ny; y++) {
        const srcRowStart = y * nx;
        const dstRowStart = (ny - 1 - y) * nx;

        for (let x = 0; x < nx; x++) {
            result[dstRowStart + x] = data[srcRowStart + x];
        }
    }

    return result;
}