/** Sample-program catalog (T006 / FR-059). Every sample is inside §5.9. */
import type { Language } from '../types/contract';

export interface Sample {
  id: string;
  name: string;
  language: Language;
  code: string;
}

const HELLO_C = `#include <stdio.h>

int main() {
    int x = 10;
    printf("Hello CompileViz!\\n");
    return 0;
}`;

const ARITHMETIC_C = `#include <stdio.h>

int main() {
    int a = 3;
    int b = 2;
    float c = 2.5;
    a = a + b;
    c = a + c;
    printf("Arithmetic done\\n");
    return 0;
}`;

const FACTORIAL_C = `#include <stdio.h>

int main() {
    int n = 5;
    int f = 1;
    for (n = 5; n > 1; n = n - 1) {
        f = f * n;
    }
    printf("Factorial computed\\n");
    return 0;
}`;

const INPUT1_C = `#include<stdio.h>
#include<string.h>

int main() {
    int a;
    int x=1;
    int y=2;
    int z=3;
    x=3;
    y=10;
    z=5;
    if(x>5) {
        for(int k=0; k<10; k++) {
            y = x+3;
            printf("Hello!");
        }
    } else {
        int idx = 1;
    }
    for(int i=0; i<10; i++) {
        printf("Hello World!");
        scanf("%d", &x);
        if (x>5) {
            printf("Hi");
        }
        for(int j=0; j<z; j++) {
            a=1;
        }
    }
    return 1;
}`;

const INPUT2_C = `#include<stdio.h>
#include<string.h>

int main() {
    int i=1;
    float f = 2.5;
    char c = 'A';
    int x = 3.5;
    i = x + f * c;
    return 3;
}`;

const INPUT3_C = `#include<stdio.h>
#include<string.h>

int main() {
    int x=1;
    float f;
    int a=3;
    int x;
    a = x * 3 + 5;
    if(x>a) {
        printf("Hi!");
        a = x * 3 + 100;
    }
    else {
        x = a * 3 + 100;
    }
}`;

const TEST_C = `int main() { int x = 10; return 0; }`;

const HELLO_PY = `x = 10
y = 20
total = x + y
print(total)`;

const FUNCTIONS_PY = `def add(a, b):
    return a + b

x = 5
y = 3
result = add(x, y)
print(result)`;

export const SAMPLES: Sample[] = [
  { id: 'hello', name: 'hello.c', language: 'c', code: HELLO_C },
  { id: 'arithmetic', name: 'arithmetic.c', language: 'c', code: ARITHMETIC_C },
  { id: 'factorial', name: 'factorial.c', language: 'c', code: FACTORIAL_C },
  { id: 'input1', name: 'input1.c', language: 'c', code: INPUT1_C },
  { id: 'input2', name: 'input2.c', language: 'c', code: INPUT2_C },
  { id: 'input3', name: 'input3.c', language: 'c', code: INPUT3_C },
  { id: 'test', name: 'test.c', language: 'c', code: TEST_C },
  { id: 'py-hello', name: 'hello.py', language: 'python', code: HELLO_PY },
  { id: 'py-func', name: 'functions.py', language: 'python', code: FUNCTIONS_PY },
];

export const sampleById = (id: string): Sample | undefined => SAMPLES.find((s) => s.id === id);
