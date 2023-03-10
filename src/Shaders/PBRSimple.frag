#version 460 core

const float PI = 3.14159265359;

in vec2 fragUV;
in vec3 fragPos;
in mat3 TBN;

out vec4 fragColor;

uniform vec3 viewPos;

uniform vec3 lightPositions[4];
uniform vec3 lightColors[4];

uniform vec3 diffuse;
uniform sampler2D normalTexture;
uniform float metallic;
uniform float roughness;
uniform float ao;

uniform samplerCube irradianceMap;
uniform samplerCube prefilterMap;
uniform sampler2D   brdfLUT; 

uniform float HDRBrightness;

vec3 fresnelSchlick(float cosTheta, vec3 F0);
vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness);
float DistributionGGX(vec3 N, vec3 H, float roughness);
float GeometrySchlickGGX(float NdotV, float roughness);
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness);

void main()
{
    vec3 albedo = diffuse;;

    vec3 N = TBN * vec3(texture(normalTexture, fragUV) * 2 - 1); 
    vec3 V = normalize(viewPos - fragPos);
    
    vec3 Lo = vec3(0.0);

    for(int i = 0; i < 4; ++i){
        vec3 L = normalize(lightPositions[i] - fragPos);
        vec3 H = normalize(V + L);
  
        float lightDistance = length(lightPositions[i] - fragPos);
        float attenuation   = 1.0 / (lightDistance * lightDistance);
        vec3 radiance       = lightColors[i] * attenuation; 

        vec3 F0 = vec3(0.04); 
        F0      = mix(F0, albedo, metallic);
        vec3 F  = fresnelSchlick(max(dot(H, V), 0.0), F0);

        float D   = DistributionGGX(N, H, roughness);       
        float G   = GeometrySmith(N, V, L, roughness); 

        vec3 numerator    = D * F * G;
        float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0)  + 0.0001;
        vec3 specular     = numerator / denominator;  

        vec3 kS = F;
        vec3 kD = vec3(1.0) - kS;
  
        kD *= 1.0 - metallic;	

        float NdotL = max(dot(N, L), 0.0);        
        Lo += (kD * albedo / PI + specular) * radiance * NdotL;
    }
    vec3 F0 = vec3(0.04); 
    F0      = mix(F0, albedo, metallic);
    vec3 F = fresnelSchlickRoughness(max(dot(N, V), 0.0), F0, roughness); 
    
    vec3 kS = F;
    vec3 kD = 1.0 - kS;
    kD *= 1.0 - metallic;	  
  
    vec3 irradiance = texture(irradianceMap, N).rgb * HDRBrightness;
    vec3 diffuse    = irradiance * albedo;
  
    const float MAX_REFLECTION_LOD = 4.0;
    vec3 R = reflect(-V, N);
    vec3 prefilteredColor = textureLod(prefilterMap, R,  roughness * MAX_REFLECTION_LOD).rgb * HDRBrightness;   
    vec2 envBRDF  = texture(brdfLUT, vec2(max(dot(N, V), 0.0), roughness)).rg;
    vec3 specular = prefilteredColor * (F * envBRDF.x + envBRDF.y);
  
    vec3 ambient = (kD * diffuse + specular);// * ao; 

    vec3 finalColor = ambient + Lo;
    finalColor = finalColor / (finalColor + vec3(1.0));
    fragColor = vec4(finalColor, 1.0);
}
vec3 fresnelSchlick(float cosTheta, vec3 F0)
{
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}
vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness)
{
    return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}
float DistributionGGX(vec3 N, vec3 H, float roughness)
{
    float a      = roughness*roughness;
    float a2     = a*a;
    float NdotH  = max(dot(N, H), 0.0);
    float NdotH2 = NdotH*NdotH;
	
    float num   = a2;
    float denom = (NdotH2 * (a2 - 1.0) + 1.0);
    denom = PI * denom * denom;
	
    return num / denom;
}

float GeometrySchlickGGX(float NdotV, float roughness)
{
    float r = (roughness + 1.0);
    float k = (r*r) / 8.0;

    float num   = NdotV;
    float denom = NdotV * (1.0 - k) + k;
	
    return num / denom;
}
float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2  = GeometrySchlickGGX(NdotV, roughness);
    float ggx1  = GeometrySchlickGGX(NdotL, roughness);
	
    return ggx1 * ggx2;
}