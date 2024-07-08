---
title: Delegate
#date: 2024-07-08 10:23:00 +0800
categories: [Unreal Engine, Basic]
tags: [TAG]		# TAG는 반드시 소문자로 이루어져야함!
---

## **델리게이트는 무엇인가**

델리게이트란 대리자라는 뜻으로서 함수를 바인딩하는 형태로 등록하여 콜백함수처럼 사용 할 수 있다. 다음 예시를 보자.

![Delegate_0](/assets/img/delegate_0.png)

BoxComp의 OnComponentHit 이벤트가 발생하면, 바인딩 되어있는 AOnComponentHit::OnComponentHit가 호출되는 것이다.

![Delegate_1](/assets/img/delegate_1.png)

파라메터의 갯수에 따라서 One_param, Two_Param 등으로 선언해야한다. 최대 8개까지의 파라메터가 가능하다. 

총 4가지 종류의 delegate가 있다. 기본적으로 델리게이트를 더 이상 사용하지 않는 시점에는 UnBind해야 한다.

* 싱글 캐스트 - 가장 기본적인 델리게이트. 함수 1개가 바인드 된다
* 멀티 캐스트 - 싱글 캐스트와 동일하지만 여러 함수를 바인드 된다. 델리게이트 실행시 바인드 된 모든 함수들이 호출된다.
* 이벤트 - 멀티 캐스트와 동일하지만 전역으로 설정할 수 없다.
* 다이나믹 - 싱글 ,멀티 두가지가 존재한다. 델리게이트가 블루프린트에 노출된다. UPROPERTY 속성을 줘야 한다.


델리게이트에 바인딩 할 함수 종류에 따라 API를 구분하여 사용하여야한다.

* 전역 C++ 함수 : BindStatic API를 사용해 등록
* 전역 C++ 람다 함수 : BindLambda API를 사용해 등록
* C++클래스 멤버 함수 : BindRaw  API를 사용해 등록
* 공유포인터 클래스의 멤버 함수 (쓰레드 미지원) : BindSP API를 사용해 등록 
* 공유포인터 클래스의 멤버 함수 (쓰레드 지원) : BindThreadSafeSP API를 사용해 등록
* UFUNCTION 멤버 함수 : BindUFunction API를 사용해 등록
* 언리얼 오브젝트의 멤버함수 : BindUObject API를 사용해 등록


## **만약 델리게이트를 Bind한 함수의 객체가 Destroy된 상태에서 해당 델리게이트를 호출하면 어떻게 되는가?**

A객체의 멤버함수를 바인딩 후, A 객체가 삭제될시 IsBound() 체크를 하지 않고서 델리게이트를 직접 호출해 보았다.

![Delegate_2](/assets/img/delegate_2.png)

액세스 위반이 발생하는 것을 확인했다. 쓰레기 값을 호출하기 떄문일 것이다.

참고: [ue4_delegate예시](https://darkcatgame.tistory.com/66, ""), [ue4_delegate 바인드 종류](https://darkcatgame.tistory.com/66, "")
