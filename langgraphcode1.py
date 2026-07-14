from typing import TypedDict

#1. Create a state
class AgentState(TypedDict):
    question: str
    answer: str

#2. Create two nodes - nodel -General and Node2 - Tool
def general_node(state: AgentState):

    return {
        "answer": "This question can be answered by the LLM."
    }

def tool_node(state: AgentState):

    return {
        "answer": "Calling Weather Tool..."
    }

#3. The Decision Function (router)
def route_question(state: AgentState):

    question = state["question"].lower()

    if "weather" in question:
        return "tool"

    return "general"

#4. Build the graph
from langgraph.graph import StateGraph, START, END

builder = StateGraph(AgentState)

builder.add_node("general", general_node)
builder.add_node("tool", tool_node)

#5. Add conditional edges
builder.add_conditional_edges(
    START,
    route_question
)

#6. Finish the graph
builder.add_edge("general", END)
builder.add_edge("tool", END)

graph = builder.compile()


#Run example 1
result = graph.invoke(
    {
        "question": "Explain LangGraph"
    }
)

print(result)

#Run example 2
result1 = graph.invoke(
    {
        "question": "What is the weather today?"
    }
)

print(result1)
