# import os
# os.environ["GOOGLE_API_KEY"] = "AQ.Ab8RN6KPw3zLfpc5qyST8s9sbyXwHM09vlamM1aaqyFEZo_EDg"

from typing import TypedDict
from langgraph.graph import StateGraph, START, END


class LessonState(TypedDict):
    topic: str
    explanation: str
    example: str
    summary: str


def teacher_node(state: LessonState):
    return {
        "explanation":
        f"{state['topic']} is used to build AI workflows."
    }


def example_node(state: LessonState):
    return {
        "example":
        f"An AI tutor can be built using {state['topic']}."
    }


def summary_node(state: LessonState):
    return {
        "summary":
        f"{state['topic']} coordinates multiple AI steps."
    }


builder = StateGraph(LessonState)

builder.add_node("teacher", teacher_node)
builder.add_node("example", example_node)
builder.add_node("summary", summary_node)

builder.add_edge(START, "teacher")
builder.add_edge("teacher", "example")
builder.add_edge("example", "summary")
builder.add_edge("summary", END)

graph = builder.compile()

result = graph.invoke(
    {
        "topic": "LangGraph"
    }
)

print(result)