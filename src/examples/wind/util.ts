
export default class glUtil {
    private _gl: WebGLRenderingContext;
    private _texUnitMap: Map<WebGLUniformLocation, number>;
    private texNextUnit: number;


    constructor(gl: WebGLRenderingContext) {
        this._gl = gl;
        this._texUnitMap = new Map();
        this.texNextUnit = 0;

    }

    bindTexture(location: WebGLUniformLocation, texture: WebGLTexture): void {
        const gl = this._gl;

        let unit: number;
        if (this._texUnitMap.has(location)) {
            unit = this._texUnitMap.get(location)!;
        } else {
            unit = this.texNextUnit++;
            this._texUnitMap.set(location, unit);
        }

        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(location, unit);
    }

    private _createShader(type: number, source: string) {
        const shader = this._gl.createShader(type);
        if (!shader) {
            throw new Error('Error creating shader');
        }
        this._gl.shaderSource(shader, source);

        this._gl.compileShader(shader);
        if (!this._gl.getShaderParameter(shader, this._gl.COMPILE_STATUS)) {
            throw new Error(this._gl.getShaderInfoLog(shader) || 'Unknown shader compile error');
        }

        return shader;
    }

    createProgram(vertexSource: string, fragmentSource: string) {
        const program = this._gl.createProgram();

        const vertexShader = this._createShader(this._gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this._createShader(this._gl.FRAGMENT_SHADER, fragmentSource);

        this._gl.attachShader(program, vertexShader);
        this._gl.attachShader(program, fragmentShader);

        this._gl.linkProgram(program);
        if (!this._gl.getProgramParameter(program, this._gl.LINK_STATUS)) {
            throw new Error(this._gl.getProgramInfoLog(program) || 'Unknown program link error');
        }

        const wrapper: { program: WebGLProgram;[key: string]: any } = { 'program': program };

        const numAttributes = this._gl.getProgramParameter(program, this._gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttributes; i++) {
            const attribute = this._gl.getActiveAttrib(program, i);
            if (!attribute) {
                throw new Error('Error getting attribute');
            }
            const attrLoc = this._gl.getAttribLocation(program, attribute.name);
            if (attrLoc < 0) {
                throw new Error('Error getting attribute location');
            }
            wrapper[attribute.name] = attrLoc;
        }
        const numUniforms = this._gl.getProgramParameter(program, this._gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const uniform = this._gl.getActiveUniform(program, i);
            if (!uniform) {
                throw new Error('Error getting uniform');
            }
            wrapper[uniform.name] = this._gl.getUniformLocation(program, uniform.name);
        }
        return wrapper;
    }

    createTexture(filter: number, data: Uint8Array | ImageData, width: number = 0, height: number = 0): WebGLTexture {
        const texture = this._gl.createTexture();
        this._gl.bindTexture(this._gl.TEXTURE_2D, texture);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_S, this._gl.CLAMP_TO_EDGE);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_WRAP_T, this._gl.CLAMP_TO_EDGE);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MIN_FILTER, filter);
        this._gl.texParameteri(this._gl.TEXTURE_2D, this._gl.TEXTURE_MAG_FILTER, filter);
        if (data instanceof Uint8Array) {
            this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, width, height, 0, this._gl.RGBA, this._gl.UNSIGNED_BYTE, data);
        } else {
            this._gl.texImage2D(this._gl.TEXTURE_2D, 0, this._gl.RGBA, this._gl.RGBA, this._gl.UNSIGNED_BYTE, data);
        }
        this._gl.bindTexture(this._gl.TEXTURE_2D, null);
        return texture;
    }

    createBuffer(data: Float32Array | Uint16Array): WebGLBuffer {
        const buffer = this._gl.createBuffer();
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, buffer);
        this._gl.bufferData(this._gl.ARRAY_BUFFER, data, this._gl.STATIC_DRAW);
        return buffer;
    }

    bindAttribute(buffer: WebGLBuffer, attribute: number, numComponents: number) {
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, buffer);
        this._gl.enableVertexAttribArray(attribute);
        this._gl.vertexAttribPointer(attribute, numComponents, this._gl.FLOAT, false, 0, 0);
    }

    bindFramebuffer(framebuffer: WebGLFramebuffer | null, texture: WebGLTexture | null = null) {
        this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, framebuffer);
        if (texture) {
            this._gl.framebufferTexture2D(this._gl.FRAMEBUFFER, this._gl.COLOR_ATTACHMENT0, this._gl.TEXTURE_2D, texture, 0);
        }
    }
}