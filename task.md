
## 3. Markdownの標準構造

生成するMarkdownは、以下の構造を標準とする。

```markdown
# プロジェクト名

## 概要

プロジェクトの目的や実装方針を記述する。

## ファイル構成

- src/main.py
- src/utils.py

## src/main.py

```python filename=src/main.py
from utils import greet

print(greet("World"))
```

## src/utils.py

```python filename=src/utils.py
def greet(name: str) -> str:
    return f"Hello, {name}!"
```
```

上記は構造を示す例である。実際のMarkdownファイルでは、コードブロックの開始・終了フェンスを正しく対応させる。

## 4. コードブロックの記述仕様

### 4.1 基本形式

コードブロックは次の形式で記述する。

````markdown
```python filename=main.py
print("Hello, world!")
```
````

構成要素は以下のとおり。

| 要素 | 必須 | 説明 |
|---|---|---|
| 開始フェンス | 必須 | 3つのバッククォート |
| 言語識別子 | 推奨 | `python`、`rust`、`typescript` など |
| `filename=` | 推奨 | 出力ファイル名または相対パス |
| ソースコード | 必須 | 出力対象のコード |
| 終了フェンス | 必須 | 開始フェンスに対応する3つのバッククォート |

### 4.2 言語とファイル名の指定

次の2形式をサポートする。

**形式A：`filename=` による指定**

````markdown
```python filename=src/main.py
print("Hello")
```
````

**形式B：言語識別子に続けてコロンで指定**

````markdown
```rust:src/main.rs
fn main() {
    println!("Hello");
}
```
````

形式Aを標準形式として推奨する。


## 7. 複数ファイルの生成

複数ファイルを出力する場合、ファイルごとに独立したコードブロックを記述する。

例：

````markdown
# Sample Project

## src/main.py

```python filename=src/main.py
from utils import add

print(add(1, 2))
```

## src/utils.py

```python filename=src/utils.py
def add(a: int, b: int) -> int:
    return a + b
```
````

この構造により、`src/main.py` と `src/utils.py` を個別のファイルとして出力できる。

ファイル名は重複させないこと。出力先に同名ファイルが存在する場合、現在の実装では `_2`、`_3` などの連番を付けて別ファイルとして保存する。
