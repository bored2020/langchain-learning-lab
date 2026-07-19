const componentData = {
  prompt: {
    index: "01",
    kind: "INPUT LAYER",
    title: "Prompt / Messages",
    copy: "把系统规则、用户问题、历史对话和检索内容，整理成模型能理解的消息列表。它决定模型此刻“看见什么”。",
    code: '[("system", "你是天气助手"), ("user", question)]',
  },
  model: {
    index: "02",
    kind: "REASONING LAYER",
    title: "Chat Model",
    copy: "模型读取消息并预测下一步：可以直接回答，也可以返回一条结构化的工具调用。LangChain 统一了不同模型厂商的调用方式。",
    code: 'model.invoke(messages)  # → AIMessage',
  },
  tool: {
    index: "03",
    kind: "ACTION LAYER",
    title: "Tools",
    copy: "工具是带有名称、参数结构和用途说明的可调用函数。它让模型能搜索、计算、查数据库，或触发你的业务逻辑。",
    code: '@tool\ndef get_weather(city: str) -> str: ...',
  },
  state: {
    index: "04",
    kind: "RUNTIME LAYER",
    title: "State / Memory",
    copy: "状态保存本次执行中的消息和中间结果；持久化之后还能跨轮记住对话。Agent 每循环一次，状态就更新一次。",
    code: '{"messages": [HumanMessage(...), ToolMessage(...)]}',
  },
  output: {
    index: "05",
    kind: "DELIVERY LAYER",
    title: "Output",
    copy: "最终结果可以是自然语言，也可以约束成可靠的 JSON / Pydantic 数据结构，供下游程序继续处理。",
    code: 'result["messages"][-1].content',
  },
};

const loopData = [
  {
    number: "01",
    kicker: "INPUT",
    title: "消息进入状态",
    copy: "Agent 收到的不是一条裸字符串，而是一组带角色的消息。运行时会把新消息加入本次执行状态。",
  },
  {
    number: "02",
    kicker: "REASON",
    title: "模型决定下一步",
    copy: "模型看到可用工具的名称、说明和参数结构。此处它判断：回答需要天气数据，因此产生工具调用，而不是编造答案。",
  },
  {
    number: "03",
    kicker: "ACT",
    title: "运行时执行工具",
    copy: "模型只提出调用请求；真正执行 Python 函数的是本地 Agent 运行时。这里是外部世界与概率模型的明确边界。",
  },
  {
    number: "04",
    kicker: "OBSERVE",
    title: "结果写回上下文",
    copy: "工具返回值被包装为 ToolMessage，并与对应调用 ID 关联。然后整段新上下文再次交给模型。",
  },
  {
    number: "05",
    kicker: "FINISH",
    title: "模型生成最终回答",
    copy: "模型已经获得可信数据，于是结合系统提示组织建议。没有新的工具调用时，循环结束并返回完整状态。",
  },
];

const storageKey = "langchain-learning-progress-v1";
const completionButtons = [...document.querySelectorAll("[data-complete]")];
let completed = new Set();
let loopTimer = null;
let toastTimer = null;

try {
  completed = new Set(JSON.parse(localStorage.getItem(storageKey) || "[]"));
} catch {
  completed = new Set();
}

function saveProgress() {
  localStorage.setItem(storageKey, JSON.stringify([...completed]));
  const percentage = Math.round((completed.size / completionButtons.length) * 100);
  document.querySelector("[data-progress-bar]").style.width = `${percentage}%`;
  document.querySelector("[data-progress-label]").textContent = `${percentage}%`;

  completionButtons.forEach((button) => {
    const done = completed.has(button.dataset.complete);
    button.classList.toggle("completed", done);
    button.setAttribute("aria-pressed", String(done));
    const label = button.querySelector(".complete-text");
    if (label) {
      label.textContent = done
        ? button.dataset.complete === "build" ? "已成功运行" : "本章已完成"
        : button.dataset.complete === "build" ? "我已经成功运行" : button.dataset.complete === "next" ? "完成整门入门课" : "标记本章已学完";
    }
  });
}

completionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const key = button.dataset.complete;
    completed.has(key) ? completed.delete(key) : completed.add(key);
    saveProgress();
  });
});

document.querySelector("[data-reset-progress]").addEventListener("click", () => {
  completed.clear();
  saveProgress();
});

document.querySelectorAll("[data-component]").forEach((button) => {
  button.addEventListener("click", () => {
    const data = componentData[button.dataset.component];
    document.querySelectorAll("[data-component]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
    document.querySelector("[data-detail-index]").textContent = data.index;
    document.querySelector("[data-detail-kind]").textContent = data.kind;
    document.querySelector("[data-detail-title]").textContent = data.title;
    document.querySelector("[data-detail-copy]").textContent = data.copy;
    document.querySelector("[data-detail-code]").textContent = data.code;
  });
});

function showLoopStep(index) {
  document.querySelectorAll("[data-trace-step]").forEach((step, stepIndex) => {
    step.classList.toggle("active", stepIndex === index);
    step.classList.toggle("done", stepIndex < index);
  });
  const data = loopData[index];
  document.querySelector("[data-loop-number]").textContent = data.number;
  document.querySelector("[data-loop-kicker]").textContent = data.kicker;
  document.querySelector("[data-loop-title]").textContent = data.title;
  document.querySelector("[data-loop-copy]").textContent = data.copy;
}

document.querySelectorAll("[data-trace-step]").forEach((step, index) => {
  step.addEventListener("click", () => {
    clearInterval(loopTimer);
    showLoopStep(index);
  });
  step.style.cursor = "pointer";
});

document.querySelector("[data-play-loop]").addEventListener("click", (event) => {
  clearInterval(loopTimer);
  let index = 0;
  const label = event.currentTarget.querySelector("span");
  label.textContent = "播放中…";
  showLoopStep(index);
  loopTimer = setInterval(() => {
    index += 1;
    if (index >= loopData.length) {
      clearInterval(loopTimer);
      label.textContent = "再播一次";
      return;
    }
    showLoopStep(index);
  }, 1050);
});

function cleanCopiedCode(codeElement) {
  if (!codeElement.classList.contains("line-numbers")) return codeElement.textContent;
  return [...codeElement.querySelectorAll(":scope > span")]
    .map((line) => line.textContent.replace(/^\d{2}/, ""))
    .join("\n");
}

function showToast(message) {
  const toast = document.querySelector(".toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    const code = button.closest("[data-code-block]").querySelector("code");
    const text = cleanCopiedCode(code).trim();
    try {
      await navigator.clipboard.writeText(text);
      showToast("已复制到剪贴板");
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      showToast("已复制到剪贴板");
    }
  });
});

document.querySelectorAll("[data-answer]").forEach((button) => {
  button.addEventListener("click", () => {
    const quiz = button.closest("[data-quiz]");
    quiz.querySelectorAll("[data-answer]").forEach((item) => item.classList.remove("correct", "incorrect"));
    const correct = button.dataset.answer === "right";
    button.classList.add(correct ? "correct" : "incorrect");
    quiz.querySelector(".quiz-feedback").textContent = correct
      ? "答对了：模型生成调用意图，Agent 运行时负责执行真实代码。"
      : "再想想模型与本地代码的安全边界：模型只能提出调用请求。";
    if (correct) completed.add("decode");
    if (correct) saveProgress();
  });
});

const menuButton = document.querySelector(".menu-button");
const sidebar = document.querySelector(".sidebar");
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!open));
  sidebar.classList.toggle("open", !open);
});

document.querySelectorAll(".toc a").forEach((link) => {
  link.addEventListener("click", () => {
    sidebar.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  });
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.08 }
);
document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const navLinks = [...document.querySelectorAll(".toc a")];
const sectionObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible || visible.target.id === "top") return;
    navLinks.forEach((link) => link.classList.toggle("active", link.dataset.section === visible.target.id));
  },
  { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.1, 0.25] }
);
document.querySelectorAll("main > section[id]").forEach((section) => sectionObserver.observe(section));

saveProgress();
