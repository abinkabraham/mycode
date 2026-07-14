import os
# Replace with your actual Gemini API key
os.environ["GOOGLE_API_KEY"] = "Your google API KEY"

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

# Step 1: Create the LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0
)

# Step 2: Create a prompt template
prompt = ChatPromptTemplate.from_template(
    "Explain {topic} in simple terms."
)

# Step 3: Combine prompt and model
chain = prompt | llm

# Step 4: Invoke the chain
response = chain.invoke({"topic": "LangChain"})

print(response.content)
