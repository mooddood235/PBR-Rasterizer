#version 460 core

in vec3 fragPos;
in vec2 fragUV;

in mat3 TBN;

out vec4 FragColor;

uniform sampler2D texture_diffuse[3];
uniform sampler2D texture_specular[3];
uniform sampler2D texture_normal[3];

uniform vec3 lightPos;
uniform vec3 viewPos;
uniform mat4 viewMatrix;

void main()
{
    vec3 fragNormal = TBN * vec3(texture(texture_normal[0], fragUV) * 2 - 1);

    float lightDistance = length(lightPos - fragPos);

    vec3 lightDir = normalize(lightPos - fragPos);
    vec3 viewDir = normalize(viewPos - fragPos);
    vec3 halfwayDir = normalize(lightDir + viewDir);

    float diffuseStrength = max(dot(fragNormal, lightDir), 0.0);
    float specularStrength = pow(max(dot(fragNormal, halfwayDir), 0.0), 32);

    vec3 diffuse = vec3(texture(texture_diffuse[0], fragUV));
    vec3 specular = vec3(texture(texture_specular[0], fragUV));

    FragColor = vec4(diffuse * diffuseStrength + specular * specularStrength, 1.0);
} 