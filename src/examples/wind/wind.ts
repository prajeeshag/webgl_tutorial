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
        const _openZarr = (url: string) => {
            return open.v3(new FetchStore(BASE_URL + url), { kind: "array" })
        };
        var store = await _openZarr('V10.zarr/V10')
        const vAttr = store.attrs
        const vArr = await get(store)

        var store = await _openZarr('U10.zarr/U10')
        const uAttr = store.attrs
        const uArr = await get(store)
        console.log(uArr);

        const uData = uArr.data as Uint8Array;
        const vData = vArr.data as Uint8Array;
        const windData = new WindData(
            uData,
            vData,
            [uAttr.valid_min as number, uAttr.valid_max as number],
            [vAttr.valid_min as number, vAttr.valid_max as number],
            uArr.shape[2],
            uArr.shape[1],
            uArr.shape[0],
        );
        // const windData = new WindData(wind, wind, width, height);
        const windGl = new WindGL(this._gl, windData);
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