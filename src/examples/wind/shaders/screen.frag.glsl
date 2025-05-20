precision mediump float;

uniform sampler2D u_screen;
uniform sampler2D u_wind;
uniform float u_wind_spd_min;
uniform float u_wind_spd_max;
uniform float u_opacity;
uniform vec2 u_wind_res;
varying vec2 v_tex_pos;

vec2 lookup_wind(const vec2 uv) {
    // return texture2D(u_wind, uv).rg; // lower-res hardware filtering
    vec2 px = uv / u_wind_res;
    return texture2D(u_wind, px).rg;
}

void main() {
    vec4 color = texture2D(u_screen, 1. - v_tex_pos);
    float wind_speed = length(lookup_wind(1.0 - v_tex_pos));
    wind_speed = (wind_speed - u_wind_spd_min) / (u_wind_spd_max - u_wind_spd_min);
    float wind = smoothstep(0.3, 0.7, wind_speed);

    gl_FragColor = vec4(color * (u_opacity - (0.001 * (1. - wind))));
}
