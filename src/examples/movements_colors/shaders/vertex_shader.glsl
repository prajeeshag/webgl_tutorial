#version 300 es
precision mediump float;

in vec2 vertexPosition;
in vec3 vertexColor;
out vec3 fragmentColor;
uniform vec2 shapePosition;
uniform float shapeSize;
uniform vec2 canvasSize;

void main() {
    // Convert the vertex position to normalized device coordinates
    fragmentColor = vertexColor;
    vec2 newVertexPosition = vertexPosition * shapeSize + shapePosition;
    vec2 finalVertexPosition = (newVertexPosition / canvasSize) * 2.0f - 1.0f;
    gl_Position = vec4(finalVertexPosition, 0.0f, 1.0f);

}