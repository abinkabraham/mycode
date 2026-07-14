import os

# Replace with your actual Gemini API key
os.environ["GOOGLE_API_KEY"] = "AQ.Ab8RN6KPw3zLfpc5qyST8s9sbyXwHM09vlamM1aaqyFEZo_EDg"

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

# Step 1: Create the LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0
)

# Step 2: Create a prompt template
prompt = ChatPromptTemplate.from_template(
"""
Explain {topic}
for a {level} learner.
Keep it under {words} words.
"""
)

# Step 3: Combine prompt and model
chain = prompt | llm

# Step 4: Invoke the chain
response = chain.invoke(
{
    "topic":"Vector Database",
    "level":"beginner",
    "words":100
}
)

print(response.content)