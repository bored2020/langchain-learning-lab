# LangChain 学习实验室

一份中文交互式入门网页，以及一个可直接运行的最小 LangChain Agent。

## 打开课程网页

直接双击 `index.html`，或在本目录启动静态服务器：

```bash
python3 -m http.server 8000
```

然后打开 <http://localhost:8000>。

## 运行最小实例

```bash
cd example
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
```

编辑 `.env`，填入真实的 `OPENAI_API_KEY`，然后运行：

```bash
python main.py
```

Windows PowerShell 使用 `.venv\Scripts\Activate.ps1` 激活虚拟环境，并使用
`Copy-Item .env.example .env` 复制配置文件。

## 项目结构

```text
langchain-learning-lab/
├── index.html          # 课程内容
├── styles.css          # 基础组件样式
├── book-theme.css      # 教材式阅读主题与响应式排版
├── script.js           # 原理演示、复制按钮、进度保存、测验
└── example/
    ├── main.py         # 最小工具调用 Agent
    ├── requirements.txt
    ├── .env.example
    └── .gitignore
```

课程内容以 LangChain 1.x API 为基础，模型名通过 `.env` 配置，便于按账户权限替换。
