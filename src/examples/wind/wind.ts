import { isNoSubstitutionTemplateLiteral } from "typescript";
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
        const uArr = await _loadZarrArray('U10.zarr/U10')
        const vArr = await _loadZarrArray('V10.zarr/V10')
        const width = uArr.shape[1];
        const height = uArr.shape[0];
        const uwind = uArr.data instanceof Float32Array ? uArr.data : new Float32Array(uArr.data as ArrayLike<number>);
        const vwind = vArr.data instanceof Float32Array ? vArr.data : new Float32Array(vArr.data as ArrayLike<number>);

        // const wind = new Float32Array(uwind.length).fill(10)

        const windData = new WindData(flipY(uwind, width, height), flipY(vwind, width, height), width, height);
        // const windData = new WindData(wind, wind, width, height);
        const windGl = new WindGL(this._gl, windData,);
        this._gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this._gl.clear(this._gl.COLOR_BUFFER_BIT | this._gl.DEPTH_BUFFER_BIT);
        const frame = () => {
            windGl.draw();
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