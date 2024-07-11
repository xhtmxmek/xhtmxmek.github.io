---
title: Interface, TSubclassOf
#date: 2024-07-11 11:10:00 +0800
categories: [Unreal Engine, Basic]
tags: [TAG]		# TAG는 반드시 소문자로 이루어져야함!
---

## **언리얼 Interface 개요**

* 자바 등에서 사용하는 인터페이스와 같은 개념이다. 서로 관련이 없는 여러 클래스에서 공통적인 유틸리티 함수 세트가 필요할때, 인터페이스 클래스를 이용하면 된다.
* 인터페이스 클래스는 **UCLASS** 대신 **UINTERFACE**매크로를 사용한다. 실제 인터페이스가 아니라 언리얼 리플렉션 시스템에 등록하기 위한 비어있는 클래스이다. 
* 실제 클래스는 **I**로 시작하는 이름으로 바뀐다. 순수 가상 함수를 지원한다는데 개인적으로 일반적인 객체지향 프로그래밍에서 말하는 인터페이스를 생각한다면 순수 가상함수만 쓰는게 맞다고 생각한다. 
다음의 코드는 인터페이스를 정의 후 특정 클래스에서 상속받은 구조이다.

![Interface1](/assets/img/Interface1.png)
![Interface2](/assets/img/Interface2.png)

## **TSubClass**

* **UCLASS** 유형의 타입 안전성을 보장해준다. **UPROPERTY**로 에디터에 노출되었을시 지정된 타입 클래스만 노출되도록 할 수 있다.

![TSubClassof](/assets/img/tsubclassof.png)

* 호환되지 않는 **TSubClassOf**끼리 할당하면 컴파일 타임에 에러가 난다고 공식 문서에는 안내하고 있는데, 실제로는 컴파일 타임에 에러가 나지 않았다. 할당하는 과정에서 암시적 변환에 성공했기 때문으로 판단된다.