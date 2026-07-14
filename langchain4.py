import os

# Replace with your actual Gemini API key
os.environ["GOOGLE_API_KEY"] = "Your google API KEY"

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda
from langchain_core.runnables import RunnableParallel



explain_prompt = ChatPromptTemplate.from_template(
    "Explain {topic} simply in 50 words or less."
)

question_prompt = ChatPromptTemplate.from_template(
    "Generate 1 interview questions on {topic}."
)

usecase_prompt = ChatPromptTemplate.from_template(
    "Give one small real-world use case of {topic} in 50 words or less."
)


# Step 1: Create the LLM
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0
)

parser = StrOutputParser()
#chain = prompt | llm | parser | uppercase

parallel_chain = RunnableParallel(
    explanation=explain_prompt | llm | parser,
    questions=question_prompt | llm | parser,
    usecase=usecase_prompt | llm | parser,
)

# Step 4: Invoke the chain
response = parallel_chain.invoke(
{
    "topic":"Vector Database"   
}
)

print(response)


