---
title: "AI Should Review Meaning, Not Syntax"
date: 2026-07-26
tags:
  - ai
  - code-review
  - developer-tools
  - ci-cd
description: "How I decide when AI should review code and plans, when a static analyzer is the better tool, and how our review history can improve both."
---

I use AI to write code, make plans, and review both. So, at some point, I started asking a question that sounds a little weird: what should I stop asking AI to review?

The easy answer is "nothing." Give the agent the ticket, the plan, the code, the tests, and every document you can find. Then ask it to tell you everything that's wrong. Maybe spin up five more agents to do the same thing, because surely six reviews are better than one.

I've done versions of this. Sometimes it works extremely well! An agent finds an integration problem across three packages, notices that a test passes for the wrong reason, or points out that the deployment order in the plan can't work. Other times I spend a pile of tokens for an agent to tell me that an import is unused, a line should be formatted, and the code should probably have more tests.

Those aren't equally valuable findings. More importantly, they shouldn't come from the same tool.

I recently analyzed 282 of my own conversations across Kiro, Claude, and Codex. The consistent pattern wasn't "AI reviews code and tells me whether it's good." It was:

> Use AI to understand intent, behavior, architecture, and risk. Use analyzers, builds, tests, and live deployment state to decide whether the change is actually correct.

That difference matters. AI is really good at telling me what I should inspect and what the evidence might mean. It is not a compiler, a test runner, or proof that the thing I just deployed works.

## What do I mean by a semantic review?

A semantic review asks whether the change means the right thing.

Let's say I have a ticket asking me to add optional metadata to a response. The code compiles. The formatter is happy. Every type lines up. But the metadata comes from a downstream service, and that service can fail.

What should happen when it fails?

Should the whole request fail because the response is incomplete? Should we return the primary response without the optional metadata? Does the answer change for a list API that calls the downstream service 100 times? Does it change again if the metadata controls a security decision instead of decorating the response?

A static analyzer can't answer those questions unless someone already made the decision and encoded it as a rule. The answer depends on product intent, system boundaries, failure behavior, and probably a few arguments between engineers.

That's where I want AI. I want it to trace the request through the system, compare the code to the ticket, challenge the ownership boundary, and ask what happens when each dependency breaks. I want it to find places where two individually reasonable decisions create a bad result together.

I use AI for questions like:

- Does the plan actually solve the customer problem?
- Is this the correct service or layer to own the behavior?
- Do the tests prove the intended behavior, or do they only execute the new lines?
- Can a failure in optional work break the primary request?
- Does the migration and deployment order preserve compatibility?
- Do the code, tests, and pull request description tell the same story?
- What assumption did I make without realizing I made it?

There usually isn't one line of code that answers any of these questions. The reviewer needs the ticket, the diff, related call sites, tests, configuration, and sometimes pipeline or deployment context.

This is also why "review the code we just wrote" often gets a pretty weak response. The agent that wrote the code already has a story in its context about why the code is correct. As I wrote in [[context-management|Context Management: Getting Better Responses from AI]], stale context and prior reasoning can push the agent toward the answer it thinks you want.

When I want a real review, I give a fresh reviewer a specific job. I might ask one reviewer to compare the diff to the ticket, another to look only at failure and concurrency behavior, and another to decide whether the tests can catch a plausible wrong implementation. Each reviewer gets a different question. Spinning up five agents with the same vague "find problems" prompt mostly buys five versions of the same review and a new synthesis problem for me.

## When is a static analyzer better?

If I can write a stable rule for a problem, I probably shouldn't keep paying an agent to rediscover it.

I don't need an AI to tell me that the code doesn't compile. I don't need one to find a forbidden import, validate a schema, check formatting, enforce a dependency policy, or find a secret that matches a known pattern. Compilers, linters, schema validators, security scanners, and repository-specific rules can answer those questions faster and more consistently.

They are also cheaper in the ways that matter beyond token cost. A static analyzer gives every pull request the same treatment. It can point to the exact rule that failed. We can test the rule with positive and negative examples. We can measure its false positives. If the rule becomes annoying or wrong, we can change it once instead of hoping every future agent interprets our preferences correctly.

So, how do I decide which tool goes first?

| Question                                          | Use first                                                    | Why                                                                  |
| ------------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| Does the change compile, type-check, and conform? | Compiler, linter, formatter, or schema validator             | There is a deterministic answer.                                     |
| Does the code use a known dangerous pattern?      | Security or repository rule                                  | A known problem should fail every time.                              |
| Does the plan satisfy the ticket?                 | AI, then a requirement checklist                             | Mapping prose to behavior needs semantic reasoning.                  |
| Does this behavior belong in this component?      | AI with code and dependency context                          | Ownership is an architecture decision.                               |
| Do the tests prove the behavior?                  | AI proposes adversarial cases; the test runner executes them | The agent can find false confidence. Only execution proves a result. |
| Is a migration compatible?                        | AI plus schema and compatibility tools                       | The design is semantic. The compatibility claim needs proof.         |
| Did CI/CD deploy what the pull request claims?    | Pipeline state, generated output, metrics, and logs          | An agent cannot prove live state.                                    |
| Does an analyzer warning matter to this change?   | AI or a human                                                | Scope and intent determine what we do with the warning.              |

I use two simpler questions when the table feels like too much:

1. Could I enforce this without teaching the tool the entire product? If yes, write a rule.
2. Could two competent reviewers reasonably disagree? If yes, use semantic review to expose the assumptions, then have a person own the decision.

The goal isn't to choose AI or static analysis. The goal is to put them in the right order. Run the cheap deterministic checks first. Then give the remaining diff, the requirements, and the analyzer results to the semantic reviewer. The agent gets to spend its limited attention on things that aren't already compiler errors.

## Review the plan before it becomes a giant diff

Finding an architecture problem in a plan is much cheaper than finding it after the same problem is spread across four packages and 2,000 changed lines.

The problem is that AI can make a bad plan sound extremely complete. It can add headings, rollout phases, risk sections, and a confident summary without proving that any part of the plan works. A longer plan isn't necessarily a better plan. Sometimes it is just a more expensive way to hide an unanswered question.

When I review a plan, I want direct answers:

- What behavior changes for a user or another system?
- What are we explicitly not changing?
- Which component owns each new behavior?
- Which compatibility boundaries do we cross?
- What happens during partial failure?
- What deploys first?
- What evidence would prove the plan wrong?
- Which signal tells us to continue, stop, or roll back?

Then I want traceability. Every important requirement should map to a code path, a check before merge, and, when needed, a signal after deployment.

| Requirement         | Owner or code path          | Evidence before merge                          | Evidence after deployment             |
| ------------------- | --------------------------- | ---------------------------------------------- | ------------------------------------- |
| Observable behavior | Package, service, or symbol | Named test, build, rule, or generated artifact | Metric, log, trace, or resource state |

If a cell is empty, the plan has an unanswered question. Adding another paragraph won't fill it.

## The review funnel I actually want

My preferred pull request review looks like a funnel. The cheap checks run across everything. The expensive reasoning focuses on the smaller set of problems that remain.

First, establish the contract. Load the ticket, design, incident, or acceptance criteria. Write down the constraints and non-goals. A reviewer can't identify a behavioral regression if it doesn't know the intended behavior.

Second, establish the exact state. Review the actual revision against the correct base. Check the related configuration, generated models, dependencies, and call sites. A brilliant review of a stale diff is still useless.

Third, run deterministic checks. Compile, type-check, lint, scan, validate schemas, inspect dependencies, run focused tests, and inspect generated output. If one of these fails, fix it before asking an agent to reason deeply about the change.

Fourth, run a bounded semantic review. Ask about correctness, ticket alignment, failure behavior, test quality, compatibility, and operational risk. Every finding should name the affected behavior and point to evidence. "Consider improving this" isn't a finding I can use.

Fifth, try to prove the important findings. Turn the concern into a failing test, a static query, an assertion against generated output, or a reproducible operational check. An AI finding is a hypothesis until something more reliable supports it.

Finally, put the evidence in the pull request. Explain what changed, what didn't change, which checks ran, what deploys first, which actions happen outside the code, what signals we expect, and when we roll back. The unit of review isn't just the diff. It is the diff and the evidence that makes it safe to ship.

## How does the system learn?

The most interesting version of this isn't a permanently growing fleet of agents. It is a review system that needs agents less often for problems it has already seen.

Every code review creates useful historical data:

- the ticket or plan;
- the diff and surrounding code;
- static analyzer results;
- AI and human findings;
- whether we accepted, rejected, or deferred each finding;
- the final fix;
- CI failures;
- bugs, incidents, and rollbacks after the merge.

Most teams leave that data spread across comment threads, pipeline logs, tickets, and incidents. Then the next reviewer starts from almost nothing and finds the same problem again.

What if the system remembered?

Start by storing review outcomes in a consistent structure. Give each finding a category, affected construct, severity, evidence, final decision, and result. This data can contain source code, credentials, customer information, or confidential designs, so retention and access rules must be part of the design.

Then look for findings that repeat. Maybe reviewers keep finding logs with personal data. Maybe services repeatedly allow an optional decorator to fail the primary request. Maybe infrastructure changes use the wrong unit for an alarm threshold. The first time could require a semantic review. By the fifth time, we should ask whether the problem can become a rule.

I would use this loop:

1. **Capture the outcome.** Record the finding and what happened after the review.
2. **Group similar findings.** Find defects, policies, and comments that repeat.
3. **Write examples.** Create positive and negative cases for a possible rule.
4. **Build the narrowest check.** Use a linter rule, query, test helper, schema check, or other deterministic analyzer.
5. **Run it without blocking.** Measure false positives and check whether it catches the historical examples.
6. **Make it a gate.** Block changes only when the rule is reliable and the fix is clear.
7. **Remove bad rules.** Tune or delete checks that developers constantly suppress.

This gives us a ratchet. When AI finds the same checkable defect several times, we move that defect into the cheap and consistent part of the pipeline. Future agents see the analyzer result and focus on new or ambiguous risks.

Historical data can improve the AI review too. We don't need to train a custom model on day one. We can retrieve similar accepted findings, past incidents, and repository conventions for the current diff. We can build a risk checklist based on the components that changed. We can test a review prompt against old defects and clean changes before we trust it in every pipeline.

The loop becomes:

> AI finds a possible problem. We verify the outcome. Repeated problems become rules. The remaining history gives future AI reviews better context.

## What should we measure?

A self-learning review system can go wrong very quickly if it optimizes for the number of comments. Ten plausible warnings are not better than one real bug.

I care about:

- how often developers accept AI findings;
- false positives from blocking rules;
- defects that escape review;
- time from a finding to a decision;
- duplicate findings from different reviewers;
- cost and time for each pull request;
- repeated findings that become deterministic checks;
- suppressions, overrides, and rules we later disable;
- change failures and rollbacks.

Recall is difficult because we don't know every defect we missed. Incidents, post-merge fixes, seeded test cases, and evaluation diffs with known problems can give us a partial answer. That is still better than treating a confident review as proof that the agent covered everything.

Humans still need to own this system. An accepted change doesn't always mean the tool was right. Sometimes a developer makes a pointless edit because arguing with the bot costs more time than complying with it. We should sample decisions, audit rules before they become gates, and keep high-risk publication and deployment decisions attached to a person.

## What is the boundary?

AI can tell me what a change appears to mean. Static analyzers can tell me whether it violates a rule we already know how to express. Tests can tell me whether selected behavior works in a controlled environment. Production signals can tell me what actually happened.

Those are different claims. I don't want one tool pretending it can prove all of them.

Use AI as a semantic and adversarial reviewer. Move its repeated discoveries into cheaper deterministic checks. Feed the outcomes back into future reviews. Over time, the pipeline should get stricter about old problems while giving the AI more room to think about new ones.

That's how AI review becomes more than an expensive linter, and how static analysis becomes a system that learns from the engineers and agents working around it.
