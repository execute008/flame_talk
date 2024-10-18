export const fireVertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fireFragmentShader = `
  uniform float time;
  varying vec2 vUv;
  
  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
  }
  
  float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }
  
  void main() {
    vec2 st = vUv * 3.0;
    vec2 pos = vec2(st * 10.0);
    
    float y = 1.0 - vUv.y;
    
    float n = noise(pos * 0.25 + time * 0.5);
    
    float intensity = 1.8 * y + 1.5 * n;
    intensity = smoothstep(0.2, 1.0, intensity);
    
    vec3 color = vec3(1.0, 0.2, 0.05); // base fire color
    color = mix(color, vec3(1.0, 0.8, 0.2), pow(intensity, 3.0)); // yellow tips
    color = mix(vec3(0.0, 0.0, 0.0), color, intensity); // darken base
    
    gl_FragColor = vec4(color, 1.0);
  }
`;