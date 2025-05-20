precision mediump float;

uniform sampler2D u_particle_props;

varying vec2 v_tex_pos;

void main() {
    vec4 color = texture2D(u_particle_props, v_tex_pos);
    float age = color.r + color.g / 255.0 + 0.001;
    age = age * step(0.0, 1.0 - age);
    // encode the new particle position back into RGBA
    gl_FragColor = vec4(vec2(floor(age * 255.0) / 255.0, fract(age * 255.0)), 0, 0);
}
