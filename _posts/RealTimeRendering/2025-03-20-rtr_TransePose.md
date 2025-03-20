---
title: RealTimeRendering
#date: 2024-10-02 14:51:00 +0800
categories: [Graphics_3D, Real Time Rendering]
tags: [TAG]		# TAG는 반드시 소문자로 이루어져야함!
---

## **4장 변환**

### 정점 혼합
스키닝. 애니메이션에 의해 BoneMatrix가 움직이고 이들은 계층 구조로 되어있음. 정점별로 영향을 받는 BoneID와 각각 BoneID에 대한 가중치가 있음. 해당 BoneID에 매핑되어있는 애니메팅된 BoneMatrix들을 Vertex에 적용하고
합성함. 

```c++
struct Cbuffer : register(b0)
{
    float4x4 boneMatrix[100];
}

struct VS_Input
{
    float3 position : POSITION;
    float4 boneID : BONEID;
    float boneWeight : BONEWEIGHT;
}

struct PS_Input
{
    float4 positon : SV_POSITION;
}

PS_INPUT main(VS_Input input)
{
    PS_INPUT output;
    output.position += input.position * boneMatrix[input.boneID.x] * input.boneWeight.x;
    output.position += output.position * boneMatrix[input.boneID.y] * input.boneWeight.y;
    output.position += output.position * boneMatrix[input.boneID.z] * input.boneWeight.z;
    output.position += output.position * boneMatrix[input.boneID.w] * input.boneWeight.w;

    return output;    
}
```

### 모핑

모델 A와 모델 B가 있고 두 모델의 정점이 1대1로 대응된다고 했을떄 애니메이팅 되는 효과를 만들 수 있다.

![MorphTarget](/assets/img/realTimeRendering/transform_morphTarget.png)

차이 벡터를 음수로 설정하면 입꼬리를 반대로 내린다거나 하는것도 가능하다. 미리 계산된 정점 텍스처를 사용하여 gpu에서 계산하는 방법도 있다. 처음부터 고해상도 메시에 스키닝을 하는 것이 아니라
저해상도 메시에 대해 스키닝을 하고 고해상도 메시로 테셀레이션 하는 방법 도 있음. 스키닝의 비용이 줄어듬.(단 아티스트의 의도와 디테일이 살아야 하는 쪽에서는 이방법이 어려울수 있음)

### 지오메트리 구조 캐시 재생

시네마틱용 연출에서는 모프타깃과 스키닝 애니메이션만으로는 표현할 수 없는 극도의 고품질 애니메이션이 요구되는 경우들이 있음. 가장 단순한 방식중 하나는 모든 정점을 모든 프레임에 대해 저장하고 이를 디스크에서
읽어서 갱신하는 것. 그러나 이렇게 됬을떄 디스크 용량이 너무 커짐. 여러가지 압축기법들이 있음.