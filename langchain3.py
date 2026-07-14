import os

# Replace with your actual Gemini API key
os.environ["GOOGLE_API_KEY"] = "Your google API KEY"

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda

#turn any normal Python function into a LangChain Runnable using RunnableLambda. This allows you to use the function in a chain with other Runnables, such as LLMs and prompt templates.
def make_uppercase(text):
    return text.upper()

uppercase = RunnableLambda(make_uppercase)


# Step 1: Create the LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0
)

# Step 2: Create a prompt template
prompt = ChatPromptTemplate.from_messages(
[
("system","You are a friendly teacher."),
("human","Explain {topic} in 50 words or less.")
]
)

# Step 3: Combine prompt and model
parser = StrOutputParser()
chain = prompt | llm | parser | uppercase
#chain = prompt | llm

# Step 4: Invoke the chain
response = chain.invoke(
{
    "topic":"Vector Database"   
}
)

print(response)

print(len(response.split()))
