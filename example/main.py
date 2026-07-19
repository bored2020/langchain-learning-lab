"""最小 LangChain Agent：调用本地天气工具并给出穿衣建议。"""

import os

from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain.tools import tool
from langchain_openai import ChatOpenAI


load_dotenv()


@tool
def get_weather(city: str) -> str:
    """查询指定城市的天气。"""
    weather = {
        "上海": "18°C，小雨，东北风 3 级",
        "北京": "12°C，晴，西北风 2 级",
    }
    return weather.get(city, f"暂时没有{city}的天气数据")


model = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-5-nano"))

agent = create_agent(
    model=model,
    tools=[get_weather],
    system_prompt=(
        "你是穿衣助手。遇到天气问题必须先调用工具，"
        "再根据结果给出一句简洁建议。"
    ),
)

result = agent.invoke(
    {"messages": [{"role": "user", "content": "上海今天穿什么？"}]}
)

print(result["messages"][-1].content)
