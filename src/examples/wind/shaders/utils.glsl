
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
