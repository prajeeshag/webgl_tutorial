precision highp float;

uniform sampler2D u_particles;
uniform sampler2D u_particle_props;
uniform sampler2D u_wind;
uniform vec2 u_wind_res;
uniform vec2 u_wind_min;
uniform vec2 u_wind_max;
uniform float u_rand_seed;
uniform float u_speed_factor;
uniform float u_time_fac;
varying vec2 v_tex_pos;

// pseudo-random generator
const vec3 rand_constants = vec3(12.9898, 78.233, 4375.85453);
float rand(const vec2 co) {
    float t = dot(rand_constants.xy, co);
    return fract(sin(t) * (rand_constants.z + t));
}

// wind speed lookup; use manual bilinear filtering based on 4 adjacent pixels for smooth interpolation
vec2 lookup_wind(const vec2 uv, const sampler2D wind, const vec2 wind_res, const float time_fac) {
    // return texture2D(u_wind, uv).rg; // lower-res hardware filtering
    vec2 px = 1.0 / u_wind_res;
    vec2 vc = (floor(uv * u_wind_res)) * px;
    vec2 f = fract(uv * u_wind_res);

    vec2 tl = texture2D(u_wind, vc).rg;
    vec2 tr = texture2D(u_wind, vc + vec2(px.x, 0)).rg;
    vec2 bl = texture2D(u_wind, vc + vec2(0, px.y)).rg;
    vec2 br = texture2D(u_wind, vc + px).rg;

    vec2 tl1 = texture2D(u_wind, vc).ba;
    vec2 tr1 = texture2D(u_wind, vc + vec2(px.x, 0)).ba;
    vec2 bl1 = texture2D(u_wind, vc + vec2(0, px.y)).ba;
    vec2 br1 = texture2D(u_wind, vc + px).ba;

    vec2 wind0 = mix(mix(tl, tr, f.x), mix(bl, br, f.x), f.y);
    vec2 wind1 = mix(mix(tl1, tr1, f.x), mix(bl1, br1, f.x), f.y);
    return mix(wind0, wind1, u_time_fac);
}

void main() {
    vec4 color = texture2D(u_particles, v_tex_pos);
    vec2 pos = vec2(color.r / 255.0 + color.b, color.g / 255.0 + color.a); // decode particle position from pixel RGBA
    color = texture2D(u_particle_props, v_tex_pos);
    float age = color.r + color.g / 255.0;
    vec2 velocity = mix(u_wind_min, u_wind_max, lookup_wind(pos, u_wind, u_wind_res, u_time_fac));
    float speed_t = length(velocity) / length(u_wind_max);

    // take EPSG:4236 distortion into account for calculating where the particle moved
    //float distortion = cos(radians(pos.y * 180.0 - 90.0));
    float distortion = 1.0;
    vec2 offset = vec2(velocity.x / distortion, -velocity.y) * 0.0001 * u_speed_factor;

    // update particle position, wrapping around the date line
    pos = fract(1.0 + pos + offset);

    // a random seed to use for the particle drop
    vec2 seed = (pos + v_tex_pos) * u_rand_seed;

    float drop = step(0.0, -age);

    vec2 random_pos = vec2(rand(seed + 1.3), rand(seed + 2.1));

    pos = mix(pos, random_pos, drop);

    // encode the new particle position back into RGBA
    gl_FragColor = vec4(fract(pos * 255.0), floor(pos * 255.0) / 255.0);
}
