---
title: 형변환
#date: 2024-07-05 13:07:05 +0800
categories: [Unreal Engine, Basic]
tags: [TAG]		# TAG는 반드시 소문자로 이루어져야함!
---

## **언리얼 형변환은 어떻게 이루어지는가?**

* c++
    * 언리얼은 기본적으로Cast<T>를 사용하여 형변환을 진행한다. 이 Cast는 UObject 타입에 대해서만 쓰이고 타입 안정성을 지닌다. 유효하지 않은 casting에 대해선 (ex:상속구조가 다르다거나) nullptr을 리턴한다는 이야기이다.
    * 기본적으로 Cast를 썼을때, 내부적으로는 C 스타일의 캐스팅으로 변환이 된다. 따라서 const_cast와 static_cast는 자연적으로 일어난다.

	```c++
	if constexpr (TIsIInterface<From>::Value)
	{
		if (UObject* Obj = Src->_getUObject())
		{
			if constexpr (TIsIInterface<To>::Value)
			{
				return (To*)Obj->GetInterfaceAddress(To::UClassType::StaticClass());
			}
			else
			{
				if (Obj->IsA<To>())
				{
					return (To*)Obj;
				}
			}
		}
	}
	```

	* reinterpret_cast처럼 동작하는 경우는 없다. TCastFlags 내부 로직을 보면, 언리얼 리플렉션 시스템에 등록된 연관성이 있는 클래스끼리 검사를 한다. 따라서 상속 구조상 연관 성이 없는 타입의 포인터 변환은 허용되지 않는 것이다.

* blueprint
    * Cast To node를 통해 형변환이 가능하다. 기본적으로 언리얼 c++ 처럼 상속구조상 유효한 타입만을 형변환 할 수 있다.    
	
	![BP_EventGraph](/assets/img/bp_eventGraph_for_Cast.png)

## **언리얼 엔진은 C++ 기본 RTTI 사용하는지? 사용하지 않는다면 왜 그런가?**

언리얼은 c++ 기본 RTTI를 사용하지 않는다. RTTI라는 개념은 런타임에 특정 타입의 정보(크기, 타입명 등)을 얻어오는 것인데, 이것 자체가 비용이 비싸다. 언리얼은 프로퍼티 시스템은 리플렉션을 활용하고 있다. 
UCLASS, USTRUCT, UPROPERTY등의 매크로를 통해 UOBJECT 계열 타입들에 대한 정보가 수집되어 있다. 