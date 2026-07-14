import os
# Replace with your actual Gemini API key
os.environ["GOOGLE_API_KEY"] = "Your google API KEY"

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, ToolMessage

# -------------------------------------------------------
# Define a Tool
# -------------------------------------------------------

@tool
def weather(city: str) -> str:
    """Returns the current weather for a city."""

    print("\n>>> Weather Tool Executed <<<")

    return f"The weather in {city} is 32°C and Sunny."


# -------------------------------------------------------
# Create the LLM
# -------------------------------------------------------

llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0
)

# -------------------------------------------------------
# Bind the tool to the model
# -------------------------------------------------------

llm_with_tools = llm.bind_tools([weather])

# -------------------------------------------------------
# User Question
# -------------------------------------------------------

messages = [
    HumanMessage(
        content="What is the weather in Chennai?"
        #content="Explain langchain in 20 words."
    )
]

# -------------------------------------------------------
# First LLM Call
# -------------------------------------------------------

print("\n========== FIRST LLM CALL ==========\n")

response = llm_with_tools.invoke(messages)

print(response)

# -------------------------------------------------------
# Check if the LLM requested a tool
# -------------------------------------------------------

if response.tool_calls:

    print("\nTool Requested by LLM\n")

    tool_call = response.tool_calls[0]

    print(tool_call)

    # Execute the tool

    tool_result = weather.invoke(tool_call["args"])

    print("\nTool Result:")
    print(tool_result)

    # Send the tool result back to the LLM

    messages.append(response)

    messages.append(
        ToolMessage(
            content=tool_result,
            tool_call_id=tool_call["id"]
        )
    )

    print("\n========== SECOND LLM CALL ==========\n")

    final_response = llm_with_tools.invoke(messages)

    print(final_response.content)

else:

    print("\nNo Tool Needed\n")

    print(response.content)
