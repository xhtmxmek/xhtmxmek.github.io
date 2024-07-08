---
title: Lamda식
#date: 2024-07-08 10:37:00 +0800
categories: [Unreal Engine, Basic]
tags: [TAG]		# TAG는 반드시 소문자로 이루어져야함!
---

## **lambda,closure, capture에 대해 설명하라. (c++과 다른 언어 비교 설명)**

* c++
    람다 표현식은 기본적으로 함수의 형태를 띄지만 함수의 이름은 존재하지 않고 시그니처(리턴 값과 파라메터 등)만 존재하는 함수식이다. 기본 표현 방법은 다음과 같다. 
    
    "*[capture](paratmeter)->returnType{statement}(argument)*"
    
    <!-- 각 항목에 대한 설명은 다음과 같다.

    * Capture : 어떤 식으로 람다 식 안에서 람다 밖의 변수를 접근할지 결정한다.

        * "[] : 람다 바깥쪽 변수를 캡처하지 않는다"
        * "[&](){ /* */} : 외부 모든 변수를 call by reference로 가져온다"
        * "[=](){ /* */} : 외부 모든 변수를 call by value로 가져온다"
        * "[a, &b] : a는 call by value로, b는 Call by reference로 가져온다"

    * parameter : 매개변수 없을시 생략가능
    * return Type : ->int와 같은 식으로 명시. 반환 값 없을시 생략 가능
    * statement : 함수 본문
    * argument : 전달 인자 값. 전달인자 없을시 생략 가능


    람다식은 ‘함수성의 틀'과 같은 것이고 closure는 람다식을 통해 런타임에 생성된 임시 객체이다.

    "*auto f = [&](int x, int y) { return fudgeFactor * (x + y); };*"

    해당 식에서 우측의 람다식을 통해서 클로저 객체가 생성이 되고, 이 객체는 f에 카피된다. 생성된 클로저 객체는 라인의 끝에서 소멸된다. 람다와 클로저의 차이는 클래스와 클래스 인스턴스의 차이라고 보면 된다.-->


<!-- * c#
    식이 본문으로 포함된 람다 : (input-parameters) => expression
    문장 블록이 본문으로 포함된 람다 : input-parameters => { <sequence-of-statements> }

    c++과의 차이점
    * 캡처 형식 따로 명시 해줄 필요 없음. 람다의 대리자가 가비지 컬렉션에 수집될때까지 캡처 변수 값은 가비지 컬렉션안됨
    * 리턴 타입 명시할 필요 없음


* Java의 람다
    기본 문법 : (parameter) -> statement
    c++과의 차이점

    * 지역변수를 캡처한다면 final(c++로 치면 const)로 사용해야 한다.
    * final로 선언되어 있지 않다고 하더라도 캡처 하는 값의 재할당이 일어나면 안됨. -->
