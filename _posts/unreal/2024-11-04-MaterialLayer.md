---
title: 머티리얼 레이어
#date: 2024-11-04 15:02:00 +0800
categories: [Unreal Engine, material]
tags: [머티리얼]		# TAG는 반드시 소문자로 이루어져야함!
---

출처 : [ue5 머티리얼 레이어](https://dev.epicgames.com/documentation/ko-kr/unreal-engine/using-material-layers-in-unreal-engine)

레이어드 머티리얼과 유사하지만 더 간단하고 유연성이 좋다.

기존 레이어드 머티리얼은 머티리얼 노드 그래프에서 직접 수정헀어야 되지만, 머티리얼 레이어에서는 아티스트가 머티리얼 인스턴스 에디터 탭에서 빠르고 쉽게 인스턴스 레이어를 교체할 수 있다. 
이 워크플로를 사용하면 머티리얼 레이어가 인스턴스 에디터에 노출되므로 레이어드 머티리얼을 커스터마이징하는데 필요한 기술적 지식과 시간이 크게 감소한다.

## 주요 장점

머티리얼 레이어의 주요 장점 중 하나는 복잡성을 줄여주고 편집이 쉽게 해준다. 기존 머티리얼이나 레이어드 머티리얼로 만들 수 있는 로직을 유연하고, 덜 복잡하고, 쉽게 제어할 수 있게 된다.


아래의 그림은 그래프 기반 접근법의 기존 레이어드 머티리얼과 GUI 기반 머티리얼 레이어를 사용한 머티리얼의 차이를 나타낸 것이다. 머티리얼 레이어의 경우 베이스 머티리얼에 필요한 작업량이 적고 작업과 기능은 애셋 자체에서 수행된다. 

![comparison](/assets/img/unreal_basic/materialLayer_comparison.png)

머티리얼 함수 방식은, 함수 내부에서 정의된 parameter를 머티리얼 인스턴스에서 볼 수 없다. 즉 베이스 머티리얼에서 함수의 입력으로 동일한 별도의 파라메터를 만들어서 함수 입력으로 넣어줘야 인스턴스에서도 볼 수 있게 된다.

![materialFunc_1](/assets/img/unreal_basic/materialFunc_1.png)
![materialFunc_2](/assets/img/unreal_basic/materialFunc_2.png)

반면 머티리얼 레이어 방식은, 머티리얼 인스턴스 입장에서는 베이스 머티리얼의 **레이어 스택에 추가된 레이어**에서 파라메터를 참조한다. 따라서 베이스 머티리얼에서 기존 함수 방식처럼 파라메터 복제를 할 필요가 없다.

![layer_parameters](/assets/img/unreal_basic/layer-parameters.png)

**머티리얼 레이어**나 **머티리얼 레이어 블랜드 애셋** 을 열었을때 표시되는 노드 그래프는 머티리얼 에디터의 그래프와 비슷하다. 어트리뷰트를 파라메터 하고 로직 구성한 뒤, 머티리얼에서는 해당 애셋을 참조만 하면된다.

![layer_Graph](/assets/img/unreal_basic/material_layer_Graph.png)

**머티리얼 레이어 블렌드** 에셋은 레이어들의 마스킹을 제어하는 데 사용된다. 각 레이어마다 별개의 블렌드를 가질 수 있다. 항상 블렌드 에셋이 없는 최상단의 레이어가 아래의 모든 레이어를 오버라이드 한다. 머티리얼 레이어처럼 그래프 방식이다.
별도의 파라메터를 통해 마스킹 로직을 구성 가능하고, 여러 머티리얼에 걸쳐 인스턴싱하거나 재사용 할 수 있다.

![blend-asset](/assets/img/unreal_basic/blend-asset.png)

## 머티리얼 레이어 사용하기