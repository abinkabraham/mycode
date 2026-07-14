#import os
# Replace with your actual Gemini API key
#os.environ["GOOGLE_API_KEY"] = "Your google API KEY"

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate

prompt = ChatPromptTemplate.from_template(
    "Explain {topic} in simple terms."
)

value = prompt.invoke({"topic": "LangChain"})
# print(type(value))
# print(value)
# print(value.messages[0])
# print(value.messages[0].content)
msglist=value.to_messages()
print(value.to_string())
print(msglist)

