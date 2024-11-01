---
title: 레이어드 머티리얼
#date: 2024-10-30 15:02:00 +0800
categories: [Unreal Engine, material]
tags: [TAG]		# TAG는 반드시 소문자로 이루어져야함!
---

참고: [ue5 레이어드 머티리얼](https://dev.epicgames.com/documentation/ko-kr/unreal-engine/layered-materials-in-unreal-engine)

## 개요

**레이어드 머티리얼(Layered Materials)** 은 일련의 서브 머티리얼(레이어)이 포함된 머티리얼을 만든 다음 마스크와 같은 픽셀당 연산으로 오브젝트의 표면에 배치할 수 있다. 표면의 복잡한 블렌딩을 처리하는데 적합.

아래 이미지에서 가장 오른쪽의 로켓은 크롬, 알류미늄, 구리 부분에 별도의 레이어를 사용했음. 머티리얼에서 픽셀 단위로 블렌딩. 왼쪽 세개는 레이어 없이 단일 재질.

![layeredMaterial](/assets/img/layeredmaterials.png)

레이어드 머티리얼 기능은 머티리얼 함수의 확장. 머티리얼 함수 내에서 **Make Material Attruibutes**와 **Break Material Attribute** 노드를 사용하여 출력. 
베이스 머티리얼에서 이 함수를 호출하여 레이어 블렌드 사용하여 블렌딩.

![Chrom_Layer_function](/assets/img/chrome-layer-function.png)

위 이미지처럼 머티리얼 함수 내에서 Make Material Attribute를 사용하여 출력하고, 블렌드 머티리얼에서 레이어로 사용하여 다른 레이어(머티리얼 함수)와 블렌드 가능.

작업 프로세스는 다음과 같다.

* 머티리얼 함수를 만들어서 로직을 구성하고 Make Material Attribute 노드, 함수 출력에 연결하여 저장.
* 다른 머티리얼 함수 레이어에서 이 과정 반복.
* 새 머티리얼을 만들고 만들어진 레이어들을 **Material Layer Blend** 를 이용하여 블렌딩.

## 주요 장점 
레이어나 함수 없이 기존 머티리얼 그래프로도 레이어드 머티리얼 효과를 낼 수 있지만, 노드 네트워크가 복잡해지게 된다.

![withoutLayerdMateiral](/assets/img/before_layered_material.jpg)

반면 레이어드 머티리얼을 사용하면 블렌딩이 쉬워지고 아티스트의 수정과 디버깅도 간편해진다.

![LayerdMateiral](/assets/img/after_layered_material.jpg)

레이어드 머티리얼의 또 다른 장점은 머티리얼 함수를 사용하므로 각 레이어를 재사용 할 수 있다. 표면을 정의하는 일종의 라이브러리 세트를 다양하게 조합해서 만들어 놓을 수 있다.

## 블렌드 타입
머티리얼 에디터 팔레트의 머티리얼 함수 목록에는 다양한 머티리얼 레이어 블렌드 함수가 있다. 레이어에서 노멀만 출력한다던지, 이미시브 텍스처를 머티리얼 레이어에 블렌딩 한다던지, 두 레이어의 모든 속성을 블렌드 한다던지
다양한 효과를 지닌 블렌드 타입이 있다. 예시로 몇가지 추리자면

* **MatLayerBlend_Simple** 두개의 머티리얼 레이어를 간단한 선형보간으로 블렌딩. 노멀은 블렌딩하지않고, 베이스 머티리얼의 노멀을 유지.
* **MatLayerBlend_Break_normal** 입력된 머티리얼 레이어에서 노멀을 출력함
* **MatLayerBlend_Emissive** 이미시브 텍스처를 머티리얼 레이어에 블렌딩

## 레이어드 머티리얼 인스턴싱하기
인스턴싱을 위해 머티리얼을 파라미터화 하려면 **함수 입력(Function Input)** 표현식을 만들고 상위 머티리얼에서 이 입력에 파라미터를 연결함.

![LayerdMateiralParam](/assets/img/LayeredMatParamDiagram.png)

1. **머티리얼 파라미터(스칼라 파라미터, 벡터 파라미터)**
2. **머티리얼 레이어(함수)**
3. **함수 입력 표현식**
4. **머티리얼 레이어를 정의하는 네트워크**
6. **함수 출력**
6. **최종 머티리얼**

## 주의사항

레이어 함수에 사용되는 머티리얼 자체가 복잡한 경우, 퍼포먼스를 수행하기에 무거울 수 있음.일반적으로 오브젝트에 여러 종류의 표면을 적용하고 싶을때마다 레이어드 머티리얼을 사용하는 것보다 지오메트리 수준에서 레이어를 분리
하는 것이 더 효율적인 경우가 많음. 드로콜 자체는 더 늘어나지만 효율성은 훨씬 더 높음.

여러개의 개별 머티리얼을 하나로 압축하면 드로콜이 줄어들지만 모바일 플랫폼에서 사용하기에는 지나치게 무거워짐.