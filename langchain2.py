import os

# Replace with your actual Gemini API key
os.environ["GOOGLE_API_KEY"] = "AQ.Ab8RN6KPw3zLfpc5qyST8s9sbyXwHM09vlamM1aaqyFEZo_EDg"

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser


# Step 1: Create the LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0
)

# Step 2: Create a prompt template
prompt = ChatPromptTemplate.from_messages(
[
("system","You are a friendly teacher."),
("human","Explain {topic}")
]
)

# Step 3: Combine prompt and model
parser = StrOutputParser()
chain = prompt | llm | parser
#chain = prompt | llm
# Step 4: Invoke the chain - chain.invoke() takes a dictionary of input values for the prompt template. 
# The keys in the dictionary should match the variable names in the prompt template.
# it return an object of type AIMessage so we parse it to get the string content of the response.
response = chain.invoke(
{
    "topic":"Vector Database"   
}
)

print(response)