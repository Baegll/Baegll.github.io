---
title: "Context Management: Getting Better Responses from AI"
date: 2026-03-30
tags:
  - ai
  - developer-tools
  - productivity
description: "How to avoid context-rot and get better responses from AI with context management, and how I use sub-agents to do the heavy-lifting."
---

When working on something new, I spin up a window of my AI coding assistant. I start writing a prompt, which might look like: "Hey I need to pipe a field from a specific data model into this other data model for a different service during a very specific flow in a service with a ton of APIs, packages and code. We should look at all the packages for the big service, some list of its dependencies and also lets look at the model for the new package, and reference this code review where we updated the model so we know what we're changing."

The AI goes off, looks at the code review, looks at the specific API in the big service, looks at the details, looks at the downstream service gateway, looks at the data model, blah blah. Gets all this context, and tells you where to write the change, why its the right one, or maybe even writes it for you.

Great, now you have a code review, while this example is simple, you can imagine a much more complicated change, such as refactoring two tightly coupled decorator classes in a legacy service that you've never seen before, that do weird things as they're in a semi-migrated state.

Great, now, you being a good engineer review your own code. But maybe its some code you're still a little unfamiliar with, or you know that you're a human and can miss things, so what do you maybe think? Lets ask the AI to review the code! So you open back your AI assistant and ask it to review the code review with something like "Hey, review that code we just wrote for any improvements we can make." It then spits out maybe one or two improvements, maybe adding a comment, or stating to compile and run the build. Pretty lack-luster, so you post a code review and get a few comments, prompting another dev-cycle.

## Why did this happen?

Because the AI tells you what it thinks you want to hear! You asked for some vague "improvements" and it didn't know what to do. Or, the key thing I want to hit today: it's already done its first pass of reasoning/thinking and that is stored in the context window. It may not have even done another read on the changes since those were stored in the context window.

## What is the solution?

You have a few options, you can write a better prompt. Such as "Review the git diff we just created and look for bugs, check that our unit test cases actually validate the intent of the code, that the integration points between the code we just wrote works with the previous code...." on and on, making even more assumptions that you have to provide additional context for, such as: what was the intent of the code in the first place?

You could semi-automate that with a reusable prompt template (also called a SKILL)! Write a template covering all those bases, and ask the AI "Run the review template on our code we just wrote." But maybe it starts hallucinating answers it thinks it knows the answers to. The hallucination happens because the AI thinks it knows the answer based on either its training data (probably doesn't have the intent of your code in there) or in its context window (maybe you mentioned why you're making a change, and it assumed that was the entire reason for any changes).

Or, you could tell it to spin up a subagent to review. Why would you do that? You get the benefits of a fresh context window, avoiding context-rot, and can run multiple reviews at the same time without spinning off multiple tabs of terminals with AI assistants in them.

I want to finish talking about subagent reviewers and how they can be used, but I want to take a beat to talk about what context rot is and why it matters.

## Context Rot

Context rot is when irrelevant, outdated, or redundant information accumulates in the context window of your chat and starts competing with information that actually matters. This can take place in two primary forms:

1. **AI not performing the task you actually want it to.**
2. **Hallucination(s).**

"But those are the same thing!" I hear you say, but the first case, the AI confidently does the wrong thing because it latched onto stale context, or it tries solving a problem 20 prompts ago, whereas hallucinations are the AI filling in the gaps with made-up information because the real answer got drowned out by noise.

## How do I fix this?

I have two great solutions for you! One is a broad change to get better responses from the AI — it's a form of prompt engineering which better-structures your context to prevent context-rot.

### General

You could write a brand new prompt with clear information every single time you chat with an AI, but if you have any respect for your own time, you don't actually want to spend your time writing a prompt, discarding an incorrect result, spinning up a new terminal, and writing a tweaked prompt. Or, you could structure your work better.

There's a [paper from Chroma](https://www.trychroma.com/research/context-rot) that digs into how to do this a little. They tested a bunch of models on simple needle-in-a-haystack tests to see where the AI starts to struggle pulling information from its context window. What they found is that the front/top of the context window is the easiest to find information.

So, structuring your prompt means two easy take-aways:

1. **Lead with the task** you need accomplished before giving additional information and/or telling the agent to make MCP tool calls to fetch information.
2. **Start your chat with intention** — create a plan of tasks to accomplish at the start of your context window, so later when searching for context on how to fix your latest problem, it can reference that plan.

### Subagent Reviewers

You could spin up a fresh context window to chat with and give your new fancy issue-first prompt a whirl, but then you have to spend time thinking about the right context to feed your fresh agent so it can actually perform the task. But you just spent all that time with your current agent solving the task and all the context is right there! So I've created a reusable prompt template which spins up subagents in parallel with a unique job for the review. They're given their context windows in the "right order" with the task being a review and their purpose, and then the context from your agent you've been chatting with. Once this is done, we get a convenient check-list of comments with actionable feedback to complete and get the best review possible.
