#version 300 es
precision mediump float;

out vec4 outColor;
in vec3 fragmentColor;
void main() {
    outColor = vec4(fragmentColor, 1.0f);
}