// assets/js/shaders.js

export const fireVertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  
  void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const fireFragmentShader = `
  uniform float time;
  varying vec2 vUv;
  varying vec3 vPosition;
  
  // Simplex 2D noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    // Calculate distance from the center of the cone base
    float distFromCenter = length(vPosition.xz);
    
    // Normalize height from 0 (base) to 1 (tip)
    float normalizedHeight = vPosition.y / 1.0 + 0.5;  // Assuming cone height is 2.0
    
    // Create UV coordinates that wrap around the cone
    vec2 polarUV = vec2(atan(vPosition.x, vPosition.z) / (2.0 * 3.14159) + 0.5, normalizedHeight);
    
    float t = time * 2.0;
    
    // Create multiple layers of noise
    float noise1 = snoise(vec2(polarUV.x * 4.0 + t, polarUV.y * 4.0 - t));
    float noise2 = snoise(vec2(polarUV.x * 8.0 - t, polarUV.y * 8.0 + t * 0.5));
    float noise3 = snoise(vec2(polarUV.x * 16.0 + t * 0.25, polarUV.y * 16.0));
    
    // Combine noise layers
    float noise = noise1 * 0.5 + noise2 * 0.35 + noise3 * 0.15;
    noise = abs(noise);

    // Create fire shape
    float flameIntensity = (1.0 - normalizedHeight) * 1.5 - (1.0 - noise) * 1.25;
    flameIntensity = smoothstep(0.0, 0.5, flameIntensity);

    // Adjust intensity based on distance from center
    flameIntensity *= 1.0 - distFromCenter;

    // Color gradient for fire
    vec3 color1 = vec3(1.0, 0.2, 0.05); // deep red
    vec3 color2 = vec3(1.0, 0.4, 0.05); // orange-red
    vec3 color3 = vec3(1.0, 0.8, 0.2);  // yellow

    vec3 fireColor = mix(color1, color2, flameIntensity);
    fireColor = mix(fireColor, color3, pow(flameIntensity, 3.0));

    // Add some sparkles
    float sparkle = step(0.98, snoise(vec2(polarUV.x * 100.0 + t * 5.0, polarUV.y * 100.0 - t * 5.0)));
    fireColor += sparkle * vec3(1.0) * (1.0 - distFromCenter);

    // Adjust alpha for a subtle glow effect
    float alpha = smoothstep(0.0, 0.1, flameIntensity);
    alpha = mix(alpha, 1.0, flameIntensity * flameIntensity);

    // Fade out at the edges of the cone
    alpha *= smoothstep(1.0, 0.8, distFromCenter);

    gl_FragColor = vec4(fireColor, alpha);
  }
`;