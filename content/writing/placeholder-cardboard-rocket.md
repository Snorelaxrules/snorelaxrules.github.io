---
title: "[Placeholder] Notes from a Cardboard Rocket"
date: 2026-10-18
summary: "Placeholder essay. What building something too ambitious, badly, with whatever is lying around, teaches you that a careful plan never would."
---

*Placeholder essay: sample text of realistic length, here to judge the reading layout. It has no cover on purpose, and one image below points at a file that doesn't exist, to show how missing images are handled. Replace or delete this file (content/writing/placeholder-cardboard-rocket.md).*

When I was small, I built a rocket out of a refrigerator box. It had a cockpit drawn in marker, a control panel made from bottle caps, and a launch sequence that consisted of my sister counting backward from ten while I made engine noises. It never left the living room. By every measurable standard, it was a failure. It was also one of the most useful things I have ever made.

I have been thinking about that box lately, because I keep noticing the same pattern in more grown-up projects. The things I learn the most from are rarely the ones I planned carefully. They are the ones I started before I was ready, with whatever was lying around, aiming at something far too ambitious.

## The case for the wrong materials

There is a kind of advice that says you should wait until you have the right tools. Learn the proper framework first. Buy the good equipment. Take the course. And for some things, that advice is correct; nobody wants a surgeon who improvised.

But for most creative work, the wrong materials have a surprising advantage: they force you to understand what you actually need. When you build a rocket from cardboard, you very quickly learn which parts matter. A cockpit matters, because you need somewhere to sit. A window matters, because you need to see where you are going. Fins are optional. Fuel, it turns out, is entirely optional if your mission is mostly imaginary.

> Constraints don't limit the project. They reveal it.

The same thing happens when you write your first program with only the parts of a language you know, or record a song on a phone, or start a website with a single page of plain text. You discover the shape of the problem by bumping into its edges.

### What the box taught me

Looking back, the refrigerator box covered a surprising amount of ground:

- **Scope.** A rocket is too big. A cockpit is just about right.
- **Interfaces.** Bottle caps work as buttons only if everyone agrees what they do.
- **Collaboration.** The countdown was better with two people, and worse with three.
- **Maintenance.** Cardboard does not survive being sat on by a dog.

None of these lessons would have come from a plan. All of them came from the thing existing, however badly, in the real world.

![A sketch of the cardboard rocket's control panel](/writing/control-panel-sketch.png "This image file is missing on purpose: the layout shows a quiet note instead of a broken image.")

## Building the second version

The interesting part of a cardboard project is never the first version. It is what you do next. Once something exists, even badly, you can finally ask good questions about it. Which parts do people actually use? What broke first? What did you build that nobody noticed?

When I rebuilt the rocket a few years later (a larger box, a door that actually closed), I kept a list of what to change. If I wrote it today, it might look like this:

| Part | Version 1 | Version 2 |
| --- | --- | --- |
| Cockpit | Marker drawing | Cut-out window with plastic wrap |
| Controls | Bottle caps, glued | Bottle caps, on a removable panel |
| Countdown | Sister, unreliable | Kitchen timer, very reliable |
| Fins | Four, decorative | Two, also decorative |

The table is a joke, but the habit is real. A second version is where the first version finally pays off, and you can only write that list after you have built something to compare against.

> [!pull] You can only improve something that exists.

## A tiny bit of process

These days the cardboard is usually code, but the loop is the same. I try to get something on the screen as quickly as possible, even if it is ugly, and then improve it in small steps. The first version of almost anything I build looks something like this:

```ts
// version 1: it works, nobody should look at it
function launch(countdown: number) {
  for (let i = countdown; i > 0; i--) console.log(i)
  console.log('liftoff (imaginary)')
}
```

It is not good code. But it runs, and once it runs, I can see what it actually needs. Maybe the countdown should be real time. Maybe it needs a way to abort. Maybe, like the fins, the whole thing turns out to be decorative and can be deleted. Each of those is a much easier decision once there is something real to look at.

The rule of thumb I keep coming back to is simple: **make it exist, then make it good**. Trying to do both at once usually means neither happens.

---

## Why the box still matters

I do not have the refrigerator box anymore. It went out with the recycling a long time ago, flattened and slightly chewed. But I still think about it whenever I am hesitating to start something because I do not feel ready.

The box was never going to reach space. That was not the point. The point was that for an afternoon, two kids had a cockpit, a countdown, and a destination, built from things nobody else wanted. It taught me that ambition and resourcefulness are not opposites. The most ambitious thing you can do is often to start with whatever is lying around.

So, a small suggestion, mostly to myself: pick something slightly too big, gather whatever materials are nearby, and build the worst possible first version. Count down from ten. Make the engine noises yourself if you have to. You will learn more from that launch than from any amount of planning on the ground.[^1]

If you are curious where this kind of thinking ends up, much of this website began as exactly that sort of cardboard first draft. The [Lab](/lab) has a few of the experiments that survived.

[^1]: This advice comes with an obvious exception for actual rockets, which should be planned very carefully by qualified people.
