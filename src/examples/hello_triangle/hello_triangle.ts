import vertexShaderSource from './shaders/vertex_shader.glsl?raw';
import fragmentShaderSource from './shaders/frag_shader.glsl?raw';

export class Main {
    canvas: HTMLCanvasElement
    private _gl: WebGL2RenderingContext;
    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const _gl = canvas.getContext('webgl2');
        if (!_gl) {
            throw new Error('WebGL2 not found');
        }
        this._gl = _gl;
    }

    _compile(shaderSource: string, shaderType: number): WebGLShader {
        const shader = this._gl.createShader(shaderType);
        if (!shader) {
            throw new Error("Error creating shader");
        }
        this._gl.shaderSource(shader, shaderSource);
        this._gl.compileShader(shader);
        if (!this._gl.getShaderParameter(shader, this._gl.COMPILE_STATUS)) {
            throw new Error("Error compiling shader: " + this._gl.getShaderInfoLog(shader));
        }
        return shader;
    }

    run(): void {
        const gl = this._gl;
        const triangleVertices = new Float32Array([
            0.0, 0.5, 0.0,
            -0.5, -0.5, 0.0,
            0.5, -0.5, 0.0
        ]);
        const triangleVertexBuffer = this._gl.createBuffer(); // Create a buffer object
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBuffer); // Bind the buffer object to target
        gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW); // Write data into the buffer object
        const vertex_shader = this._compile(vertexShaderSource, gl.VERTEX_SHADER);
        const fragment_shader = this._compile(fragmentShaderSource, gl.FRAGMENT_SHADER);
        const program = gl.createProgram();
        gl.attachShader(program, vertex_shader);
        gl.attachShader(program, fragment_shader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error("Error linking program: " + gl.getProgramInfoLog(program));
        }
        const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
        if (positionAttributeLocation < 0) {
            throw new Error("Error getting attribute location");
        }
        // output merger
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        gl.clearColor(0.08, 0.08, 0.08, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Set the viewport to match the canvas size
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        // set gpu program
        gl.useProgram(program);
        gl.enableVertexAttribArray(positionAttributeLocation);

        // Input assembler
        gl.bindBuffer(gl.ARRAY_BUFFER, triangleVertexBuffer);
        gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

        // Draw
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
}