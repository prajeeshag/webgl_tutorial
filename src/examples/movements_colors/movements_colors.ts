import vertexShaderSource from './shaders/vertex_shader.glsl?raw';
import fragmentShaderSource from './shaders/frag_shader.glsl?raw';

class MovingShape {
    position: number[];
    size: number;
    color: Uint8Array;
    velocity: number[];
    constructor(position: number[], size: number, color: Uint8Array) {
        this.position = position;
        this.size = size;
        this.color = color;
        this.velocity = [50, 10];
    }
    updatePosition(dt: number, xMax: number, yMax: number) {
        this.position[0] += this.velocity[0] * dt;
        this.position[1] += this.velocity[1] * dt;
        if (this.position[0] > xMax) {
            this.position[0] = xMax;
            this.velocity[0] *= -1;
        } else if (this.position[0] < 0) {
            this.position[0] = 0;
            this.velocity[0] *= -1;
        }
        if (this.position[1] > yMax) {
            this.position[1] = yMax;
            this.velocity[1] *= -1;
        }
        else if (this.position[1] < 0) {
            this.position[1] = 0;
            this.velocity[1] *= -1;
        }
    }
}

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
            throw new Error("Error creating shader: " + shaderSource);
        }
        this._gl.shaderSource(shader, shaderSource);
        this._gl.compileShader(shader);
        if (!this._gl.getShaderParameter(shader, this._gl.COMPILE_STATUS)) {
            throw new Error("Error compiling shader: " + this._gl.getShaderInfoLog(shader) + " " + shaderSource);
        }
        return shader;
    }

    run(): void {
        const gl = this._gl;
        const triangleVertices = new Float32Array([0.5, 0, -0.5, 0, 0, 1,]);

        const triangle1 = new MovingShape([400, 300], 200, new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]));
        const triangle2 = new MovingShape([100, 100], 100, new Uint8Array([255, 0, 0, 255, 127, 0, 255, 255, 0,]));

        const triangleVertexBuffer = this._createStaticVertexArrayBuffer(triangleVertices); // Write data into the buffer object
        const colorBuffer = this._createStaticVertexArrayBuffer(triangle1.color); // Write data into the buffer object

        const vertex_shader = this._compile(vertexShaderSource, gl.VERTEX_SHADER);
        const fragment_shader = this._compile(fragmentShaderSource, gl.FRAGMENT_SHADER);
        const program = gl.createProgram();
        gl.attachShader(program, vertex_shader);
        gl.attachShader(program, fragment_shader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error("Error linking program: " + gl.getProgramInfoLog(program));
        }
        const positionAttributeLocation = this._getAttLoc(program, "vertexPosition");
        const colorAttributeLocation = this._getAttLoc(program, "vertexColor");
        const shapePosition = this._getUniformLoc(program, "shapePosition");
        const shapeSize = this._getUniformLoc(program, "shapeSize");
        const canvasSize = this._getUniformLoc(program, "canvasSize");
        // output merger
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        gl.clearColor(0.08, 0.08, 0.08, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Set the viewport to match the canvas size
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        // set gpu program
        gl.useProgram(program);

        // Input assembler
        this._bindArrayBufferToAttribute(triangleVertexBuffer, positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
        this._bindArrayBufferToAttribute(colorBuffer, colorAttributeLocation, 3, gl.UNSIGNED_BYTE, true, 0, 0);

        // Draw
        gl.uniform2f(canvasSize, this.canvas.width, this.canvas.height);

        const drawTriangles = (triangle: MovingShape) => {
            this._bufferData(colorBuffer, triangle.color); // Write data into the buffer object
            gl.uniform1f(shapeSize, triangle.size);
            gl.uniform2f(shapePosition, triangle.position[0], triangle.position[1]);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        var lastTime = performance.now();
        const frame = () => {
            gl.clearColor(0.08, 0.08, 0.08, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            drawTriangles(triangle1);
            drawTriangles(triangle2);
            const currentTime = performance.now();
            const dt = (currentTime - lastTime) / 1000; // Convert to seconds
            lastTime = currentTime;
            triangle1.updatePosition(dt, this.canvas.width, this.canvas.height);
            triangle2.updatePosition(dt, this.canvas.width, this.canvas.height);
            requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    private _bufferData(buffer: WebGLBuffer, data: ArrayBuffer) {
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, buffer); // Bind the buffer object to target
        this._gl.bufferData(this._gl.ARRAY_BUFFER, data, this._gl.STATIC_DRAW); // Write data into the buffer object
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, null); // Unbind the buffer object
    }

    private _bindArrayBufferToAttribute(
        buffer: WebGLBuffer,
        attributeLocation: number,
        size: number,
        type: number,
        normalized: boolean,
        stride: number,
        offset: number) {
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, buffer);
        this._gl.vertexAttribPointer(attributeLocation, size, type, normalized, stride, offset);
        this._gl.enableVertexAttribArray(attributeLocation);
    }
    private _createStaticVertexArrayBuffer(array: ArrayBuffer) {
        const buffer = this._gl.createBuffer(); // Create a buffer object
        if (!buffer) {
            throw new Error("Error creating buffer");
        }
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, buffer); // Bind the buffer object to target
        this._gl.bufferData(this._gl.ARRAY_BUFFER, array, this._gl.STATIC_DRAW); // Write data into the buffer object
        this._gl.bindBuffer(this._gl.ARRAY_BUFFER, null); // Unbind the buffer object
        return buffer
    }

    private _getUniformLoc(program: WebGLProgram, uniformName: string) {
        const uniformLocation = this._gl.getUniformLocation(program, uniformName);
        if (uniformLocation === null) {
            throw new Error("Error getting uniform location: " + uniformName);
        }
        return uniformLocation;
    }

    private _getAttLoc(program: WebGLProgram, attributeName: string) {
        const attributeLocation = this._gl.getAttribLocation(program, attributeName);
        if (attributeLocation < 0) {
            throw new Error("Error getting attribute location: " + attributeName);
        }
        return attributeLocation;
    }
}