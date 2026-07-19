"""广州实时天气 Agent：展示模型如何产生参数，以及 LangChain 如何调用工具。"""

import json
import os

import requests
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain.tools import tool
from langchain_openai import ChatOpenAI


load_dotenv()

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# Open-Meteo 使用 WMO 天气代码。这里只做显示转换，不包含任何城市数据。
WEATHER_CODES = {
    0: "晴朗",
    1: "大致晴朗",
    2: "局部多云",
    3: "阴天",
    45: "有雾",
    48: "雾凇",
    51: "小毛毛雨",
    53: "中等毛毛雨",
    55: "强毛毛雨",
    61: "小雨",
    63: "中雨",
    65: "大雨",
    71: "小雪",
    73: "中雪",
    75: "大雪",
    80: "小阵雨",
    81: "中等阵雨",
    82: "强阵雨",
    95: "雷雨",
    96: "雷雨伴小冰雹",
    99: "雷雨伴强冰雹",
}


# 1. @tool 会读取函数名、docstring 和 city: str，生成模型可见的工具 Schema。
@tool
def get_weather(city: str) -> str:
    """查询指定城市的实时天气。

    Args:
        city: 用户明确提出的城市名，例如“广州”。
    """
    city = city.strip()
    if not city:
        return json.dumps({"error": "城市名不能为空"}, ensure_ascii=False)

    try:
        # 2. 工具收到的已经是 city="广州"，先把城市名转换为经纬度。
        location_response = requests.get(
            GEOCODING_URL,
            params={"name": city, "count": 1, "language": "zh", "format": "json"},
            timeout=10,
        )
        location_response.raise_for_status()
        locations = location_response.json().get("results", [])

        if not locations:
            return json.dumps({"error": f"没有找到城市：{city}"}, ensure_ascii=False)

        location = locations[0]

        # 3. 使用经纬度查询实时天气；这里没有写死广州的天气。
        weather_response = requests.get(
            FORECAST_URL,
            params={
                "latitude": location["latitude"],
                "longitude": location["longitude"],
                "current": (
                    "temperature_2m,apparent_temperature,"
                    "precipitation,weather_code,wind_speed_10m"
                ),
                "timezone": location["timezone"],
            },
            timeout=10,
        )
        weather_response.raise_for_status()
        current = weather_response.json()["current"]
    except requests.RequestException as error:
        return json.dumps({"error": f"天气服务请求失败：{error}"}, ensure_ascii=False)

    # 4. 返回结构化事实。Agent 会把它包装成 ToolMessage，再交回模型。
    return json.dumps(
        {
            "city": location["name"],
            "province": location.get("admin1"),
            "country": location.get("country"),
            "observation_time": current["time"],
            "weather": WEATHER_CODES.get(
                current["weather_code"], f"天气代码 {current['weather_code']}"
            ),
            "temperature_celsius": current["temperature_2m"],
            "apparent_temperature_celsius": current["apparent_temperature"],
            "precipitation_mm": current["precipitation"],
            "wind_speed_kmh": current["wind_speed_10m"],
        },
        ensure_ascii=False,
    )


model = ChatOpenAI(model=os.getenv("OPENAI_MODEL", "gpt-5-nano"))

# 5. tools=[get_weather] 把工具 Schema 注册给模型，并把函数交给 Agent 运行时。
# create_agent 隐藏了派发细节。它在内部做的事情可理解为下面这段伪代码：
# tools_by_name = {get_weather.name: get_weather}
# call = ai_message.tool_calls[0]                 # name=get_weather, args={"city": "广州"}
# selected_tool = tools_by_name[call["name"]]    # 根据工具名找到上面的 Python 函数
# tool_result = selected_tool.invoke(call["args"])  # 等价于把 city="广州" 传给函数
# messages.append(
#     ToolMessage(content=tool_result, tool_call_id=call["id"])
# )  # 将结果与本次调用关联，再交给模型生成自然语言回答
agent = create_agent(
    model=model,
    tools=[get_weather],
    system_prompt=(
        "你是天气与穿衣助手。遇到天气问题必须调用 get_weather，"
        "不能根据记忆猜测实时天气。用户没有提供城市时应先追问。"
        "拿到工具结果后，说明数据时间并给出简洁的穿衣建议。"
    ),
)

# 6. 模型从这句话中提取“广州”，生成 get_weather(city="广州")。
result = agent.invoke(
    {"messages": [{"role": "user", "content": "广州现在天气怎么样？应该穿什么？"}]}
)

# 7. 展示完整轨迹：HumanMessage → AIMessage(tool_calls) → ToolMessage → AIMessage。
print("\n--- Agent 执行轨迹 ---")
for message in result["messages"]:
    message_type = type(message).__name__
    tool_calls = getattr(message, "tool_calls", None)

    if tool_calls:
        print(f"{message_type} 生成工具调用：{tool_calls}")
    elif message_type == "ToolMessage":
        print(f"{message_type} 返回天气数据：{message.content}")
    else:
        print(f"{message_type}：{message.content}")

print("\n--- 最终回答 ---")
print(result["messages"][-1].content)
