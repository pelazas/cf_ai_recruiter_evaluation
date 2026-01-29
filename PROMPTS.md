I used AI to:
1- debug
2- do frontend
3- refactoring

**mainly I used gh copilot, gemini in the terminal and gemini in chat (I have PRO because of student pack)**

- Now it stays in an infinite loop. Is there a way to make this simpler. Just prompt + tool calling, like the following code, but without using workers ai provider: (code on server.ts)

- Can you take this code as template and make the necessary changes: (code on template)

- Property 'onChatMessage' in type 'Chat' is not assignable to the same property in base type 'AIChatAgent<Env, RecruiterState>'. Fix compilation error

- Change the UI completely. Make a useState with the phase, and for phase 1: Job description. I want you to make a minimalist white background, with the instructions of what to do, and when you get back the 5 questions I want you to display them in the usestate for phase 2

- APICallError [AI_APICallError]: Not found. (error logs)

- (error logs) this is my wrangler.jsonc: (paste wrangler.jsonc). debug where it gets stuck.

- Once I click on "Generate technical questions", this is printed to the terminal: Chat message request, and nothing happens. Can you debug this. Also, once I click, I want to change the usestate to the phase 2. And if the questions are still loading, put a loading icon

- CRITICAL ERROR: APICallError [AI_APICallError]: AiError: Bad input: Error: oneOf at '/' not met. (error log zod schema error).

- I get Type mismatch of '/messages/1/content', 'string' not in 'array'. It seems Vercel SDK formats messages differently than Cloudflare expects. How do I fix this compatibility problem

**At this point I changed from using cloudflare workers to a regular chat because half of the time it didnt call the appropiate tool**

- In the prompt include this:
```bash
    - **Quantity:** Exactly 5 questions (2 Technical, 3 Behavioral).
    - **Difficulty:** Easy to Mid-level.
    - **Time Limit:** Questions must be answerable in 30-60 seconds.
    - **Content:**
    - Ignore fluff (mission, location).
    - Focus on specific tech stacks found in the JD.
    - 3 Behavioral questions should focus on soft skills found in JD (e.g. ownership, hard work, communication).
    - **Style:**
    - "What is your experience with [Tech]?"
    - "Explain the difference between [Concept A] and [Concept B]."
```

- Given the readme.md can you make phase 3, once the questions are generated and the interview starts, for each question: 1.There is a microphone icon that once you click it the recording starts, the question shows on top and a progress bar. Also a quick tip section. 2.Once the recording starts, the user has 1 minute to answer, he can stop the recording at any point and there is a progress bar with the time. 3. when finished the recording, you can hear it, and you can either submit the recording or try again. 4.When submitting, follow with the next question until finish all the questions. 5.When finished. Call the /transcribe endpoint and print to the console the questions and answers

- debug and work on this change

- Given the job description, questions and answers:1.Mark the candidate on a scale 1-10. 2.explain could be better answers or how he could improve his professional profile

- given the file server.ts can you make the functionality of marking the candidate, feedback on behavioural and technical fit, and what the candidate needs to improve

- Create a helper function to extract text from the message parts array to solve the Property 'content' does not exist error.