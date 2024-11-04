---
title: 레이어드 머티리얼 만들기
#date: 2024-11-04 15:02:00 +0800
categories: [Unreal Engine, material]
tags: [머티리얼]		# TAG는 반드시 소문자로 이루어져야함!
---

출처 : [ue5 레이어드 머티리얼 만들기](https://dev.epicgames.com/documentation/ko-kr/unreal-engine/creating-layered-materials-in-unreal-engine)

두개의 머티리얼 레이어(함수) 만들기. Chrome, Snow를 나타내는 레이어 

![layer_chrome](/assets/img/unreal_basic/layer_chrome.png)
![layer_snow](/assets/img/unreal_basic/layer_snow.png)

두 머티리얼을 마스터 머티리얼에서 혼합

![layer_blend](/assets/img/unreal_basic/mat_layer_blend.png)

머티리얼 인스턴스로 파라미터 값을 조정. 시작용 컨텐츠에 있는 의자 메쉬에 입혀서 최종 출력

![layerd_material_instance](/assets/img/unreal_basic/layeredmaterialInstance.png)
![finalOutput](/assets/img/unreal_basic/layeredmaterial_output.png)

