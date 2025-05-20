precision mediump float;

uniform sampler2D u_wind;
uniform vec2 u_wind_min;
uniform vec2 u_wind_max;
uniform sampler2D u_color_ramp;

varying vec2 v_particle_pos;
varying float v_particle_age;

float plateauRamp(float x) {
    float up = smoothstep(0.0, 0.40, x);
    // float down = smoothstep(1.0, 0.60, x); // reversed for falling edge
    // return min(up, down);
    return up;
}

void main() {
    vec2 velocity = mix(u_wind_min, u_wind_max, texture2D(u_wind, v_particle_pos).rg);
    float speed_t = length(velocity) / length(u_wind_max);

    // color ramp is encoded in a 16x16 texture
    vec2 ramp_pos = vec2(fract(16.0 * speed_t), floor(16.0 * speed_t) / 16.0);

    // float dist = distance(gl_PointCoord, vec2(0.5));
    // if(dist > 0.5) {
    //     discard; // outside the circle → make it transparent
    // }
    vec4 color = texture2D(u_color_ramp, ramp_pos);
    float alpha = plateauRamp(v_particle_age);
    gl_FragColor = vec4(color.rgb, alpha * 0.8);
}
